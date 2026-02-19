import express from "express";
import userRoutes from "./userRoute.js";
import taskRoutes from "./taskRoute.js";
import impactRoutes from "./impactRoute.js";
import aiRoutes from "./aiRoute.js";

const router = express.Router();

router.use("/user", userRoutes); //api/uesr/register
router.use("/task", taskRoutes);
router.use("/impact", impactRoutes);
router.use("/ai", aiRoutes);

export default router;