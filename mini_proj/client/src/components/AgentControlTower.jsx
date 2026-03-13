import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import ReactMarkdown from 'react-markdown';

const AgentControlTower = () => {
    const [input, setInput] = useState(() => {
        return sessionStorage.getItem("agent_input") || "";
    });

    const [messages, setMessages] = useState(() => {
        const savedMessages = sessionStorage.getItem("agent_messages");
        return savedMessages ? JSON.parse(savedMessages) : [
            {
                sender: "agent",
                text: "Agent Control Tower active. Enter a command to trigger an n8n workflow...",
            },
        ];
    });

    // Generate and persist a stable sessionId for the n8n Simple Memory Node
    const [sessionId] = useState(() => {
        const savedSession = sessionStorage.getItem("agent_session_id");
        if (savedSession) return savedSession;
        const newSession = crypto.randomUUID();
        sessionStorage.setItem("agent_session_id", newSession);
        return newSession;
    });

    const [isLoading, setIsLoading] = useState(false);

    const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
        const savedWidth = sessionStorage.getItem("agent_panel_width");
        return savedWidth ? parseFloat(savedWidth) : 50;
    });
    const [isDragging, setIsDragging] = useState(false);
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);

    // Get currently logged-in user to send along with commands if needed, or to get auth token
    const { user } = useSelector((state) => state.auth);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        // Save messages to session storage whenever they change
        sessionStorage.setItem("agent_messages", JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        // Save input text
        sessionStorage.setItem("agent_input", input);
    }, [input]);

    useEffect(() => {
        // Save panel width
        sessionStorage.setItem("agent_panel_width", leftPanelWidth.toString());
    }, [leftPanelWidth]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput("");

        // 1. Append user message to chat history
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
        setIsLoading(true);

        try {
            // 2. Exact n8n Webhook Contract POST
            const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
            if (!n8nWebhookUrl) {
                throw new Error("VITE_N8N_WEBHOOK_URL is missing in frontend .env");
            }

            const response = await fetch(n8nWebhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    message: userMessage,
                }),
            });

            // Handle non-200 from Webhook specifically
            if (!response.ok) {
                if (response.status === 502 || response.status === 504 || response.status === 404) {
                     throw new Error("n8n Test Mode inactive: Please click 'Execute Workflow' in your n8n canvas before sending a message.");
                }
                throw new Error(`n8n Webhook Error: ${response.status} ${response.statusText}`);
            }

            // 3. Strict schema parsing: { reply: "..." }
            // Handle n8n configurations that might return plain text or empty bodies instead of strict JSON
            const textResponse = await response.text();
            let data;
            try {
                // Try to parse it as JSON first
                data = textResponse ? JSON.parse(textResponse) : { reply: "Webhook triggered successfully (No response body)." };
            } catch (jsonParseError) {
                // If n8n returns plain text, wrap it manually so the UI doesn't crash
                data = { reply: textResponse };
            }

            setMessages((prev) => [
                ...prev,
                { sender: "agent", text: data.reply || "Action completed silently, or n8n returned no 'reply' key." },
            ]);
        } catch (error) {
            // Check if it's a generic TypeError indicating the fetch couldn't connect at all (e.g. n8n is down or test webhook sleeping)
            const isConnectionError = error.name === 'TypeError' && error.message.includes('Failed to fetch');
            
            const errorMessage = isConnectionError 
                ? "⚠️ n8n Test Mode inactive: Please click 'Execute Workflow' in your n8n canvas before sending a message." 
                : (error.message.includes('n8n Test Mode inactive') ? error.message : `⚠️ Connection to Control Tower lost: ${error.message}`);

            setMessages((prev) => [
                ...prev,
                { sender: "agent", text: errorMessage },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // Resizing Logic
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);

        const handleMouseMove = (moveEvent) => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            let newWidth = ((moveEvent.clientX - containerRect.left) / containerRect.width) * 100;
            // Constrain width between 20% and 80%
            newWidth = Math.max(20, Math.min(newWidth, 80));
            setLeftPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col md:flex-row gap-0 p-4 bg-gray-100 min-h-screen relative">

            {/* LEFT: Agent Chat Console */}
            <div
                className="bg-white rounded-lg shadow-lg flex flex-col overflow-hidden border border-gray-200"
                style={{ width: `calc(${leftPanelWidth}% - 8px)` }}
            >
                <div className="bg-blue-600 text-white p-4 font-bold text-lg flex justify-between items-center">
                    <span>Agent Control Tower</span>
                    <span className="text-xs bg-blue-500 px-2 py-1 rounded">Interactive</span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3 min-h-[400px]">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`max-w-[85%] p-3 rounded-xl text-sm prose prose-sm ${msg.sender === "user"
                                ? "bg-blue-600 text-white self-end rounded-br-none prose-invert"
                                : "bg-white border border-gray-200 text-gray-800 shadow-sm self-start rounded-bl-none"
                                }`}
                        >
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                    ))}
                    
                    {/* Sleek n8n Loading State */}
                    {isLoading && (
                        <div className="bg-white border border-gray-200 text-gray-800 shadow-sm self-start p-3 rounded-xl rounded-bl-none flex items-center space-x-2 w-max">
                            <span className="text-sm font-medium text-slate-500 mr-2">n8n Executing</span>
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-3 bg-white border-t border-gray-200 flex gap-2"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a natural language command (e.g. 'Email the latest report to marketing')"
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                    >
                        Send
                    </button>
                </form>
            </div>

            {/* DRAGGABLE SEPARATOR */}
            <div
                className="hidden md:flex flex-col justify-center items-center w-4 mx-2 cursor-col-resize hover:bg-gray-200 transition-colors rounded"
                onMouseDown={handleMouseDown}
                title="Drag to resize"
            >
                <div className="w-1 h-8 border-l border-r border-gray-400 opacity-50"></div>
            </div>

            {/* RIGHT: n8n Execution Glass Box */}
            <div
                className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 min-h-[500px] flex flex-col relative"
                style={{ width: `calc(${100 - leftPanelWidth}% - 8px)` }}
            >
                {/* Pointer events overlay while dragging to prevent iframe swallowing mouse events */}
                {isDragging && (
                    <div className="absolute inset-0 z-10 cursor-col-resize"></div>
                )}
                <div className="bg-gray-800 text-white p-4 font-bold text-lg flex justify-between items-center">
                    <span>n8n Execution Canvas (Glass Box)</span>
                    <span className="text-xs bg-green-500 px-2 py-1 rounded font-mono">LIVE</span>
                </div>
                <div className="flex-1 w-full bg-gray-100">
                    <iframe
                        title="n8n Executions"
                        src="http://localhost:5678/executions"
                        className="w-full h-full border-none"
                    />
                </div>
            </div>

        </div>
    );
};

export default AgentControlTower;
