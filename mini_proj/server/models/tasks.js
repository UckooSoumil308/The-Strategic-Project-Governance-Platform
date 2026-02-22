import mongoose, { Schema } from "mongoose";

// ── Impact-relevant fields (trigger recalc when these change) ────
const IMPACT_FIELDS = ["stage", "date", "duration", "dependencies", "isTrashed"];

const taskSchema = new Schema(
    {
        title: { type: String, required: true },
        date: { type: Date, default: new Date() },
        priority: {
            type: String,
            default: "normal",
            enum: ["high", "medium", "normal", "low"],
        },
        stage: {
            type: String,
            default: "todo",
            enum: ["todo", "in progress", "completed"],
        },
        activities: [
            {
                type: {
                    type: String,
                    default: "assigned",
                    enum: [
                        "assigned",
                        "started",
                        "in progress",
                        "bug",
                        "completed",
                        "commented",
                    ],
                },
                activity: String,
                date: { type: Date, default: new Date() },
                by: { type: Schema.Types.ObjectId, ref: "User" },
            },
        ],
        subTasks: [
            {
                title: String,
                date: Date,
                tag: String,
                isCompleted: Boolean,
            },
        ],
        description: String,
        assets: [String],
        links: [String],
        team: [{ type: Schema.Types.ObjectId, ref: "User" }],
        isTrashed: { type: Boolean, default: false },
        duration: { type: Number, default: 1 },
        dependencies: [{ type: Schema.Types.ObjectId, ref: "Task" }],
        costPerDay: { type: Number, default: 0 },
        governanceStatus: {
            type: String,
            default: "approved",
            enum: ["approved", "pending_governance_review", "blocked"],
        },
        governanceReason: { type: String, default: "" },
        organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    },
    { timestamps: true }
);

// ══════════════════════════════════════════════════════════════════
//  Mongoose Middleware — Reactive Impact Recalculation
// ══════════════════════════════════════════════════════════════════

/**
 * pre('save') — set a flag if impact-relevant fields were changed.
 * Uses async (Mongoose 9 pattern — no next() callback).
 */
taskSchema.pre("save", async function () {
    try {
        if (!this.$locals) this.$locals = {};
        this.$locals._wasImpactModified =
            this.isNew || IMPACT_FIELDS.some((field) => this.isModified(field));
    } catch (e) {
        // Never block save
    }
});

/**
 * post('save') — fires after `task.save()` calls.
 * Wrapped in try-catch so it NEVER causes a 400 response.
 */
taskSchema.post("save", function (doc) {
    try {
        if (doc?.$locals?._wasImpactModified) {
            triggerRecalc("save", doc.title);
        }
    } catch (e) {
        // Never let hook errors propagate
    }
});

/**
 * post('findOneAndUpdate') — fires after findOneAndUpdate operations.
 * Checks the $set payload for impact-relevant fields.
 */
taskSchema.post("findOneAndUpdate", function () {
    const update = this.getUpdate();
    const setFields = update?.$set || update || {};

    const impactChanged = IMPACT_FIELDS.some((field) => field in setFields);
    // Also check $push on dependencies
    const depsPushed = update?.$push?.dependencies !== undefined;

    if (impactChanged || depsPushed) {
        triggerRecalc("findOneAndUpdate");
    }
});

/**
 * post('findOneAndDelete') — fires after a task is permanently deleted.
 */
taskSchema.post("findOneAndDelete", function () {
    triggerRecalc("findOneAndDelete");
});

// ── Trigger helper (lazy-loads ImpactService to avoid circular imports) ──
function triggerRecalc(source, taskTitle) {
    setImmediate(async () => {
        try {
            // Dynamic import to avoid circular dependency with ImpactService
            const { recalculateProject } = await import(
                "../utils/ImpactService.js"
            );
            console.log(
                `[TaskHook] Impact-relevant change detected (${source}${taskTitle ? `: "${taskTitle}"` : ""
                }). Triggering recalculation…`
            );
            recalculateProject();
        } catch (err) {
            console.error("[TaskHook] Failed to trigger recalc:", err.message);
        }
    });
}

const Task = mongoose.model("Task", taskSchema);

export default Task;