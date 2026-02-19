/**
 * Impact Service — Deterministic Metrics Layer
 *
 * Performs a BFS graph traversal from a given task to find all downstream
 * dependents (ripple effect) and calculates time debt.
 *
 * Also provides:
 *  - recalculateProject()  — full CPM recalc + cache persistence + async AI
 *  - scanForSlippages()    — cron-driven overdue task detection
 */

import Task from "../models/tasks.js";
import ImpactCache from "../models/ImpactCache.js";
import Notice from "../models/notifications.js";
import { runCPM } from "./cpmEngine.js";
import { getConfidenceAnalysis } from "./GeminiService.js";

// ── Debounce guard ───────────────────────────────────────────────────
let _recalcTimer = null;
const DEBOUNCE_MS = 100;

/**
 * Build a successor adjacency list from tasks.
 * If task B lists task A in its `dependencies`, then A → B (A is predecessor of B).
 * We want: given a task, find all tasks that are downstream (successors).
 *
 * @param {Array} tasks — Mongoose task documents
 * @returns {Map<string, string[]>} successorMap — taskId → [successor ids]
 */
function buildSuccessorMap(tasks) {
    const idStr = (id) => id.toString();
    const successorMap = new Map();

    // Initialize every task with an empty array
    for (const t of tasks) {
        successorMap.set(idStr(t._id), []);
    }

    // For each task, look at its dependencies (predecessors).
    // If task B depends on A, then A has B as a successor.
    for (const t of tasks) {
        const taskId = idStr(t._id);
        for (const depId of (t.dependencies || [])) {
            const depStr = idStr(depId);
            if (successorMap.has(depStr)) {
                successorMap.get(depStr).push(taskId);
            }
        }
    }

    return successorMap;
}

/**
 * Calculate deterministic impact metrics for a simulated delay.
 *
 * @param {string} taskId — The ID of the task being delayed
 * @param {number} delayDays — Number of days the task is delayed
 * @param {Array} allTasks — All task documents from the database
 * @returns {{ rippleCount, affectedTaskIds, impactsMilestone, timeDebtHours, delayDays }}
 */
export function calculateDeterministicMetrics(taskId, delayDays, allTasks) {
    const idStr = (id) => id.toString();
    const targetId = idStr(taskId);

    // Build a lookup map for task metadata
    const taskLookup = new Map();
    for (const t of allTasks) {
        taskLookup.set(idStr(t._id), t);
    }

    // Build successor adjacency list
    const successorMap = buildSuccessorMap(allTasks);

    // BFS from the target task to find ALL unique downstream dependents
    const visited = new Set();
    const queue = [targetId];
    visited.add(targetId);

    while (queue.length > 0) {
        const current = queue.shift();
        const successors = successorMap.get(current) || [];
        for (const succ of successors) {
            if (!visited.has(succ)) {
                visited.add(succ);
                queue.push(succ);
            }
        }
    }

    // Remove the source task itself — we only want downstream tasks
    visited.delete(targetId);

    const affectedTaskIds = [...visited];

    // Check if any affected task is a milestone or high priority
    let impactsMilestone = false;
    for (const id of affectedTaskIds) {
        const task = taskLookup.get(id);
        if (task) {
            if (
                task.priority === "high" ||
                task.stage === "milestone" ||
                (task.title && task.title.toLowerCase().includes("milestone"))
            ) {
                impactsMilestone = true;
                break;
            }
        }
    }

    // Time Debt: delayDays × 8 hours/day
    const timeDebtHours = delayDays * 8;

    return {
        rippleCount: affectedTaskIds.length,
        affectedTaskIds,
        impactsMilestone,
        timeDebtHours,
        delayDays,
    };
}

// ─────────────────────────────────────────────────────────────────────
//  recalculateProject() — debounced full CPM recalc + cache + async AI
// ─────────────────────────────────────────────────────────────────────
export function recalculateProject() {
    if (_recalcTimer) clearTimeout(_recalcTimer);

    _recalcTimer = setTimeout(async () => {
        try {
            console.log("[ImpactService] Recalculating project impact…");

            // 1. Fetch all active tasks
            const allTasks = await Task.find({ isTrashed: false });
            if (!allTasks.length) {
                console.log("[ImpactService] No active tasks — skipping.");
                return;
            }

            // 2. Run CPM synchronously
            const cpmResult = runCPM(allTasks);

            // 3. Persist to ImpactCache (upsert singleton)
            const cache = await ImpactCache.findOneAndUpdate(
                {},
                {
                    cpmSnapshot: {
                        nodes: cpmResult.nodes,
                        edges: cpmResult.edges,
                        criticalPath: cpmResult.criticalPath,
                        projectDuration: cpmResult.projectDuration,
                        totalImpactScore: cpmResult.totalImpactScore,
                    },
                    lastCalculatedAt: new Date(),
                    aiPending: true,
                },
                { upsert: true, new: true }
            );

            console.log("[ImpactService] CPM cached. Firing async AI analysis…");

            // 4. Async AI — don't block
            setImmediate(async () => {
                try {
                    // Pick the first critical-path task for context
                    const critTaskId = cpmResult.criticalPath?.[0];
                    const critTask = allTasks.find(
                        (t) => t._id.toString() === critTaskId
                    );

                    const metrics = {
                        rippleCount: cpmResult.criticalPath?.length || 0,
                        timeDebtHours: 0,
                        impactsMilestone: cpmResult.criticalPath?.length > 2,
                        delayDays: 0,
                    };

                    const aiResult = await getConfidenceAnalysis(
                        metrics,
                        critTask?.title || "Project",
                        { totalTasks: allTasks.length }
                    );

                    await ImpactCache.findOneAndUpdate(
                        {},
                        {
                            aiPending: false,
                            aiResult: {
                                confidenceScore: aiResult.confidenceScore,
                                riskLevel: aiResult.riskLevel,
                                strategicAdvice: aiResult.strategicAdvice,
                                explanation: aiResult.explanation,
                            },
                        }
                    );

                    console.log("[ImpactService] AI analysis cached.");
                } catch (aiErr) {
                    console.error("[ImpactService] Async AI failed:", aiErr.message);
                    await ImpactCache.findOneAndUpdate(
                        {},
                        { aiPending: false }
                    );
                }
            });
        } catch (err) {
            console.error("[ImpactService] Recalculation failed:", err.message);
        }
    }, DEBOUNCE_MS);
}

// ─────────────────────────────────────────────────────────────────────
//  scanForSlippages() — called by cron to find overdue tasks
// ─────────────────────────────────────────────────────────────────────
export async function scanForSlippages() {
    try {
        console.log("[ImpactService] Scanning for passive slippages…");

        const now = new Date();

        // Find overdue tasks: due date passed, not completed, not trashed
        const overdueTasks = await Task.find({
            date: { $lt: now },
            stage: { $ne: "completed" },
            isTrashed: false,
        });

        if (!overdueTasks.length) {
            console.log("[ImpactService] No slippages detected.");
            return { flagged: 0 };
        }

        console.log(`[ImpactService] Found ${overdueTasks.length} overdue task(s).`);

        const atRiskIds = [];

        for (const task of overdueTasks) {
            atRiskIds.push(task._id);

            // Check if we already flagged this task recently (within 24h)
            const recentFlag = task.activities?.find(
                (a) =>
                    a.type === "bug" &&
                    a.activity?.includes("AUTO-FLAGGED") &&
                    a.date && (now - new Date(a.date)) < 24 * 60 * 60 * 1000
            );

            if (recentFlag) continue; // Already flagged recently

            // Add an activity entry to mark it as at-risk
            await Task.findByIdAndUpdate(task._id, {
                $push: {
                    activities: {
                        type: "bug",
                        activity: `AUTO-FLAGGED: Task is overdue (due ${task.date.toDateString()}). Passive slippage detected.`,
                        date: now,
                    },
                },
            });

            // Create a notification for the team
            if (task.team?.length) {
                await Notice.create({
                    team: task.team,
                    text: `⚠️ Task "${task.title}" is overdue and has been auto-flagged as At Risk.`,
                    task: task._id,
                });
            }
        }

        // Update cache with at-risk task IDs
        await ImpactCache.findOneAndUpdate(
            {},
            { atRiskTaskIds: atRiskIds },
            { upsert: true }
        );

        // Trigger full recalculation
        recalculateProject();

        return { flagged: overdueTasks.length };
    } catch (err) {
        console.error("[ImpactService] Slippage scan failed:", err.message);
        return { flagged: 0, error: err.message };
    }
}
