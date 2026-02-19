import React, { useEffect, useState, useCallback, useRef } from "react";
import ImpactGraph from "../components/ImpactGraph";
import GovernanceTrinity from "../components/GovernanceTrinity";
import SimulationControl from "../components/SimulationControl";
import { MdInsights, MdSync, MdWarning, MdVerifiedUser } from "react-icons/md";
import clsx from "clsx";

const ANALYSIS_URL = "/api/impact/analysis";
const SIMULATE_URL = "/api/impact/simulate";
const LATEST_URL = "/api/impact/latest";
const GOVERNANCE_STATS_URL = "/api/task/governance-stats";
const POLL_INTERVAL = 30000; // 30 seconds

const ImpactAnalysis = () => {
    // ── Graph data (existing CPM analysis) ───────────────────────
    const [graphData, setGraphData] = useState(null);
    const [graphLoading, setGraphLoading] = useState(true);
    const [graphError, setGraphError] = useState(null);

    // ── Simulation state ─────────────────────────────────────────
    const [simResult, setSimResult] = useState(null);
    const [simLoading, setSimLoading] = useState(false);
    const [highlightIds, setHighlightIds] = useState([]);

    // ── Live data (auto-polled from cache) ───────────────────────
    const [liveData, setLiveData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [secondsAgo, setSecondsAgo] = useState(null);
    const pollRef = useRef(null);
    const tickRef = useRef(null);

    // ── Governance stats ──────────────────────────────────────────
    const [govStats, setGovStats] = useState(null);

    // ── Fetch CPM graph data on mount ────────────────────────────
    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setGraphLoading(true);
                const res = await fetch(ANALYSIS_URL, {
                    method: "GET",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                });
                const json = await res.json();
                if (!res.ok || !json.status) {
                    throw new Error(json.message || "Failed to fetch");
                }
                setGraphData(json);
            } catch (err) {
                setGraphError(err.message);
            } finally {
                setGraphLoading(false);
            }
        };
        fetchAnalysis();
    }, []);

    // ── Fetch governance stats on mount ────────────────────────────
    useEffect(() => {
        const fetchGovStats = async () => {
            try {
                const res = await fetch(GOVERNANCE_STATS_URL, {
                    method: "GET",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                });
                const json = await res.json();
                if (res.ok && json.status) {
                    setGovStats(json);
                }
            } catch {
                // Silently fail
            }
        };
        fetchGovStats();
        // Re-fetch every poll interval
        const interval = setInterval(fetchGovStats, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // ── Auto-poll /api/impact/latest every 30s ───────────────────
    const fetchLatest = useCallback(async () => {
        try {
            const res = await fetch(LATEST_URL, {
                method: "GET",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (res.ok && json.status && json.cached) {
                setLiveData(json);
                setLastUpdated(new Date(json.lastCalculatedAt));
            }
        } catch {
            // Silently fail — poll will retry
        }
    }, []);

    useEffect(() => {
        fetchLatest(); // Initial fetch
        pollRef.current = setInterval(fetchLatest, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [fetchLatest]);

    // ── "X seconds ago" ticker ───────────────────────────────────
    useEffect(() => {
        if (!lastUpdated) return;
        const tick = () => {
            setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000));
        };
        tick();
        tickRef.current = setInterval(tick, 1000);
        return () => clearInterval(tickRef.current);
    }, [lastUpdated]);

    // ── Run simulation ───────────────────────────────────────────
    const handleSimulate = useCallback(async ({ taskId, delayDays }) => {
        try {
            setSimLoading(true);
            setSimResult(null);
            setHighlightIds([]);

            const res = await fetch(SIMULATE_URL, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, delayDays }),
            });
            const json = await res.json();

            if (!res.ok || !json.status) {
                throw new Error(json.message || "Simulation failed");
            }

            setSimResult(json);
            setHighlightIds([taskId, ...(json.metrics?.affectedTaskIds || [])]);
        } catch (err) {
            console.error("Simulation error:", err);
            setSimResult({
                ai: {
                    confidenceScore: 0,
                    riskLevel: "Critical",
                    strategicAdvice: "Simulation request failed — check server connectivity.",
                    explanation: err.message,
                },
                metrics: {
                    rippleCount: 0,
                    affectedTaskIds: [],
                    impactsMilestone: false,
                    timeDebtHours: 0,
                    delayDays: delayDays,
                },
            });
        } finally {
            setSimLoading(false);
        }
    }, []);

    // ── Format seconds helper ────────────────────────────────────
    const formatAgo = (s) => {
        if (s === null) return "";
        if (s < 60) return `${s}s ago`;
        const m = Math.floor(s / 60);
        return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`;
    };

    // ── Render ────────────────────────────────────────────────────
    const { nodes, edges, criticalPath } = graphData || {};
    const atRiskCount = liveData?.atRiskTaskIds?.length || 0;

    if (graphLoading) {
        return (
            <div className="py-10 flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-400">Loading project data…</p>
                </div>
            </div>
        );
    }

    if (graphError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 mt-6">
                <strong>Error:</strong> {graphError}
            </div>
        );
    }

    return (
        <div className="h-full py-8 px-10 relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <MdInsights className="text-3xl text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-800">
                        Governance Dashboard
                    </h2>
                </div>
                {/* Live status indicator */}
                <div className="flex items-center gap-3">
                    {atRiskCount > 0 && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                            <MdWarning /> {atRiskCount} At Risk
                        </span>
                    )}
                    {lastUpdated && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <MdSync className={clsx("text-sm", liveData?.aiPending && "animate-spin")} />
                            Last updated: {formatAgo(secondsAgo)}
                        </span>
                    )}
                </div>
            </div>
            <p className="text-sm text-gray-400 mb-10">
                What-If Simulator — Confidence · Ripple Effect · Time Debt
                {liveData?.aiPending && (
                    <span className="ml-2 text-blue-500 font-medium">• AI analysis in progress…</span>
                )}
            </p>

            {/* Strategic Alignment Card */}
            <div
                className="w-full flex items-center gap-6 mb-8"
                style={{ marginBottom: "30px" }}
            >
                <div className="flex-1 bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-md shrink-0"
                        style={{
                            background:
                                (govStats?.alignmentPercent ?? 100) >= 80
                                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                                    : (govStats?.alignmentPercent ?? 100) >= 50
                                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                        : "linear-gradient(135deg, #ef4444, #dc2626)",
                        }}
                    >
                        <MdVerifiedUser />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Strategic Alignment
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-800">
                                {govStats?.alignmentPercent ?? "—"}%
                            </span>
                            <span className="text-xs text-gray-400">
                                {govStats
                                    ? `${govStats.approvedTasks} / ${govStats.totalTasks} tasks approved`
                                    : "Loading…"}
                            </span>
                        </div>
                        {govStats?.blockedTasks > 0 && (
                            <p className="text-xs text-red-500 mt-0.5">
                                {govStats.blockedTasks} task{govStats.blockedTasks > 1 ? "s" : ""} flagged for governance review
                            </p>
                        )}
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-24">
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${govStats?.alignmentPercent ?? 0}%`,
                                    background:
                                        (govStats?.alignmentPercent ?? 100) >= 80
                                            ? "#22c55e"
                                            : (govStats?.alignmentPercent ?? 100) >= 50
                                                ? "#f59e0b"
                                                : "#ef4444",
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cached AI result banner (from auto-recalc) */}
            {liveData?.aiResult?.strategicAdvice && !simResult && (
                <div
                    className="w-full bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-3"
                    style={{ marginBottom: "30px" }}
                >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-md bg-[#6366f1] shrink-0">
                        <MdInsights />
                    </div>
                    <div>
                        <p className="text-xs text-blue-600 font-semibold tracking-wide mb-0.5">LIVE AI ASSESSMENT</p>
                        <p className="text-base font-semibold text-gray-800">{liveData.aiResult.strategicAdvice}</p>
                        {liveData.aiResult.explanation && (
                            <p className="text-sm text-gray-400 mt-1">{liveData.aiResult.explanation}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                            {liveData.aiResult.confidenceScore !== null && (
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-semibold",
                                    liveData.aiResult.confidenceScore >= 80 ? "bg-green-50 text-green-600" :
                                        liveData.aiResult.confidenceScore >= 50 ? "bg-yellow-50 text-yellow-600" :
                                            "bg-red-50 text-red-600"
                                )}>
                                    Confidence: {liveData.aiResult.confidenceScore}%
                                </span>
                            )}
                            {liveData.aiResult.riskLevel && (
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-semibold",
                                    {
                                        Low: "bg-green-50 text-green-600",
                                        Medium: "bg-yellow-50 text-yellow-600",
                                        High: "bg-orange-50 text-orange-600",
                                        Critical: "bg-red-50 text-red-600",
                                    }[liveData.aiResult.riskLevel] || "bg-gray-50 text-gray-600"
                                )}>
                                    {liveData.aiResult.riskLevel} Risk
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Simulation Control */}
            <SimulationControl
                tasks={nodes || []}
                onSimulate={handleSimulate}
                loading={simLoading}
            />

            {/* Governance Trinity HUD */}
            {(simLoading || simResult) && (
                <GovernanceTrinity
                    metrics={simResult?.metrics}
                    ai={simResult?.ai}
                    loading={simLoading}
                />
            )}

            {/* D3 Dependency Graph */}
            {nodes && nodes.length > 0 ? (
                <div
                    className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100"
                    style={{ marginBottom: "50px" }}
                >
                    <h4 className="text-xl text-gray-600 font-semibold mb-4">
                        Dependency Graph
                    </h4>
                    <ImpactGraph
                        nodes={nodes}
                        edges={edges}
                        criticalPath={criticalPath}
                        highlightIds={highlightIds}
                    />
                </div>
            ) : (
                <div className="w-full bg-white p-16 rounded-xl shadow-sm border border-gray-100 text-center">
                    <MdInsights className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-base font-semibold text-gray-500">
                        No tasks found
                    </p>
                    <p className="text-sm text-gray-400">
                        Create tasks with durations and dependencies to see the
                        analysis.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ImpactAnalysis;
