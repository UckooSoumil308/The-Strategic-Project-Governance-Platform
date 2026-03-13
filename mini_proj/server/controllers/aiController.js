import Task from "../models/tasks.js";
import { initializeSession, sendMessage } from "../utils/GeminiService.js";
import axios from "axios";

/**
 * POST /api/ai/analyze-context
 * Body: { taskId }
 * Initializes a Gemini chat session with all task assets as context.
 */
const analyzeContext = async (req, res) => {
    try {
        const { taskId, selectedAssets } = req.body;

        if (!taskId) {
            return res.status(400).json({
                status: false,
                message: "taskId is required.",
            });
        }

        // Fetch the task and its assets
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                status: false,
                message: "Task not found.",
            });
        }

        // Use selectedAssets if provided, otherwise all task assets
        const assetsToAnalyze =
            selectedAssets && selectedAssets.length > 0
                ? selectedAssets
                : task.assets;

        if (!assetsToAnalyze || assetsToAnalyze.length === 0) {
            return res.status(400).json({
                status: false,
                message: "No assets selected for analysis.",
            });
        }

        // Initialize the Gemini session with selected assets
        const { sessionId, filesProcessed, initialMessage } =
            await initializeSession(assetsToAnalyze);

        res.status(200).json({
            status: true,
            sessionId,
            filesProcessed,
            initialMessage,
        });
    } catch (error) {
        console.error("analyzeContext error:", error);
        res.status(500).json({
            status: false,
            message: error.message || "Failed to initialize AI review session.",
        });
    }
};

/**
 * POST /api/ai/chat
 * Body: { sessionId, message }
 * Sends a follow-up message in an existing Gemini session.
 */
const chat = async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({
                status: false,
                message: "sessionId and message are required.",
            });
        }

        const response = await sendMessage(sessionId, message);

        res.status(200).json({
            status: true,
            response,
        });
    } catch (error) {
        console.error("chat error:", error);
        res.status(500).json({
            status: false,
            message: error.message || "Failed to get AI response.",
        });
    }
};

/**
 * POST /api/ai/agent-command
 * Body: { command, userId }
 * Passes a command to the n8n Agent and waits for a response.
 */
const sendCommandToAgent = async (req, res) => {
    try {
        const { command } = req.body;
        const { userId } = req.user;

        if (!command) {
            return res.status(400).json({ status: false, message: "Command is required." });
        }

        const n8nAgentUrl = process.env.N8N_AGENT_WEBHOOK_URL;
        if (!n8nAgentUrl) {
            return res.status(500).json({ status: false, message: "N8N Agent URL is not configured." });
        }

        const response = await axios.post(n8nAgentUrl, {
            command,
            userId
        });

        res.status(200).json({ reply: response.data.reply || response.data });
    } catch (error) {
        console.error("Agent command error:", error.message);
        res.status(500).json({ status: false, message: "Failed to communicate with Agent." });
    }
};

export { analyzeContext, chat, sendCommandToAgent };
