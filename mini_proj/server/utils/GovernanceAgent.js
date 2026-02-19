import axios from "axios";

const TIMEOUT_MS = 30000; // 30s timeout to allow for LLM processing

// Default project OKRs — used when no project-specific OKRs are configured
const DEFAULT_PROJECT_OKRS = `
1. Deliver high-quality software on time and within scope.
2. Improve team productivity and collaboration efficiency.
3. Maintain system reliability and reduce technical debt.
4. Ensure all work aligns with the current sprint goals and roadmap.
`.trim();

/**
 * Evaluate a proposed task against project OKRs using the Colab-hosted LLM Judge.
 *
 * @param {Object} taskPayload - The task data from the create request
 * @param {string} taskPayload.title - Task title
 * @param {string} [taskPayload.description] - Task description
 * @param {string} [taskPayload.priority] - Task priority
 * @param {string} [taskPayload.stage] - Task stage
 * @param {string} [taskPayload.workloadContext] - Context about user workload
 * @param {string} [projectOKRs] - Optional project OKRs string
 * @returns {Promise<{approved: boolean, reason: string}>}
 */
export async function evaluateTask(taskPayload, projectOKRs) {
    // Read env at call time (dotenv may not have loaded at import time)
    const JUDGE_URL = process.env.COLAB_JUDGE_URL;

    // If no Judge URL configured, fail-open (approve all)
    if (!JUDGE_URL) {
        console.warn("[GovernanceAgent] COLAB_JUDGE_URL not set — skipping governance check.");
        return { approved: true, reason: "Governance check skipped — no judge URL configured." };
    }

    const taskDetails = [
        `Title: ${taskPayload.title}`,
        taskPayload.description ? `Description: ${taskPayload.description}` : null,
        taskPayload.priority ? `Priority: ${taskPayload.priority}` : null,
        taskPayload.stage ? `Stage: ${taskPayload.stage}` : null,
        taskPayload.workloadContext ? `Resource Context: ${taskPayload.workloadContext}` : null,
    ]
        .filter(Boolean)
        .join("\n");

    try {
        console.log(`[GovernanceAgent] Evaluating task: "${taskPayload.title}"`);

        const response = await axios.post(
            `${JUDGE_URL}/evaluate-task`,
            {
                taskDetails,
                projectOKRs: projectOKRs || DEFAULT_PROJECT_OKRS,
            },
            {
                timeout: TIMEOUT_MS,
                headers: { "Content-Type": "application/json" },
            }
        );

        const { approved, reason } = response.data;
        console.log(`[GovernanceAgent] Decision: approved=${approved} | reason=${reason}`);

        return {
            approved: Boolean(approved),
            reason: reason || "No reason provided.",
        };
    } catch (err) {
        // Fail-open: if the judge is unreachable, approve by default
        const msg = err.response?.data?.detail || err.message;
        console.error(`[GovernanceAgent] Judge error: ${msg} — defaulting to approved.`);
        return {
            approved: true,
            reason: `Governance check failed (${msg}) — auto-approved.`,
        };
    }
}

export default { evaluateTask };
