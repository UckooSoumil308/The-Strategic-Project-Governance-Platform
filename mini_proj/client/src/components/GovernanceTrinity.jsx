import React from "react";
import clsx from "clsx";
import {
    MdShield,
    MdHub,
    MdAccessTime,
    MdTrendingDown,
    MdWarning,
} from "react-icons/md";

/* ──────────────────── Circular Progress Ring ──────────────────── */
const ConfidenceRing = ({ score, size = 110, stroke = 10 }) => {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color =
        score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

    return (
        <svg width={size} height={size} className="drop-shadow-sm">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={stroke}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
            />
            <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize="26"
                fontWeight="800"
            >
                {score}
            </text>
        </svg>
    );
};

/* ──────────────────── Skeleton Card ──────────────────── */
const SkeletonCard = () => (
    <div className="w-full h-52 bg-white/40 backdrop-blur-md p-8 shadow-sm rounded-2xl border border-white/60 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-200/50 animate-pulse" />
        <div className="w-20 h-3 rounded-full bg-gray-200/50 animate-pulse" />
        <div className="w-28 h-3 rounded-full bg-gray-200/50 animate-pulse" />
    </div>
);

/* ──────────────────── Main Component ──────────────────── */
const GovernanceTrinity = ({ metrics, ai, loading }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-10" style={{ gap: "40px", marginBottom: "50px" }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    if (!metrics || !ai) return null;

    const riskBadgeClass = {
        Low: "bg-green-50 text-green-600",
        Medium: "bg-yellow-50 text-yellow-600",
        High: "bg-orange-50 text-orange-600",
        Critical: "bg-red-50 text-red-600",
    };

    return (
        <div style={{ marginBottom: "50px" }}>
            {/* Three Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

                {/* Card 1: Project Confidence */}
                <div className="w-full bg-white/60 backdrop-blur-lg p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl transition-all duration-300 transform hover:-translate-y-1 border border-white/80 flex flex-col items-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 text-2xl bg-indigo-50 shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform duration-300">
                            <MdShield />
                        </div>
                        <p className="text-sm text-gray-500 font-bold tracking-widest uppercase">Project Confidence</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-2">
                        <ConfidenceRing score={ai.confidenceScore} />
                    </div>
                    <span className={clsx(
                        "mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
                        riskBadgeClass[ai.riskLevel] || "bg-gray-50 text-gray-600"
                    )}>
                        {ai.riskLevel} Risk
                    </span>
                </div>

                {/* Card 2: Ripple Effect */}
                <div
                    className={clsx(
                        "w-full bg-white/60 backdrop-blur-lg p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl transition-all duration-300 transform hover:-translate-y-1 border flex flex-col items-center relative overflow-hidden group",
                        metrics.impactsMilestone
                            ? "border-rose-200 shadow-[0_0_15px_rgba(225,29,72,0.15)]"
                            : "border-white/80"
                    )}
                >
                    <div className={clsx(
                        "absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                        metrics.impactsMilestone ? "bg-gradient-to-r from-rose-500 to-pink-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"
                    )}></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={clsx(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border group-hover:scale-110 transition-transform duration-300",
                            metrics.impactsMilestone ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                            <MdHub />
                        </div>
                        <p className="text-sm text-gray-500 font-bold tracking-widest uppercase">Ripple Effect</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                        <span className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-gray-800 to-gray-500">{metrics.rippleCount}</span>
                        <span className="text-sm font-medium text-gray-400 mt-2 uppercase tracking-wide">Tasks Affected</span>
                    </div>
                    {metrics.impactsMilestone && (
                        <span className="mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-1.5 shadow-sm">
                            <MdWarning className="text-sm" /> Milestone at Risk
                        </span>
                    )}
                </div>

                {/* Card 3: Time Debt */}
                <div className="w-full bg-white/60 backdrop-blur-lg p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl transition-all duration-300 transform hover:-translate-y-1 border border-white/80 flex flex-col items-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-amber-500 text-2xl bg-amber-50 shadow-sm border border-amber-100 group-hover:scale-110 transition-transform duration-300">
                            <MdAccessTime />
                        </div>
                        <p className="text-sm text-gray-500 font-bold tracking-widest uppercase">Time Debt</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                        <span className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-gray-800 to-gray-500">+{metrics.timeDebtHours}</span>
                        <span className="text-sm font-medium text-gray-400 mt-2 uppercase tracking-wide">Hours Recovery</span>
                    </div>
                    <span className="mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5 shadow-sm">
                        <MdTrendingDown className="text-sm" /> {metrics.delayDays} day{metrics.delayDays !== 1 ? "s" : ""} delay
                    </span>
                </div>
            </div>

            {/* Strategic Advice */}
            {ai.strategicAdvice && (
                <div className="w-full bg-gradient-to-br from-indigo-50/50 to-purple-50/50 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-indigo-100/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        AI Strategic Insight
                    </p>
                    <p className="text-lg font-medium text-gray-800 leading-relaxed">{ai.strategicAdvice}</p>
                    {ai.explanation && (
                        <p className="text-sm text-gray-500 mt-3 leading-relaxed border-t border-indigo-100/50 pt-3">{ai.explanation}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GovernanceTrinity;
