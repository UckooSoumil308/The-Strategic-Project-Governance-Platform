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
    <div className="w-full h-52 bg-white/50 p-8 shadow-sm rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
        <div className="w-20 h-3 rounded bg-gray-100 animate-pulse" />
        <div className="w-28 h-3 rounded bg-gray-100 animate-pulse" />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12" style={{ gap: "40px", marginBottom: "30px" }}>

                {/* Card 1: Project Confidence */}
                <div className="w-full bg-white/50 p-8 shadow-sm rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 flex flex-col items-center" style={{ marginBottom: "20px" }}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-md bg-[#6366f1]">
                            <MdShield />
                        </div>
                        <p className="text-base text-gray-500 font-medium tracking-wide">PROJECT CONFIDENCE</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-2">
                        <ConfidenceRing score={ai.confidenceScore} />
                    </div>
                    <span className={clsx(
                        "mt-3 px-3 py-1 rounded-full text-xs font-semibold",
                        riskBadgeClass[ai.riskLevel] || "bg-gray-50 text-gray-600"
                    )}>
                        {ai.riskLevel} Risk
                    </span>
                </div>

                {/* Card 2: Ripple Effect */}
                <div
                    className={clsx(
                        "w-full bg-white/50 p-8 shadow-sm rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border flex flex-col items-center",
                        metrics.impactsMilestone
                            ? "border-red-200 ring-2 ring-red-100"
                            : "border-gray-100"
                    )}
                    style={{ marginBottom: "20px" }}
                >
                    <div className="flex items-center gap-2 mb-4">
                        <div className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-md",
                            metrics.impactsMilestone ? "bg-[#be185d]" : "bg-[#0f766e]"
                        )}>
                            <MdHub />
                        </div>
                        <p className="text-base text-gray-500 font-medium tracking-wide">RIPPLE EFFECT</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                        <span className="text-4xl font-bold text-gray-800">{metrics.rippleCount}</span>
                        <span className="text-sm text-gray-400 mt-1">Tasks Affected</span>
                    </div>
                    {metrics.impactsMilestone && (
                        <span className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 flex items-center gap-1">
                            <MdWarning /> Milestone at Risk
                        </span>
                    )}
                </div>

                {/* Card 3: Time Debt */}
                <div className="w-full bg-white/50 p-8 shadow-sm rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 flex flex-col items-center" style={{ marginBottom: "20px" }}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-md bg-[#f59e0b]">
                            <MdAccessTime />
                        </div>
                        <p className="text-base text-gray-500 font-medium tracking-wide">TIME DEBT</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                        <span className="text-4xl font-bold text-gray-800">+{metrics.timeDebtHours}</span>
                        <span className="text-sm text-gray-400 mt-1">Hours Recovery</span>
                    </div>
                    <span className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 flex items-center gap-1">
                        <MdTrendingDown /> {metrics.delayDays} day{metrics.delayDays !== 1 ? "s" : ""} delay
                    </span>
                </div>
            </div>

            {/* Strategic Advice */}
            {ai.strategicAdvice && (
                <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-blue-600 font-semibold tracking-wide mb-1">AI STRATEGIC ADVICE</p>
                    <p className="text-base font-semibold text-gray-800">{ai.strategicAdvice}</p>
                    {ai.explanation && (
                        <p className="text-sm text-gray-400 mt-2">{ai.explanation}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GovernanceTrinity;
