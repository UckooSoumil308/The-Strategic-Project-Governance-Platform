import express from "express";
import { flagOverdueTasks, approveRescuePlan, generateRescuePlanEndpoint } from "../controllers/resolutionController.js";
import { isAdminRoute, protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

// Cron job endpoint to flag overdue tasks automatically
// Note: Depending on your cron setup, you might want to add a custom secret token middleware here
router.post("/cron/flag-overdue", flagOverdueTasks);

// AI Analysis endpoint to query the LLM and return the editable plan to the UI
router.post("/tasks/:id/generate-rescue", protectRoute, generateRescuePlanEndpoint);

// PM Approval endpoint for a specific task to trigger the graph swap with the edited payload
router.post("/tasks/:id/approve-rescue", protectRoute, isAdminRoute, approveRescuePlan);

export default router;
