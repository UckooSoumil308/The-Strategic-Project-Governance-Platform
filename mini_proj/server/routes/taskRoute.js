import express from "express";
import {
    createSubTask,
    createTask,
    dashboardStatistics,
    deleteAsset,
    deleteRestoreTask,
    duplicateTask,
    getGovernanceTasks,
    getTask,
    getTasks,
    governanceStats,
    postTaskActivity,
    trashTask,
    updateSubTaskStage,
    updateTask,
    updateTaskStage,
    approveQuarantinedTask,
    applyMitigationPlan,
    reviewGovernanceTask,
} from "../controllers/taskController.js";
import { isAdminRoute, protectRoute } from "../middleware/authMiddleware.js";
import { verifyN8nRequest } from "../middleware/n8nAuth.js";

const router = express.Router();

router.post("/create", protectRoute, isAdminRoute, createTask);
router.post("/duplicate/:id", protectRoute, isAdminRoute, duplicateTask);
router.post("/activity/:id", protectRoute, postTaskActivity);

router.get("/governance-tasks", protectRoute, isAdminRoute, getGovernanceTasks);
router.get("/governance-stats", protectRoute, governanceStats);
router.get("/dashboard", protectRoute, dashboardStatistics);
router.get("/", protectRoute, getTasks);
router.get("/:id", protectRoute, getTask);

router.put("/create-subtask/:id", protectRoute, isAdminRoute, createSubTask);
router.put("/update/:id", protectRoute, isAdminRoute, updateTask);
router.put("/change-stage/:id", protectRoute, updateTaskStage);
router.put("/governance-review/:id", protectRoute, isAdminRoute, reviewGovernanceTask);
router.put("/delete-asset/:id", protectRoute, isAdminRoute, deleteAsset);
router.put(
    "/change-status/:taskId/:subTaskId",
    protectRoute,
    updateSubTaskStage
);
router.put("/:id", protectRoute, isAdminRoute, trashTask);

router.delete(
    "/delete-restore",
    protectRoute,
    isAdminRoute,
    deleteRestoreTask
);
router.delete(
    "/delete-restore/:id",
    protectRoute,
    isAdminRoute,
    deleteRestoreTask
);

// n8n Inbound Route
router.patch("/apply-mitigation", verifyN8nRequest, applyMitigationPlan);
router.patch("/:id/approve", verifyN8nRequest, approveQuarantinedTask);

export default router;