import React, { useState } from "react";
import { AiOutlineClose, AiOutlineSend } from "react-icons/ai";
import { MdOutlineExpandMore, MdOutlineExpandLess } from "react-icons/md";
import { useRefineAiScheduleMutation } from "../redux/slices/api/aiApiSlice";
import { toast } from "sonner";
import Button from "./Button";
import Loading from "./Loader";

const AiGovernanceSandbox = ({ draftTasks, onSave, onDiscard }) => {
    const [localTasks, setLocalTasks] = useState(draftTasks);
    const [prompt, setPrompt] = useState("");
    const [expandedTasks, setExpandedTasks] = useState({});
    const [refineAiSchedule, { isLoading }] = useRefineAiScheduleMutation();

    const toggleExpand = (index) => {
        setExpandedTasks((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const handleTaskChange = (index, field, value) => {
        const updatedTasks = [...localTasks];
        updatedTasks[index] = { ...updatedTasks[index], [field]: value };
        setLocalTasks(updatedTasks);
    };

    const handleSubtaskChange = (taskIndex, subtaskIndex, field, value) => {
        const updatedTasks = [...localTasks];
        const updatedSubtasks = [...updatedTasks[taskIndex].subtasks];
        updatedSubtasks[subtaskIndex] = { ...updatedSubtasks[subtaskIndex], [field]: value };
        updatedTasks[taskIndex].subtasks = updatedSubtasks;
        setLocalTasks(updatedTasks);
    };

    const handleRefine = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        try {
            const data = await refineAiSchedule({
                current_schedule: localTasks,
                user_instructions: prompt,
            }).unwrap();
            setLocalTasks(data.wbs || data);
            setPrompt("");
            toast.success("Schedule refined successfully.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to refine schedule. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50">
                    <div>
                        <h2 className="text-2xl font-bold text-indigo-900">AI Governance Sandbox</h2>
                        <p className="text-sm text-indigo-600">Review, edit, and refine the AI-generated schedule before saving.</p>
                    </div>
                    <button onClick={onDiscard} className="text-gray-500 hover:text-red-500 transition-colors">
                        <AiOutlineClose size={24} />
                    </button>
                </div>

                {/* Content - Task List */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loading />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {localTasks.map((task, index) => (
                                <div key={index} className="bg-white border text-left border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                        <button
                                            onClick={() => toggleExpand(index)}
                                            className="mt-1 text-gray-500 hover:text-indigo-600 transition-colors"
                                        >
                                            {expandedTasks[index] ? <MdOutlineExpandLess size={24} /> : <MdOutlineExpandMore size={24} />}
                                        </button>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="md:col-span-8 space-y-2">
                                                <input
                                                    type="text"
                                                    value={task.title}
                                                    onChange={(e) => handleTaskChange(index, "title", e.target.value)}
                                                    className="w-full font-semibold text-lg text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1"
                                                    placeholder="Task Title"
                                                />
                                                <p className="text-sm text-gray-600 px-1">{task.description}</p>
                                            </div>
                                            <div className="md:col-span-4 flex items-center gap-4 justify-end">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm font-medium text-gray-600">Duration (days):</label>
                                                    <input
                                                        type="number"
                                                        value={task.estimated_duration_days || task.duration || 1}
                                                        onChange={(e) => handleTaskChange(index, "estimated_duration_days", parseInt(e.target.value))}
                                                        className="w-16 p-1 text-center border border-gray-300 rounded focus:border-indigo-500 focus:outline-none"
                                                        min="1"
                                                    />
                                                </div>
                                                {task.is_milestone && (
                                                    <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                                                        Milestone
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subtasks */}
                                    {expandedTasks[index] && task.subtasks && task.subtasks.length > 0 && (
                                        <div className="bg-gray-50 border-t border-gray-100 p-4 pl-14">
                                            <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Subtasks</h4>
                                            <div className="space-y-2">
                                                {task.subtasks.map((subtask, subIndex) => (
                                                    <div key={subIndex} className="flex items-center gap-4 bg-white p-2 rounded border border-gray-200 shadow-sm">
                                                        <input
                                                            type="text"
                                                            value={subtask.title}
                                                            onChange={(e) => handleSubtaskChange(index, subIndex, "title", e.target.value)}
                                                            className="flex-1 text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1"
                                                            placeholder="Subtask Title"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs text-gray-500">Hours:</label>
                                                            <input
                                                                type="number"
                                                                value={subtask.estimated_hours || 1}
                                                                onChange={(e) => handleSubtaskChange(index, subIndex, "estimated_hours", parseInt(e.target.value))}
                                                                className="w-16 p-1 text-xs text-center border border-gray-300 rounded focus:border-indigo-500 focus:outline-none"
                                                                min="1"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Chat & Actions */}
                <div className="p-4 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="flex gap-4">
                        <form onSubmit={handleRefine} className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="E.g., Make the design phase shorter, or add a testing milestone..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !prompt.trim()}
                                className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                            >
                                <AiOutlineSend size={18} />
                                Refine
                            </button>
                        </form>
                        <div className="w-px bg-gray-200 mx-2"></div>
                        <Button
                            onClick={() => onSave(localTasks)}
                            label="Approve & Save"
                            className="bg-indigo-600 text-white rounded-xl px-8 py-2 font-semibold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiGovernanceSandbox;
