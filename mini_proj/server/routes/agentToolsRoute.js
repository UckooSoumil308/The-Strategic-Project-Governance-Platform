import express from "express";
import { getTaskImpact, getCompletedTasksSummary } from "../controllers/agentToolsController.js";

const router = express.Router();

// n8n Agent Endpoint 1: The Blast Radius
// e.g., GET /api/agent-tools/impact/64f1b2c3d4e5f6g7h8i9j0k1
router.get("/impact/:taskId", getTaskImpact);

// n8n Agent Endpoint 2: The Weekly Summary
// e.g., GET /api/agent-tools/summary/completed
router.get("/summary/completed", getCompletedTasksSummary);

export default router;
