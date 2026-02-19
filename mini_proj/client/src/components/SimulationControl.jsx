import React, { useState, useCallback } from "react";
import { MdTune, MdPlayArrow } from "react-icons/md";
import clsx from "clsx";

const SimulationControl = ({ tasks, onSimulate, loading }) => {
    const [selectedTask, setSelectedTask] = useState("");
    const [delayDays, setDelayDays] = useState(0);

    const handleSimulate = useCallback(() => {
        if (!selectedTask || delayDays < 1) return;
        onSimulate({ taskId: selectedTask, delayDays });
    }, [selectedTask, delayDays, onSimulate]);

    return (
        <div
            className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100"
            style={{ marginBottom: "40px" }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-md bg-[#1d4ed8]">
                    <MdTune />
                </div>
                <div>
                    <h4 className="text-lg text-gray-800 font-semibold">What-If Simulator</h4>
                    <p className="text-xs text-gray-400">Select a task and simulate a delay to see project-wide impact</p>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col md:flex-row items-end gap-6">
                {/* Task Selector */}
                <div className="flex-1 w-full">
                    <label className="block text-sm text-gray-500 font-medium mb-1.5">Target Task</label>
                    <select
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
                        value={selectedTask}
                        onChange={(e) => setSelectedTask(e.target.value)}
                    >
                        <option value="">— Choose a task —</option>
                        {(tasks || []).map((t) => (
                            <option key={t.id || t._id} value={t.id || t._id}>
                                {t.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Delay Slider */}
                <div className="flex-[2] w-full">
                    <label className="block text-sm text-gray-500 font-medium mb-1.5">
                        Simulate Delay
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="30"
                            step="1"
                            value={delayDays}
                            onChange={(e) => setDelayDays(Number(e.target.value))}
                            onMouseUp={handleSimulate}
                            onTouchEnd={handleSimulate}
                            className="sim-range flex-1"
                        />
                        <span
                            className={clsx(
                                "text-sm font-bold px-3 py-1.5 rounded-lg border min-w-[70px] text-center",
                                delayDays <= 5
                                    ? "border-green-200 text-green-600 bg-green-50"
                                    : delayDays <= 14
                                        ? "border-yellow-200 text-yellow-600 bg-yellow-50"
                                        : "border-red-200 text-red-600 bg-red-50"
                            )}
                        >
                            {delayDays} {delayDays === 1 ? "Day" : "Days"}
                        </span>
                    </div>
                </div>

                {/* Run Button */}
                <button
                    className={clsx(
                        "flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold shadow-md transition-all duration-200",
                        loading || !selectedTask || delayDays < 1
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5"
                    )}
                    onClick={handleSimulate}
                    disabled={loading || !selectedTask || delayDays < 1}
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyzing…
                        </>
                    ) : (
                        <>
                            <MdPlayArrow className="text-lg" />
                            Run Simulation
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SimulationControl;
