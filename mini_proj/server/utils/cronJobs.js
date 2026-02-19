/**
 * Cron Jobs — Proactive Impact Analysis Layer
 *
 * Runs on a schedule to detect passive slippages (tasks that have
 * become overdue without any user action).
 */

import cron from "node-cron";
import { scanForSlippages } from "./ImpactService.js";

/**
 * Initialize all cron jobs.
 * Call this once after the database connection is established.
 */
export function startCronJobs() {
    // ── Every hour: scan for overdue tasks ───────────────────────
    cron.schedule("0 * * * *", async () => {
        const timestamp = new Date().toISOString();
        console.log(`[Cron] ${timestamp} — Running slippage scan…`);

        try {
            const result = await scanForSlippages();
            console.log(`[Cron] Scan complete. Flagged: ${result.flagged}`);
        } catch (err) {
            console.error("[Cron] Slippage scan error:", err.message);
        }
    });

    console.log("[Cron] Impact cron jobs started (hourly slippage scan).");
}
