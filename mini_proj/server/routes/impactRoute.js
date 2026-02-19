import express from "express";
import {
    getImpactAnalysis,
    simulateImpact,
    getLatestImpact,
} from "../controllers/impactController.js";

const router = express.Router();

router.get("/analysis", getImpactAnalysis);
router.post("/simulate", simulateImpact);
router.get("/latest", getLatestImpact);

export default router;
