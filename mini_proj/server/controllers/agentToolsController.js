import Task from "../models/tasks.js";

/**
 * Endpoint 1: The Blast Radius 
 * GET /api/agent-tools/impact/:taskId
 * Analyzes the downstream impact (successors) of a specific task.
 */
export const getTaskImpact = async (req, res) => {
    try {
        const { taskId } = req.params;

        const originalTask = await Task.findById(taskId).populate({
            path: 'successors',
            select: '_id title stage priority date team' // Fetch essential details of impacted tasks
        });

        if (!originalTask) {
            return res.status(404).json({ 
                status: false, 
                message: "Task not found." 
            });
        }

        const impactedTasksData = originalTask.successors.map(task => ({
            id: task._id,
            title: task.title,
            status: task.stage,
            priority: task.priority,
            dueDate: task.date
        }));

        res.status(200).json({
            originalTask: originalTask.title,
            totalImpacted: impactedTasksData.length,
            impactedTasks: impactedTasksData
        });

    } catch (error) {
        console.error("[AgentToolsController] Get Task Impact Error:", error);
        res.status(500).json({ status: false, message: error.message });
    }
};


/**
 * Endpoint 2: The Weekly Summary
 * GET /api/agent-tools/summary/completed
 * Returns a clean summary of all recently completed tasks.
 */
export const getCompletedTasksSummary = async (req, res) => {
    try {
        // Query tasks where stage is strictly 'completed'
        // Populating the team array to get assignee names instead of just object IDs
        const completedTasks = await Task.find({ 
            stage: "completed",
            isTrashed: false 
        }).populate({
            path: "team",
            select: "name title email"
        }).sort({ updatedAt: -1 }); // Recently completed first

        if (!completedTasks || completedTasks.length === 0) {
           return res.status(200).json({
               message: "No completed tasks found.",
               totalCompleted: 0,
               tasks: []
           });
        }

        const summaryData = completedTasks.map(task => ({
            title: task.title,
            endDate: new Date(task.endDate || task.date).toLocaleDateString(),
            assignees: task.team.map(user => user.name),
            priority: task.priority
        }));

        res.status(200).json({
            totalCompleted: summaryData.length,
            tasks: summaryData
        });

    } catch (error) {
        console.error("[AgentToolsController] Get Weekly Summary Error:", error);
        res.status(500).json({ status: false, message: error.message });
    }
};
