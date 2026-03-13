import Task from "../models/tasks.js";
import { cascadeTaskDates, addBusinessDays } from "../utils/scheduleEngine.js";
import { generateRescuePlan } from "../services/aiService.js";

export const flagOverdueTasks = async (req, res) => {
    try {
        const now = new Date();
        
        // Find tasks that are past their deadline (endDate or legacy date field)
        const overdueTasks = await Task.updateMany(
            { 
                $or: [
                    { endDate: { $lt: now, $ne: null } },
                    { endDate: null, date: { $lt: now } }
                ],
                stage: { $nin: ["completed", "requires_resolution", "archived"] },
                isTrashed: false 
            },
            { $set: { stage: "requires_resolution" } }
        );

        res.status(200).json({
            success: true,
            status: true,
            message: `Flagged ${overdueTasks.modifiedCount || 0} overdue tasks for resolution.`,
        });
    } catch (error) {
        console.error("[ResolutionController] Flag Overdue Tasks Error:", error);
        res.status(500).json({ status: false, message: error.message });
    }
};

export const generateRescuePlanEndpoint = async (req, res) => {
    try {
        const { id } = req.params;

        const originalTask = await Task.findById(id);
        if (!originalTask) {
            return res.status(404).json({ status: false, message: "Task not found." });
        }

        if (originalTask.stage === "archived") {
            return res.status(400).json({ status: false, message: "Task is already archived." });
        }

        // 1. Generate Rescue Plan via AI
        const aiResponse = await generateRescuePlan(originalTask);

        if (!aiResponse || !aiResponse.tasks || aiResponse.tasks.length === 0) {
            return res.status(400).json({ status: false, message: "AI returned 0 rescue tasks." });
        }

        res.status(200).json({
            success: true,
            status: true,
            strategicReasoning: aiResponse.strategicReasoning,
            rescueTasks: aiResponse.tasks
        });
    } catch (error) {
        console.error("[ResolutionController] Generate Rescue Plan Error:", error);
        res.status(500).json({ status: false, message: error.message });
    }
};

export const approveRescuePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organizationId || req.body?.organizationId;

        const originalTask = await Task.findById(id);
        if (!originalTask) {
            return res.status(404).json({ status: false, message: "Task not found." });
        }

        if (originalTask.stage === "archived") {
            return res.status(400).json({ status: false, message: "Task is already archived." });
        }

        // 1. Accept Rescue Plan Data from UI (Now editable)
        const rescueTasksData = req.body.rescueTasksData;

        if (!rescueTasksData || !Array.isArray(rescueTasksData) || rescueTasksData.length === 0) {
            return res.status(400).json({ status: false, message: "Valid Rescue Plan payload is required." });
        }

        // 2. The Graph Swap: Insert the 3 new Rescue Tasks sequentially
        // The first rescue task should inherit the original task's predecessors so it fits perfectly into the existing Gantt flow
        let previousRescueTaskId = originalTask.predecessors?.length > 0 ? originalTask.predecessors : []; 
        
        const newRescueTasks = [];
        let currentStartDate = new Date();

        for (let i = 0; i < rescueTasksData.length; i++) {
            const rtData = rescueTasksData[i];
            const duration = rtData.duration || 1;

            const rescueTask = new Task({
                title: `[Rescue] ${rtData.title}`,
                description: rtData.description || `Automatically generated rescue task for failed task: ${originalTask.title}`,
                stage: "todo",
                organizationId: originalTask.organizationId || organizationId,
                team: rtData.team || originalTask.team, // Modified: Allow custom assignees
                assets: rtData.assets || [], // Modified: Allow asset uploads
                startDate: currentStartDate,
                date: currentStartDate, // Legacy compatibility
                endDate: addBusinessDays(currentStartDate, duration),
                duration: duration,
                priority: "high",
                isRescueTask: true,
                predecessors: i === 0 
                                ? previousRescueTaskId 
                                : [previousRescueTaskId],
                successors: []
            });

            await rescueTask.save();
            newRescueTasks.push(rescueTask);

            // Update the previous rescue task's successors array to point to this new one
            if (i > 0) {
                const prev = newRescueTasks[i - 1];
                prev.successors.push(rescueTask._id);
                await prev.save();
            }

            // The next rescue task depends on this one
            previousRescueTaskId = rescueTask._id;
            
            // Advance the rough start date for the initial insert (cascade function will perfect it later)
            currentStartDate = addBusinessDays(rescueTask.endDate, 1);
        }

        const firstRescueTask = newRescueTasks[0];
        const finalRescueTask = newRescueTasks[newRescueTasks.length - 1];

        // 3. Rewire Downstream Dependencies
        // Find tasks that depended on the ORIGINAL task
        const downstreamTasks = await Task.find({ predecessors: originalTask._id });
        
        for (const child of downstreamTasks) {
            // Remove the originalTask._id from the child's predecessors
            child.predecessors = child.predecessors.filter(
                (pId) => pId.toString() !== originalTask._id.toString()
            );
            // Add the finalRescueTask._id so it waits for the rescue to complete!
            child.predecessors.push(finalRescueTask._id);
            await child.save();
            
            // Link the final rescue task's successor explicitly
            finalRescueTask.successors.push(child._id);
        }
        await finalRescueTask.save();

        // 4. Archive original task
        originalTask.stage = "archived";
        await originalTask.save();

        // 5. Fire the Mathematical Healing Engine
        // Trigger it starting from the first rescue task to mathematically heal the rest of the Gantt chart accurately
        await cascadeTaskDates(firstRescueTask._id);

        res.status(200).json({
            status: true,
            success: true,
            message: "Self-Healing Schedule sequence initiated successfully.",
            archivedTask: originalTask.title,
            newTasksCreated: newRescueTasks.map(t => t.title)
        });

    } catch (error) {
        console.error("[ResolutionController] Approve Rescue Plan Error:", error);
        res.status(500).json({ status: false, message: error.message });
    }
};
