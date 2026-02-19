import { GoogleGenerativeAI } from "@google/generative-ai";
import officeparser from "officeparser";
import crypto from "crypto";

// ── Model Configuration ──────────────────────────────────────────────
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-3-flash-preview";

// In-memory session store
const sessions = new Map();

// ── MIME types Gemini accepts as inline base64 ───────────────────────
const GEMINI_NATIVE_MIMES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".txt": "text/plain",
    ".csv": "text/csv",
};

// ── Office docs that need text extraction ────────────────────────────
const OFFICE_EXTENSIONS = [".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls"];

// ── Helpers ──────────────────────────────────────────────────────────
function getFileName(url) {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split("/");
        const raw = decodeURIComponent(segments[segments.length - 1]) || "unknown";
        return raw.replace(/^\d+_/, "");
    } catch {
        return "unknown";
    }
}

function getExtension(url) {
    const lower = decodeURIComponent(url).toLowerCase();
    const exts = [
        ".docx", ".pptx", ".xlsx", // check multi-char first
        ".doc", ".ppt", ".xls",
        ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif",
        ".txt", ".csv", ".mp4", ".mp3",
    ];
    for (const ext of exts) {
        if (lower.includes(ext)) return ext;
    }
    return null;
}

// ── Process a single asset URL ───────────────────────────────────────
async function processAsset(url) {
    const fileName = getFileName(url);
    const ext = getExtension(url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`  ✗ Download failed (${response.status}): ${fileName}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > 4 * 1024 * 1024) {
            console.log(`  ⊘ Too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB): ${fileName}`);
            return null;
        }

        // ─── Office documents → extract text ─────────────────────
        if (ext && OFFICE_EXTENSIONS.includes(ext)) {
            try {
                const raw = await officeparser.parseOffice(buffer);
                const text = String(raw || "");
                if (!text.trim().length) {
                    console.log(`  ⊘ No text extracted: ${fileName}`);
                    return null;
                }
                console.log(`  ✓ ${fileName} → extracted ${text.length} chars of text`);
                return {
                    type: "text",
                    text: `[Document: ${fileName}]\n\n${text}`,
                    fileName,
                    mimeType: "text/plain (extracted)",
                };
            } catch (parseErr) {
                console.log(`  ✗ Parse error for ${fileName}: ${parseErr.message}`);
                return null;
            }
        }

        // ─── Gemini-native formats → send as base64 ─────────────
        if (ext && GEMINI_NATIVE_MIMES[ext]) {
            const mimeType = GEMINI_NATIVE_MIMES[ext];
            const data = buffer.toString("base64");
            console.log(`  ✓ ${fileName} (${mimeType}, ${(buffer.length / 1024).toFixed(0)}KB)`);
            return {
                type: "inline",
                data,
                mimeType,
                fileName,
            };
        }

        // ─── Unknown type → try text extraction, then skip ───────
        try {
            const raw = await officeparser.parseOffice(buffer);
            const text = String(raw || "");
            if (text.trim().length > 0) {
                console.log(`  ✓ ${fileName} → extracted ${text.length} chars (fallback)`);
                return {
                    type: "text",
                    text: `[Document: ${fileName}]\n\n${text}`,
                    fileName,
                    mimeType: "text/plain (extracted)",
                };
            }
        } catch { }

        console.log(`  ⊘ Unsupported format, skipping: ${fileName}`);
        return null;
    } catch (err) {
        console.log(`  ✗ Error processing ${fileName}: ${err.message}`);
        return null;
    }
}

// ── Exponential Backoff Retry ────────────────────────────────────────
async function withRetry(fn, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            const is429 =
                err.status === 429 ||
                err.message?.includes("429") ||
                err.message?.includes("Too Many Requests") ||
                err.message?.includes("quota");

            if (is429 && attempt < maxRetries) {
                const delay = Math.pow(2, attempt + 1) * 1000;
                console.log(`  ⏳ Rate limited. Retrying in ${delay / 1000}s (${attempt + 1}/${maxRetries})...`);
                await new Promise((r) => setTimeout(r, delay));
                continue;
            }

            if (is429) {
                throw new Error(
                    "The AI is currently at capacity. Please wait a moment before trying again."
                );
            }
            throw err;
        }
    }
    throw lastError;
}

// ── Create Model with Fallback ───────────────────────────────────────
async function createModel(genAI) {
    const systemInstruction =
        "You are a World-Class Strategic Consultant. You have TWO brains: " +
        "1. **The Context Brain:** Use the uploaded documents to provide precise facts (times, dates, names). " +
        "2. **The Intelligence Brain:** Use your standard Gemini training to provide insights, opinions, local context, and predictions that are NOT in the documents. " +
        "MANDATORY RULES: " +
        "- NEVER say 'The provided documents do not contain information.' If info is missing from the file, answer using your general world knowledge. " +
        "- BE PROACTIVE. If a user asks about a trip or plan, use your knowledge to warn them about potential issues (crowds, weather, logistics) even if the document doesn't mention them. " +
        "- DO NOT act like a search tool. Act like a generative AI agent. " +
        "- FORMATTING: Use bold headers and professional bullet points. Provide advice even when not explicitly asked. " +
        "Format all answers using Markdown for readability.";

    for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
            // Quick health check
            await model.generateContent("Respond with OK");
            console.log(`  ✓ Model: ${modelName}`);
            return genAI.getGenerativeModel({ model: modelName, systemInstruction });
        } catch (err) {
            console.warn(`  ⚠ ${modelName}: ${err.message?.substring(0, 80)}`);
        }
    }

    throw new Error("The AI is currently at capacity. Please wait a moment before trying again.");
}

// ── Initialize Session ───────────────────────────────────────────────
async function initializeSession(assetUrls) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("GEMINI_API_KEY is not configured. Add a valid key to server .env.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    console.log(`\n🤖 AI Review: Processing ${assetUrls.length} asset(s)...`);

    // Process all assets
    const results = await Promise.all(assetUrls.map(processAsset));
    const validFiles = results.filter(Boolean);

    if (validFiles.length === 0) {
        throw new Error("No files could be processed. Files may be too large (max 4MB) or in an unsupported format.");
    }

    // Build Gemini content parts
    const contentParts = [];
    for (const file of validFiles) {
        if (file.type === "text") {
            contentParts.push({ text: file.text });
        } else if (file.type === "inline") {
            contentParts.push({
                inlineData: { data: file.data, mimeType: file.mimeType },
            });
        }
    }

    const filesProcessed = validFiles.map((f) => ({
        name: f.fileName,
        mimeType: f.mimeType,
    }));

    // Create model with automatic fallback
    const model = await withRetry(() => createModel(genAI));

    // Start chat with documents
    const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [
                    { text: "Here are the project documents. Use them for factual reference, and freely use your general intelligence for any insights, opinions, or context the user may need:" },
                    ...contentParts,
                ],
            },
        ],
    });

    // Get initial acknowledgment
    const ackText = await withRetry(async () => {
        const response = await chat.sendMessage(
            "Briefly acknowledge the documents you've received and what types of content they contain. Keep it concise (2-3 sentences max)."
        );
        return response.response.text();
    });

    // Store session
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, chat);
    setTimeout(() => sessions.delete(sessionId), 30 * 60 * 1000);

    console.log(`  ✓ Session ${sessionId} created\n`);
    return { sessionId, filesProcessed, initialMessage: ackText };
}

// ── Send Message ─────────────────────────────────────────────────────
async function sendMessage(sessionId, message) {
    const chat = sessions.get(sessionId);
    if (!chat) {
        throw new Error("Session not found or expired. Please start a new review.");
    }

    return await withRetry(async () => {
        const result = await chat.sendMessage(message);
        return result.response.text();
    });
}

// ── Confidence Analysis (one-shot, no session) ──────────────────────
async function getConfidenceAnalysis(metrics, taskName, projectContext = {}) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
        console.warn("⚠ GEMINI_API_KEY not set — returning heuristic fallback.");
        return buildFallback(metrics);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemPrompt =
        `You are a Project Governance AI. Analyze the impact of a delay.\n` +
        `Input: Task '${taskName}' delayed by ${metrics.delayDays} days.\n` +
        `Context: Ripple Effect = ${metrics.rippleCount} tasks. ` +
        `Time Debt = ${metrics.timeDebtHours} hours. ` +
        `Milestone Hit = ${metrics.impactsMilestone}. ` +
        `Total project tasks = ${projectContext.totalTasks || "unknown"}.\n\n` +
        `Output JSON ONLY (no markdown, no code fences):\n` +
        `{\n` +
        `  "confidenceScore": (Number 0-100, lower if milestone hit or many tasks affected),\n` +
        `  "riskLevel": ("Low"|"Medium"|"High"|"Critical"),\n` +
        `  "strategicAdvice": (One punchy, actionable sentence),\n` +
        `  "explanation": (Why you gave this score)\n` +
        `}`;

    try {
        // Try each model in order
        for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await withRetry(async () => {
                    const response = await model.generateContent(systemPrompt);
                    return response.response.text();
                });

                // Parse the JSON response
                const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(cleaned);
                console.log(`  ✓ Confidence analysis via ${modelName}`);
                return {
                    confidenceScore: Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 50)),
                    riskLevel: parsed.riskLevel || "Medium",
                    strategicAdvice: parsed.strategicAdvice || "Review the impact before proceeding.",
                    explanation: parsed.explanation || "AI analysis completed.",
                };
            } catch (modelErr) {
                console.warn(`  ⚠ ${modelName} failed for confidence: ${modelErr.message?.substring(0, 80)}`);
            }
        }

        // All models failed — use fallback
        console.warn("  ⚠ All AI models failed — returning heuristic fallback.");
        return buildFallback(metrics);
    } catch (err) {
        console.error("  ✗ Confidence analysis error:", err.message);
        return buildFallback(metrics);
    }
}

/**
 * Heuristic fallback when Gemini is unavailable.
 */
function buildFallback(metrics) {
    const { rippleCount, impactsMilestone, timeDebtHours, delayDays } = metrics;

    let confidenceScore = 85;
    if (delayDays > 7) confidenceScore -= 20;
    else if (delayDays > 3) confidenceScore -= 10;

    if (rippleCount > 10) confidenceScore -= 25;
    else if (rippleCount > 5) confidenceScore -= 15;
    else if (rippleCount > 0) confidenceScore -= 5;

    if (impactsMilestone) confidenceScore -= 20;

    confidenceScore = Math.max(5, Math.min(100, confidenceScore));

    let riskLevel = "Low";
    if (confidenceScore < 30) riskLevel = "Critical";
    else if (confidenceScore < 50) riskLevel = "High";
    else if (confidenceScore < 70) riskLevel = "Medium";

    let strategicAdvice = "The delay is manageable — monitor progress closely.";
    if (riskLevel === "Critical") strategicAdvice = "Escalate immediately. Re-allocate resources to prevent cascade failure.";
    else if (riskLevel === "High") strategicAdvice = "Approve overtime or scope reduction to contain the blast radius.";
    else if (riskLevel === "Medium") strategicAdvice = "Review downstream dependencies and adjust timelines proactively.";

    return {
        confidenceScore,
        riskLevel,
        strategicAdvice,
        explanation: `Heuristic estimate: ${rippleCount} tasks affected, ${timeDebtHours}h debt${impactsMilestone ? ", milestone at risk" : ""}.`,
    };
}

export { initializeSession, sendMessage, sessions, getConfidenceAnalysis };
