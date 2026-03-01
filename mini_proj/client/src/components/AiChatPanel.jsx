import React, { useState, useEffect, useRef, useCallback } from "react";
import { MdClose, MdSend, MdRefresh, MdMinimize, MdSelectAll, MdGridView } from "react-icons/md";
import { FaRobot, FaUser, FaSpinner, FaFileAlt, FaFilePdf, FaFileWord, FaFilePowerpoint, FaImage, FaVideo, FaMusic } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import {
    useAnalyzeContextMutation,
    useSendAiChatMutation,
    useGenerateAiScheduleMutation,
} from "../redux/slices/api/aiApiSlice";

// ── File icon/label helpers ──────────────────────────────────────────
const getFileName = (url) => {
    try {
        const decoded = decodeURIComponent(url);
        const match = decoded.match(/\/([^/?#]+)(?:[?#]|$)/);
        return match ? match[1] : "file";
    } catch {
        return "file";
    }
};

const getFileIcon = (url) => {
    const ext = url.split(".").pop()?.toLowerCase().split("?")[0] || "";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <FaImage className="text-emerald-500" />;
    if (["mp4", "avi", "mov", "webm"].includes(ext)) return <FaVideo className="text-blue-500" />;
    if (["mp3", "wav", "ogg"].includes(ext)) return <FaMusic className="text-purple-500" />;
    if (ext === "pdf") return <FaFilePdf className="text-red-500" />;
    if (["doc", "docx"].includes(ext)) return <FaFileWord className="text-blue-600" />;
    if (["ppt", "pptx"].includes(ext)) return <FaFilePowerpoint className="text-orange-500" />;
    return <FaFileAlt className="text-gray-500" />;
};

const FILE_CONTEXT_ICONS = {
    "application/pdf": "📄",
    "image/png": "🖼️",
    "image/jpeg": "🖼️",
    "image/webp": "🖼️",
    "image/gif": "🖼️",
    "text/plain": "📝",
    "text/plain (extracted)": "📝",
};

// ── Phases ────────────────────────────────────────────────────────────
const PHASE_PICKER = "picker";
const PHASE_LOADING = "loading";
const PHASE_CHAT = "chat";
const PHASE_GANTT_START = "gantt-start";

const AiChatPanel = ({ isOpen, onClose, onMinimize, taskId, assets = [], onScheduleGenerated }) => {
    // ── Mode Toggle ──────────────────────────
    const [aiMode, setAiMode] = useState("review"); // "review" | "maker"

    // ── Shared / Review State ────────────────
    const [phase, setPhase] = useState(PHASE_PICKER);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [sessionId, setSessionId] = useState(null);
    const [filesProcessed, setFilesProcessed] = useState([]);
    const [isSending, setIsSending] = useState(false);

    // ── Gantt Maker State ────────────────────
    const [ganttPrompt, setGanttPrompt] = useState("");

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const [analyzeContext] = useAnalyzeContextMutation();
    const [sendAiChat] = useSendAiChatMutation();
    const [generateAiSchedule, { isLoading: isGeneratingSchedule }] = useGenerateAiScheduleMutation();

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when chat phase
    useEffect(() => {
        if (isOpen && phase === PHASE_CHAT && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, phase]);

    // When panel first opens with assets, pre-select all
    useEffect(() => {
        if (isOpen && assets.length > 0 && selectedFiles.length === 0 && !sessionId) {
            setSelectedFiles([...assets]);
        }
    }, [isOpen, assets]);

    // ── File picker logic ────────────────────────────────────────────
    const toggleFile = (url) => {
        setSelectedFiles((prev) =>
            prev.includes(url) ? prev.filter((f) => f !== url) : [...prev, url]
        );
    };

    const toggleAll = () => {
        setSelectedFiles((prev) =>
            prev.length === assets.length ? [] : [...assets]
        );
    };

    // ── Initialize AI session ────────────────────────────────────────
    const startReview = useCallback(async () => {
        if (selectedFiles.length === 0) return;

        setPhase(PHASE_LOADING);
        setMessages([]);
        setFilesProcessed([]);
        setSessionId(null);

        try {
            const result = await analyzeContext({
                taskId,
                selectedAssets: selectedFiles,
            }).unwrap();

            setSessionId(result.sessionId);
            setFilesProcessed(result.filesProcessed || []);

            if (result.initialMessage) {
                setMessages([{ role: "ai", content: result.initialMessage }]);
            }
            setPhase(PHASE_CHAT);
        } catch (err) {
            setMessages([
                {
                    role: "ai",
                    content: `❌ **Error initializing review:** ${err?.data?.message || err?.message || "Failed to connect to AI service."}`,
                },
            ]);
            setPhase(PHASE_CHAT);
        }
    }, [selectedFiles, taskId, analyzeContext]);

    // ── Send chat message ────────────────────────────────────────────
    const handleSend = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || !sessionId || isSending) return;

        setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
        setInputValue("");
        setIsSending(true);

        try {
            const result = await sendAiChat({ sessionId, message: trimmed }).unwrap();
            setMessages((prev) => [...prev, { role: "ai", content: result.response }]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: `❌ **Error:** ${err?.data?.message || "Failed to get response."}`,
                },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Generate AI Gantt Schedule ───────────────────────────────────
    const handleGenerateSchedule = async () => {
        if (!ganttPrompt.trim()) return;

        try {
            const result = await generateAiSchedule({ project_description: ganttPrompt }).unwrap();

            // Map the pure JSON into mock Task Database schemas for rendering 
            const baseDate = new Date();
            let rollingDateTimestamp = baseDate.getTime();

            const draftTasks = result.wbs.map((task, index) => {
                const tempId = `mock-ai-${index}`;
                // Map numeric predecessors to their assigned string IDs
                const predecessors = task.logical_predecessors.map(idx => `mock-ai-${idx}`);

                return {
                    _id: tempId,
                    title: task.title,
                    description: task.description,
                    stage: "todo",       // Default pipeline stage
                    priority: "normal",
                    duration: task.estimated_duration_days || 1,
                    predecessors: predecessors,
                    date: new Date(rollingDateTimestamp).toISOString(),
                    team: [],           // Empty team assignment
                    isAiPreview: true,   // UI hint flag
                };
            });

            // Lift state up to the Tasks.jsx container to render seamlessly!
            if (onScheduleGenerated) {
                onScheduleGenerated(draftTasks);
                onMinimize(); // Hide the panel so the user can see the magic Gantt chart
            }
        } catch (error) {
            console.error("Gantt Generation Error: ", error);
        }
    };

    // ── Refresh — back to file picker ────────────────────────────────
    const handleRefresh = () => {
        setPhase(PHASE_PICKER);
        setSessionId(null);
        setMessages([]);
        setFilesProcessed([]);
        setSelectedFiles([...assets]);
        setGanttPrompt("");
    };

    // ── Close — destroy everything ───────────────────────────────────
    const handleClose = () => {
        onClose();
        setPhase(PHASE_PICKER);
        setSessionId(null);
        setMessages([]);
        setFilesProcessed([]);
        setSelectedFiles([]);
    };

    return (
        <div style={isOpen ? undefined : { display: "none" }}>
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-gray-900/80 backdrop-blur-md transition-opacity duration-300"
                    onClick={onMinimize}
                />

                {/* Panel */}
                <div className="relative w-full max-w-3xl h-[85vh] min-h-[550px] bg-[#fdfdfd]/90 backdrop-blur-3xl shadow-[0_30px_100px_-20px_rgba(17,24,39,0.5),_0_0_0_1px_rgba(255,255,255,0.4)] flex flex-col rounded-[2.5rem] border border-white/60 overflow-hidden transform transition-all duration-300">
                    {/* ── Header ──────────────────────────────────── */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-indigo-500/20 bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
                        <div className="flex items-center gap-5 relative">
                            <div className="w-12 h-12 rounded-[1.25rem] bg-white/10 backdrop-blur-md flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] border border-white/20 relative z-10 transition-transform hover:scale-110 duration-500 hover:bg-white/20">
                                <FaRobot className="text-white drop-shadow-md" size={24} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-extrabold text-white text-[19px] tracking-wide leading-tight outline-none drop-shadow-sm">
                                    AI Co-Pilot
                                </h3>
                                <p className="text-indigo-200 text-xs mt-1 font-semibold tracking-widest uppercase opacity-80">
                                    Powered by Llama & Gemini
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 relative z-20">
                            {/* Mode Toggles */}
                            <div className="flex bg-indigo-900/50 p-1 rounded-xl border border-indigo-400/20 mr-4">
                                <button
                                    onClick={() => setAiMode("review")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${aiMode === "review" ? "bg-indigo-500/80 text-white shadow" : "text-indigo-200 hover:text-white"
                                        }`}
                                >
                                    Document Review
                                </button>
                                <button
                                    onClick={() => setAiMode("maker")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${aiMode === "maker" ? "bg-indigo-500/80 text-white shadow" : "text-indigo-200 hover:text-white"
                                        }`}
                                >
                                    Project Maker
                                </button>
                            </div>

                            {/* Refresh */}
                            {phase === PHASE_CHAT && aiMode === "review" && (
                                <button
                                    onClick={handleRefresh}
                                    title="New session"
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2.5 transition-all outline-none focus:ring-2 focus:ring-white/50"
                                >
                                    <MdRefresh size={20} />
                                </button>
                            )}
                            {/* Minimize */}
                            <button
                                onClick={onMinimize}
                                title="Minimize — keep chat alive"
                                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2.5 transition-all outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <MdMinimize size={20} />
                            </button>
                            {/* Close */}
                            <button
                                onClick={handleClose}
                                title="Close — end session"
                                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2.5 transition-all outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <MdClose size={22} />
                            </button>
                        </div>
                    </div>

                    {/* ── Mode: Maker (Gantt Schedule) ──────────────── */}
                    {aiMode === "maker" && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-50 to-white relative overflow-hidden">
                            {isGeneratingSchedule ? (
                                <div className="text-center space-y-6 max-w-sm z-10">
                                    <div className="relative w-24 h-24 mx-auto">
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                                        <FaRobot size={48} className="absolute inset-0 m-auto text-indigo-600 animate-bounce" />
                                        <svg className="absolute inset-0 w-full h-full animate-[spin_4s_linear_infinite] opacity-60 text-indigo-400" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                                        Architecting your project...
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Llama 3.2 is computing the optimal Work Breakdown Structure and calculating dependencies.
                                    </p>
                                </div>
                            ) : (
                                <div className="w-full max-w-lg space-y-6 z-10">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Generate a Timeline</h2>
                                        <p className="text-sm text-gray-500">Describe your project goal, scope, and estimated duration. The AI will instantly outline structured tasks and dependencies.</p>
                                    </div>

                                    <textarea
                                        value={ganttPrompt}
                                        onChange={(e) => setGanttPrompt(e.target.value)}
                                        placeholder="e.g., 'Build a new employee onboarding portal using React. It should take about 3 weeks and include backend setup, UI design, and strict testing phases.'"
                                        className="w-full h-36 p-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none resize-none transition-all placeholder:text-gray-400"
                                    ></textarea>

                                    <button
                                        onClick={handleGenerateSchedule}
                                        disabled={!ganttPrompt.trim()}
                                        className="relative w-full py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-indigo-600 shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <MdGridView size={18} />
                                        <span>Create Gantt Magic</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Mode: Review (File Picker Phase) ──────────── */}
                    {aiMode === "review" && phase === PHASE_PICKER && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-8 py-5 border-b border-gray-100 bg-white/40 backdrop-blur-md z-10 shadow-sm relative">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-200/50 to-transparent"></div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[13px] font-bold text-gray-800 uppercase tracking-widest">
                                        Select context files
                                    </p>
                                    <button
                                        onClick={toggleAll}
                                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                                    >
                                        <MdSelectAll size={16} />
                                        {selectedFiles.length === assets.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                                <p className="text-xs font-medium text-gray-400">
                                    {selectedFiles.length} of {assets.length} selected
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                                {assets.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <FaFileAlt size={36} className="mb-3 opacity-40" />
                                        <p className="text-sm">No assets in this task</p>
                                    </div>
                                ) : (
                                    assets.map((url, idx) => {
                                        const checked = selectedFiles.includes(url);
                                        return (
                                            <label
                                                key={idx}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${checked
                                                    ? "border-violet-300 bg-violet-50 shadow-sm"
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleFile(url)}
                                                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                                />
                                                <span className="text-lg flex-shrink-0">
                                                    {getFileIcon(url)}
                                                </span>
                                                <span className="text-sm text-gray-700 truncate flex-1">
                                                    {getFileName(url)}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>

                            {/* Start Review button */}
                            <div className="px-8 py-6 border-t border-gray-100 bg-white/60 backdrop-blur-md z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                                <button
                                    onClick={startReview}
                                    disabled={selectedFiles.length === 0}
                                    className="relative w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:shadow-[0_8px_25px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none flex items-center justify-center gap-3 overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                    <FaRobot size={18} className="relative z-10" />
                                    <span className="relative z-10 text-[15px] tracking-wide">
                                        Begin Analysis ({selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""})
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Mode: Review (Loading Phase) ──────────────── */}
                    {aiMode === "review" && phase === PHASE_LOADING && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-10">
                            <div className="relative flex items-center justify-center mt-[-40px]">
                                {/* Glowing backdrop pulse */}
                                <div className="absolute inset-0 bg-indigo-600/10 rounded-[3rem] blur-3xl animate-pulse scale-[1.5]"></div>

                                {/* Center floating dark box matching header */}
                                <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 flex items-center justify-center shadow-[0_20px_50px_rgba(49,46,129,0.3)] border border-indigo-400/30 relative z-10">
                                    <div className="relative">
                                        <FaRobot className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse" size={48} />
                                    </div>

                                    {/* Spinning Orbit Ring */}
                                    <svg className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite] opacity-60" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white" strokeDasharray="15 10" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>

                            <div className="text-center relative z-10 space-y-3">
                                <h3 className="text-[19px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-violet-800 tracking-wide">
                                    Analyzing Context...
                                </h3>
                                <p className="text-[14px] font-bold text-gray-500 max-w-[280px] mx-auto leading-relaxed">
                                    Processing <span className="text-indigo-600">{selectedFiles.length}</span> document{selectedFiles.length !== 1 ? "s" : ""} to build your AI knowledge base.
                                </p>

                                {/* Elegant animated wave dots */}
                                <div className="flex items-center justify-center gap-2.5 pt-5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0s' }}></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Mode: Review (Chat Phase) ─────────────────── */}
                    {aiMode === "review" && phase === PHASE_CHAT && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Files in Context Strip */}
                            {filesProcessed.length > 0 && (
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                        Files in Context ({filesProcessed.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {filesProcessed.map((file, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 shadow-sm"
                                                title={file.mimeType}
                                            >
                                                <span className="text-sm">
                                                    {FILE_CONTEXT_ICONS[file.mimeType] || "📎"}
                                                </span>
                                                <span className="max-w-[120px] truncate">
                                                    {file.name}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 bg-gradient-to-b from-gray-50/30 to-white/10 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.role === "ai" && (
                                            <div className="flex-shrink-0 w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center mt-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-indigo-100/50 relative">
                                                <div className="absolute -left-[5px] top-4 w-2 h-2 bg-white rotate-45 border-l border-b border-indigo-100/50"></div>
                                                <FaRobot className="text-indigo-600" size={18} />
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[80%] rounded-[1.25rem] px-6 py-5 shadow-sm ${msg.role === "user"
                                                ? "bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-br-md border border-gray-700 shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                                                : "bg-white text-gray-800 rounded-bl-md border border-gray-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                                                }`}
                                        >
                                            {msg.role === "ai" ? (
                                                <div className="prose prose-sm prose-violet max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                                                    <ReactMarkdown>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {msg.content}
                                                </p>
                                            )}
                                        </div>
                                        {msg.role === "user" && (
                                            <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-indigo-100 flex items-center justify-center mt-1 border border-indigo-200">
                                                <FaUser className="text-indigo-600" size={14} />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isSending && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center mt-1">
                                            <FaRobot className="text-violet-600" size={14} />
                                        </div>
                                        <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <FaSpinner className="animate-spin" size={12} />
                                                <span>Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="flex-shrink-0 border-t border-gray-200/60 px-8 py-6 bg-white/95 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.02)] relative z-20">
                                <div className="flex items-center gap-4 bg-gray-50/80 p-2.5 rounded-[1.5rem] border border-gray-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-300 shadow-[inset_0_2px_6px_rgba(0,0,0,0.02)]">
                                    <textarea
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={
                                            sessionId
                                                ? "Message AI Assistant..."
                                                : "Initializing AI context..."
                                        }
                                        disabled={!sessionId || isSending}
                                        rows={1}
                                        className="flex-1 px-5 py-2.5 text-[15px] outline-none bg-transparent text-gray-800 placeholder:text-gray-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-hidden max-h-32"
                                        style={{ minHeight: "24px" }}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!sessionId || isSending || !inputValue.trim()}
                                        className="w-12 h-12 rounded-[1.1rem] bg-gray-900 text-white flex items-center justify-center hover:bg-indigo-600 hover:shadow-[0_8px_20px_rgba(79,70,229,0.25)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0 group"
                                    >
                                        <MdSend size={20} className="translate-x-[1px] group-hover:scale-110 transition-transform duration-300" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiChatPanel;
