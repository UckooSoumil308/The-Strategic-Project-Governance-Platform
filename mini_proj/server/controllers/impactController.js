
import Task from "../models/tasks.js";
import ImpactCache from "../models/ImpactCache.js";
import { runCPM } from "../utils/cpmEngine.js";
import { calculateDeterministicMetrics } from "../utils/ImpactService.js";
import { getConfidenceAnalysis } from "../utils/GeminiService.js";

/**
 * GET /api/impact/analysis
 * Returns CPM analysis for all non-trashed tasks.
 * Optional query: ?delays={"taskId":3,...}
 */
const getImpactAnalysis = async (req, res) => {
    try {
        const tasks = await Task.find({ isTrashed: false });

        // Parse optional delays from query string
        let delays = {};
        if (req.query.delays) {
            try {
                delays = JSON.parse(req.query.delays);
            } catch {
                // ignore malformed delays
            }
        }

        const analysis = runCPM(tasks, delays);

        res.status(200).json({
            status: true,
            ...analysis,
            message: "Impact analysis generated successfully.",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

/**
 * POST /api/impact/simulate
 * Accepts: { taskId, delayDays }
 * Orchestrates: ImpactService → GeminiService → Combined JSON
 */
const simulateImpact = async (req, res) => {
    try {
        const { taskId, delayDays } = req.body;

        if (!taskId || delayDays === undefined) {
            return res.status(400).json({
                status: false,
                message: "taskId and delayDays are required.",
            });
        }

        const delay = Math.max(0, Math.min(60, Number(delayDays)));

        // Fetch all tasks
        const allTasks = await Task.find({ isTrashed: false });

        // Find the target task
        const targetTask = allTasks.find(
            (t) => t._id.toString() === taskId.toString()
        );
        if (!targetTask) {
            return res.status(404).json({
                status: false,
                message: "Task not found.",
            });
        }

        // 1. Deterministic metrics (math layer)
        const metrics = calculateDeterministicMetrics(taskId, delay, allTasks);

        // 2. AI confidence analysis (intelligence layer)
        const ai = await getConfidenceAnalysis(metrics, targetTask.title, {
            totalTasks: allTasks.length,
        });

        res.status(200).json({
            status: true,
            metrics,
            ai,
            taskName: targetTask.title,
            message: "Simulation completed successfully.",
        });
    } catch (error) {
        console.error("Simulate error:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

/**
 * GET /api/impact/latest
 * Returns the latest cached CPM + AI snapshot for frontend auto-polling.
 */
const getLatestImpact = async (req, res) => {
    try {
        const cache = await ImpactCache.findOne({}).lean();

        if (!cache) {
            return res.status(200).json({
                status: true,
                cached: false,
                message: "No cached impact data yet. Trigger a task change or wait for cron.",
            });
        }

        res.status(200).json({
            status: true,
            cached: true,
            cpmSnapshot: cache.cpmSnapshot,
            atRiskTaskIds: cache.atRiskTaskIds || [],
            lastCalculatedAt: cache.lastCalculatedAt,
            aiPending: cache.aiPending,
            aiResult: cache.aiResult,
            message: "Latest impact data retrieved.",
        });
    } catch (error) {
        console.error("Latest impact error:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

export { getImpactAnalysis, simulateImpact, getLatestImpact };

