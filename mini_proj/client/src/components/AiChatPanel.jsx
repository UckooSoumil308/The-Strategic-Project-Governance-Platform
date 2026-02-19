import React, { useState, useEffect, useRef, useCallback } from "react";
import { MdClose, MdSend, MdRefresh, MdMinimize, MdSelectAll } from "react-icons/md";
import { FaRobot, FaUser, FaSpinner, FaFileAlt, FaFilePdf, FaFileWord, FaFilePowerpoint, FaImage, FaVideo, FaMusic } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import {
    useAnalyzeContextMutation,
    useSendAiChatMutation,
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

const AiChatPanel = ({ isOpen, onClose, onMinimize, taskId, assets = [] }) => {
    const [phase, setPhase] = useState(PHASE_PICKER);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [sessionId, setSessionId] = useState(null);
    const [filesProcessed, setFilesProcessed] = useState([]);
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const [analyzeContext] = useAnalyzeContextMutation();
    const [sendAiChat] = useSendAiChatMutation();

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

    // ── Refresh — back to file picker ────────────────────────────────
    const handleRefresh = () => {
        setPhase(PHASE_PICKER);
        setSessionId(null);
        setMessages([]);
        setFilesProcessed([]);
        setSelectedFiles([...assets]);
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
            <div className="fixed inset-0 z-[90] flex justify-end">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onMinimize}
                />

                {/* Panel */}
                <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
                    {/* ── Header ──────────────────────────────────── */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-600 to-indigo-600">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                <FaRobot className="text-white" size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg leading-tight">
                                    AI Document Review
                                </h3>
                                <p className="text-violet-200 text-xs">
                                    Powered by Gemini AI
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Refresh */}
                            {phase === PHASE_CHAT && (
                                <button
                                    onClick={handleRefresh}
                                    title="New session"
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
                                >
                                    <MdRefresh size={20} />
                                </button>
                            )}
                            {/* Minimize */}
                            <button
                                onClick={onMinimize}
                                title="Minimize — keep chat alive"
                                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
                            >
                                <MdMinimize size={20} />
                            </button>
                            {/* Close */}
                            <button
                                onClick={handleClose}
                                title="Close — end session"
                                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
                            >
                                <MdClose size={22} />
                            </button>
                        </div>
                    </div>

                    {/* ── Phase: File Picker ──────────────────────── */}
                    {phase === PHASE_PICKER && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-semibold text-gray-700">
                                        Select files to review
                                    </p>
                                    <button
                                        onClick={toggleAll}
                                        className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
                                    >
                                        <MdSelectAll size={16} />
                                        {selectedFiles.length === assets.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400">
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
                            <div className="px-5 py-4 border-t border-gray-200 bg-white">
                                <button
                                    onClick={startReview}
                                    disabled={selectedFiles.length === 0}
                                    className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-300 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    <FaRobot size={16} />
                                    Start Review ({selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Phase: Loading ──────────────────────────── */}
                    {phase === PHASE_LOADING && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                                    <FaRobot className="text-violet-600 animate-pulse" size={28} />
                                </div>
                                <FaSpinner
                                    className="absolute -bottom-1 -right-1 text-violet-500 animate-spin"
                                    size={18}
                                />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-gray-700">
                                    Analyzing {selectedFiles.length} document{selectedFiles.length !== 1 ? "s" : ""}...
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Downloading and processing your files
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Phase: Chat ─────────────────────────────── */}
                    {phase === PHASE_CHAT && (
                        <>
                            {/* Files in Context Strip */}
                            {filesProcessed.length > 0 && (
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
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
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.role === "ai" && (
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center mt-1">
                                                <FaRobot className="text-violet-600" size={14} />
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                                ? "bg-violet-600 text-white rounded-br-md"
                                                : "bg-gray-100 text-gray-800 rounded-bl-md"
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
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center mt-1">
                                                <FaUser className="text-white" size={12} />
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
                            <div className="border-t border-gray-200 px-4 py-3 bg-white">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={
                                            sessionId
                                                ? "Ask about your documents..."
                                                : "Initializing..."
                                        }
                                        disabled={!sessionId || isSending}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!sessionId || isSending || !inputValue.trim()}
                                        className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                        <MdSend size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiChatPanel;
