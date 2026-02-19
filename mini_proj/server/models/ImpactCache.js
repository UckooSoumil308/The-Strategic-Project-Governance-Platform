import mongoose, { Schema } from "mongoose";

/**
 * ImpactCache — Stores the latest pre-computed CPM snapshot + AI result.
 * Only one document exists (singleton), upserted on every recalculation.
 */
const impactCacheSchema = new Schema(
    {
        // Full CPM snapshot
        cpmSnapshot: {
            nodes: { type: Schema.Types.Mixed, default: [] },
            edges: { type: Schema.Types.Mixed, default: [] },
            criticalPath: [String],
            projectDuration: { type: Number, default: 0 },
            totalImpactScore: { type: Number, default: 0 },
        },

        // Tasks flagged as overdue by the cron scanner
        atRiskTaskIds: [{ type: Schema.Types.ObjectId, ref: "Task" }],

        // When the deterministic metrics were last computed
        lastCalculatedAt: { type: Date, default: Date.now },

        // Async AI analysis state
        aiPending: { type: Boolean, default: false },
        aiResult: {
            confidenceScore: { type: Number, default: null },
            riskLevel: { type: String, default: null },
            strategicAdvice: { type: String, default: null },
            explanation: { type: String, default: null },
        },
    },
    { timestamps: true }
);

const ImpactCache = mongoose.model("ImpactCache", impactCacheSchema);

export default ImpactCache;
