
import Notice from "../models/notifications.js";
import Task from "../models/tasks.js";
import User from "../models/users.js";
import { evaluateTask } from "../utils/GovernanceAgent.js";

/**
 * Recursively updates successor dates based on Finish-to-Start logic.
 * Ensures that if a predecessor shifts, all successors shift accordingly,
 * respecting lead time and lag time modifiers.
 */
const updateSuccessorsSchedule = async (taskId, newEndDate, organizationId) => {
    // Find all immediate successors
    const successors = await Task.find({ predecessors: taskId, organizationId });

    for (const successor of successors) {
        // A successor's new start date is the predecessor's end date + lagTime - leadTime
        // (Assuming dates are stored in milliseconds for calculation)
        const offsetMs = (successor.lagTime || 0) * 86400000 - (successor.leadTime || 0) * 86400000;
        const newStartDate = new Date(newEndDate.getTime() + offsetMs);

        // If the successor's start date is changing, we adjust it and recurse
        if (newStartDate.getTime() !== new Date(successor.date).getTime()) {
            successor.date = newStartDate;
            await successor.save();

            // Calculate the successor's new end date
            const successorEndDate = new Date(newStartDate.getTime() + (successor.duration || 1) * 86400000);

            // Recurse to shift its successors
            await updateSuccessorsSchedule(successor._id, successorEndDate, organizationId);
        }
    }
};

const createTask = async (req, res) => {
    try {
        const { userId } = req.user;
        const { title, team, stage, date, priority, assets, links, description, predecessors, successors, leadTime, lagTime, baselineSchedule, duration, isEpic, isMilestone } =
            req.body;

        //alert users of the task
        let text = "New task has been assigned to you";
        if (team?.length > 1) {
            text = text + ` and ${team?.length - 1} others.`;
        }

        text =
            text +
            ` The task priority is set a ${priority} priority, so check and act accordingly. The task date is ${new Date(
                date
            ).toDateString()}. Thank you!!!`;

        const activity = {
            type: "assigned",
            activity: text,
            by: userId,
        };
        let newLinks = null;

        if (links) {
            newLinks = links?.split(",");
        }

        // ── Governance Check: AI Judge ──────────────────────────
        // 1. Calculate Workload Context
        let workloadContext = "";
        if (team?.length > 0) {
            const teamWorkload = await Promise.all(
                team.map(async (memberId) => {
                    const count = await Task.countDocuments({
                        team: memberId,
                        stage: { $in: ["todo", "in progress"] },
                        isTrashed: false,
                    });
                    const user = await User.findById(memberId).select("name");
                    return { name: user?.name || "Unknown", count };
                })
            );
            workloadContext = teamWorkload
                .map((w) => `${w.name} has ${w.count} active tasks.`)
                .join(" ");
        }

        // 2. Evaluate with Context
        let governance = { approved: true, reason: "" };

        // Bypass governance check if this task is an AI-generated epic/milestone from the sandbox
        // Doing 10+ sequential LLM round-trips for full schedule saves will time out the browser.
        if (req.body.isEpic || req.body.isMilestone) {
            governance.reason = "Auto-approved: Task is part of an AI-generated project schedule."
        } else {
            governance = await evaluateTask({
                title,
                description,
                priority,
                stage,
                workloadContext
            });
        }

        if (!governance.approved) {
            // Save the task for audit trail, but mark as blocked
            const blockedTask = await Task.create({
                title,
                team,
                stage: stage.toLowerCase(),
                date,
                priority: priority.toLowerCase(),
                assets,
                activities: activity,
                links: newLinks || [],
                description,
                governanceStatus: "pending_governance_review",
                governanceReason: governance.reason,
                organizationId: req.user.organizationId,
            });

            return res.status(403).json({
                status: false,
                governance: {
                    approved: false,
                    reason: governance.reason,
                },
                task: blockedTask,
                message: "Task blocked by AI Governance Judge — strategic drift detected.",
            });
        }
        // ── End Governance Check ─────────────────────────────────

        const task = await Task.create({
            title,
            team,
            stage: stage.toLowerCase(),
            date,
            priority: priority.toLowerCase(),
            assets,
            activities: activity,
            links: newLinks || [],
            description,
            predecessors: predecessors || [],
            successors: successors || [],
            leadTime: leadTime || 0,
            lagTime: lagTime || 0,
            duration: duration || 1,
            isEpic: isEpic || false,
            isMilestone: isMilestone || false,
            baselineSchedule: baselineSchedule || { startDate: new Date(date), duration: duration || 1 },
            governanceStatus: "approved",
            governanceReason: governance.reason,
            organizationId: req.user.organizationId,
        });

        // ── Auto-link: If this task has predecessors, add this task as a successor to them ──
        if (predecessors && predecessors.length > 0) {
            await Task.updateMany(
                { _id: { $in: predecessors }, organizationId: req.user.organizationId },
                { $addToSet: { successors: task._id } }
            );
        }

        await Notice.create({
            team,
            text,
            task: task._id,
        });

        const users = await User.find({
            _id: team,
        });

        if (users) {
            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                await User.findByIdAndUpdate(user._id, { $push: { tasks: task._id } });
            }
        }

        res
            .status(200)
            .json({ status: true, task, message: "Task created successfully." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

const duplicateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, organizationId } = req.user;

        const task = await Task.findOne({ _id: id, organizationId });

        //alert users of the task
        let text = "New task has been assigned to you";
        if (task.team?.length > 1) {
            text = text + ` and ${task.team?.length - 1} others.`;
        }

        text =
            text +
            ` The task priority is set a ${task.priority
            } priority, so check and act accordingly. The task date is ${new Date(
                task.date
            ).toDateString()}. Thank you!!!`;

        const activity = {
            type: "assigned",
            activity: text,
            by: userId,
        };

        const newTask = await Task.create({
            ...task.toObject(),
            title: "Duplicate - " + task.title,
            _id: undefined, // ensure new ID is generated
        });

        newTask.team = task.team;
        newTask.subTasks = task.subTasks;
        newTask.assets = task.assets;
        newTask.links = task.links;
        newTask.priority = task.priority;
        newTask.stage = task.stage;
        newTask.activities = activity;
        newTask.description = task.description;

        await newTask.save();

        await Notice.create({
            team: newTask.team,
            text,
            task: newTask._id,
        });

        res
            .status(200)
            .json({ status: true, message: "Task duplicated successfully." });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

const updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, date, team, stage, priority, assets, links, description, predecessors, leadTime, lagTime, duration } =
        req.body;

    const { organizationId } = req.user;

    try {
        const task = await Task.findOne({ _id: id, organizationId });

        if (!task) {
            return res.status(404).json({ status: false, message: "Task not found or unauthorized access." });
        }

        let newLinks = [];

        if (links) {
            newLinks = Array.isArray(links) ? links : links.split(",");
        }

        // ── Check if schedule changed to trigger cascade ──
        const previousDate = task.date ? new Date(task.date).getTime() : null;
        const previousDuration = task.duration || 1;

        if (title !== undefined) task.title = title;
        if (date !== undefined) task.date = date;
        if (priority !== undefined) task.priority = priority.toLowerCase();
        if (assets !== undefined) task.assets = assets;
        if (stage !== undefined) task.stage = stage.toLowerCase();
        if (team !== undefined) task.team = team;
        if (links !== undefined) task.links = newLinks;
        if (description !== undefined) task.description = description;

        // Update Gantt ecosystem fields
        if (duration !== undefined) task.duration = duration;
        if (leadTime !== undefined) task.leadTime = leadTime;
        if (lagTime !== undefined) task.lagTime = lagTime;

        // Handle explicit predecessor linking adjustments
        if (predecessors) {
            // Remove this task from old predecessors' successors list
            const oldPredecessors = task.predecessors || [];
            const removedPredecessors = oldPredecessors.filter(p => !predecessors.includes(p.toString()));
            if (removedPredecessors.length > 0) {
                await Task.updateMany(
                    { _id: { $in: removedPredecessors }, organizationId },
                    { $pull: { successors: task._id } }
                );
            }

            // Add this task to new predecessors' successors list
            const addedPredecessors = predecessors.filter(p => !oldPredecessors.some(op => op.toString() === p));
            if (addedPredecessors.length > 0) {
                await Task.updateMany(
                    { _id: { $in: addedPredecessors }, organizationId },
                    { $addToSet: { successors: task._id } }
                );
            }
            task.predecessors = predecessors;
        }

        await task.save();

        // ── Finish-to-Start Cascading Logic ──
        const newDateObj = new Date(date);
        const dateChanged = previousDate !== newDateObj.getTime();
        const durationChanged = previousDuration !== (duration || 1);

        if (dateChanged || durationChanged) {
            const endDate = new Date(newDateObj.getTime() + (task.duration || 1) * 86400000);
            await updateSuccessorsSchedule(task._id, endDate, organizationId);
        }

        res
            .status(200)
            .json({ status: true, message: "Task updated successfully." });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message });
    }
};

const updateTaskStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;
        const { organizationId } = req.user;

        const task = await Task.findOne({ _id: id, organizationId });

        task.stage = stage.toLowerCase();

        await task.save();

        res
            .status(200)
            .json({ status: true, message: "Task stage changed successfully." });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message });
    }
};

const updateSubTaskStage = async (req, res) => {
    try {
        const { taskId, subTaskId } = req.params;
        const { status } = req.body;
        const { organizationId } = req.user;

        await Task.findOneAndUpdate(
            {
                _id: taskId,
                organizationId,
                "subTasks._id": subTaskId,
            },
            {
                $set: {
                    "subTasks.$.isCompleted": status,
                },
            }
        );

        res.status(200).json({
            status: true,
            message: status
                ? "Task has been marked completed"
                : "Task has been marked uncompleted",
        });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error.message });
    }
};

const createSubTask = async (req, res) => {
    const { title, tag, date } = req.body;
    const { id } = req.params;
    const { organizationId } = req.user;

    try {
        const newSubTask = {
            title,
            date,
            tag,
            isCompleted: false,
        };

        const task = await Task.findOne({ _id: id, organizationId });

        task.subTasks.push(newSubTask);

        await task.save();

        res
            .status(200)
            .json({ status: true, message: "SubTask added successfully." });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message });
    }
};

const getTasks = async (req, res) => {
    const { userId, isAdmin, organizationId } = req.user;
    const { stage, isTrashed, search } = req.query;

    let query = { isTrashed: isTrashed ? true : false, organizationId };

    if (!isAdmin) {
        query.team = { $all: [userId] };
    }
    if (stage) {
        query.stage = stage;
    }

    if (search) {
        const searchQuery = {
            $or: [
                { title: { $regex: search, $options: "i" } },
                { stage: { $regex: search, $options: "i" } },
                { priority: { $regex: search, $options: "i" } },
            ],
        };
        query = { ...query, ...searchQuery };
    }

    let queryResult = Task.find(query)
        .populate({
            path: "team",
            select: "name title email",
        })
        .sort({ _id: -1 });

    const tasks = await queryResult;

    res.status(200).json({
        status: true,
        tasks,
    });
};

const getTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const task = await Task.findOne({ _id: id, organizationId })
            .populate({
                path: "team",
                select: "name title role email",
            })
            .populate({
                path: "activities.by",
                select: "name",
            })
            .sort({ _id: -1 });

        res.status(200).json({
            status: true,
            task,
        });
    } catch (error) {
        console.log(error);
        throw new Error("Failed to fetch task", error);
    }
};

const postTaskActivity = async (req, res) => {
    const { id } = req.params;
    const { userId, organizationId } = req.user;
    const { type, activity } = req.body;

    try {
        const task = await Task.findOne({ _id: id, organizationId });

        const data = {
            type,
            activity,
            by: userId,
        };
        task.activities.push(data);

        await task.save();

        res
            .status(200)
            .json({ status: true, message: "Activity posted successfully." });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message });
    }
};

const trashTask = async (req, res) => {
    const { id } = req.params;
    const { organizationId } = req.user;

    try {
        const task = await Task.findOne({ _id: id, organizationId });

        task.isTrashed = true;

        await task.save();

        res.status(200).json({
            status: true,
            message: `Task trashed successfully.`,
        });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message });
    }
};

const deleteRestoreTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { actionType } = req.query;
        const { organizationId } = req.user;

        if (actionType === "delete") {
            await Task.findOneAndDelete({ _id: id, organizationId });
        } else if (actionType === "deleteAll") {
            await Task.deleteMany({ isTrashed: true, organizationId });
        } else if (actionType === "restore") {
            const resp = await Task.findOne({ _id: id, organizationId });

            resp.isTrashed = false;

            resp.save();
        } else if (actionType === "restoreAll") {
            await Task.updateMany(
                { isTrashed: true },
                { $set: { isTrashed: false } }
            );
        }

        res.status(200).json({
            status: true,
            message: `Operation performed successfully.`,
        });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message });
    }
};

const dashboardStatistics = async (req, res) => {
    try {
        const { userId, isAdmin, organizationId } = req.user;

        // Fetch all tasks from the database scoped to organizationId
        const allTasks = isAdmin
            ? await Task.find({
                isTrashed: false,
                organizationId
            })
                .populate({
                    path: "team",
                    select: "name role title email",
                })
                .sort({ _id: -1 })
            : await Task.find({
                isTrashed: false,
                organizationId,
                team: { $all: [userId] },
            })
                .populate({
                    path: "team",
                    select: "name role title email",
                })
                .sort({ _id: -1 });

        const users = await User.find({ isActive: true, organizationId })
            .select("name title role isActive createdAt")
            .limit(10)
            .sort({ _id: -1 });

        // Group tasks by stage and calculate counts
        const groupedTasks = allTasks?.reduce((result, task) => {
            const stage = task.stage;

            if (!result[stage]) {
                result[stage] = 1;
            } else {
                result[stage] += 1;
            }

            return result;
        }, {});

        const graphData = Object.entries(
            allTasks?.reduce((result, task) => {
                const { priority } = task;
                result[priority] = (result[priority] || 0) + 1;
                return result;
            }, {})
        ).map(([name, total]) => ({ name, total }));

        // Calculate total tasks
        const totalTasks = allTasks.length;
        const last10Task = allTasks?.slice(0, 10);

        // Combine results into a summary object
        const summary = {
            totalTasks,
            last10Task,
            users: isAdmin ? users : [],
            tasks: groupedTasks,
            graphData,
        };

        res
            .status(200)
            .json({ status: true, ...summary, message: "Successfully." });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error.message });
    }
};

const deleteAsset = async (req, res) => {
    const { id } = req.params;
    const { assetUrl } = req.body;
    const { organizationId } = req.user;

    try {
        const task = await Task.findOne({ _id: id, organizationId });

        if (!task) {
            return res.status(404).json({ status: false, message: "Task not found." });
        }

        task.assets = task.assets.filter((url) => url !== assetUrl);
        await task.save();

        res.status(200).json({ status: true, message: "Asset deleted successfully." });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message });
    }
};

const governanceStats = async (req, res) => {
    try {
        const { organizationId } = req.user;
        const totalTasks = await Task.countDocuments({ isTrashed: false, organizationId });
        const approvedTasks = await Task.countDocuments({
            isTrashed: false,
            governanceStatus: "approved",
            organizationId
        });
        const blockedTasks = await Task.countDocuments({
            isTrashed: false,
            governanceStatus: { $in: ["pending_governance_review", "blocked"] },
            organizationId
        });

        const alignmentPercent =
            totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 100;

        res.status(200).json({
            status: true,
            totalTasks,
            approvedTasks,
            blockedTasks,
            alignmentPercent,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

const getGovernanceTasks = async (req, res) => {
    try {
        const { organizationId } = req.user;
        const tasks = await Task.find({
            isTrashed: false,
            governanceStatus: "pending_governance_review",
            organizationId
        })
            .populate({
                path: "team",
                select: "name title email",
            })
            .sort({ _id: -1 });

        res.status(200).json({
            status: true,
            tasks,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

const reviewGovernanceTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "approved" or "blocked"
        const { organizationId } = req.user;

        if (!["approved", "blocked"].includes(status)) {
            return res.status(400).json({ status: false, message: "Invalid status." });
        }

        const task = await Task.findOne({ _id: id, organizationId });
        if (!task) {
            return res.status(404).json({ status: false, message: "Task not found." });
        }

        task.governanceStatus = status;

        // If blocked, we might want to trash it or just leave it as blocked
        // For now, let's just set the status. 
        // If the admin wants to trash, they can use the trash button.

        await task.save();

        res.status(200).json({
            status: true,
            message: `Task ${status} successfully.`,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

export {
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
    reviewGovernanceTask,
    trashTask,
    updateSubTaskStage,
    updateTask,
    updateTaskStage,
};