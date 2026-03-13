import express from "express";
import { analyzeContext, chat, sendCommandToAgent } from "../controllers/aiController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/analyze-context", protectRoute, analyzeContext);
router.post("/chat", protectRoute, chat);
router.post("/agent-command", protectRoute, sendCommandToAgent);

export default router;
