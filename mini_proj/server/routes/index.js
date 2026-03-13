import express from "express";
import userRoutes from "./userRoute.js";
import taskRoutes from "./taskRoute.js";
import impactRoutes from "./impactRoute.js";
import aiRoutes from "./aiRoute.js";
import resolutionRoutes from "./resolutionRoute.js";
import agentToolsRoutes from "./agentToolsRoute.js";

const router = express.Router();

router.use("/user", userRoutes); //api/uesr/register
router.use("/task", taskRoutes);
router.use("/impact", impactRoutes);
router.use("/ai", aiRoutes);
router.use("/resolution", resolutionRoutes);
router.use("/agent-tools", agentToolsRoutes);

export default router;