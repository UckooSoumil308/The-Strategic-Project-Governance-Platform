import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

/**
 * Generates an automated rescue plan for a failing task using Gemini 2.5 Flash.
 * If the API fails for any reason, it returns a deterministic mock plan.
 * 
 * @param {Object} failedTask - The task document from MongoDB that passed its deadline.
 * @returns {Promise<Object>} Object containing { strategicReasoning, tasks }
 */
export const generateRescuePlan = async (failedTask) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // The Fallback Object used if the API fails or the key is not configured
    const mockResponse = {
        strategicReasoning: "Based on the failure of the initial scope, it appears the root bottleneck was a lack of clear dependency mapping and under-allocated development time. To get this back on track, I am recommending we first audit the existing blockers, deploy an incremental patch to unblock downstream teams, and then perform a thorough review before merging. This staged approach reduces risk and restores Gantt chart velocity.",
        tasks: [
            { title: `Audit the bottleneck blocking "${failedTask.title}"`, duration: 1, instructions: "Review the PR comments and identify the exact dependency chain causing the failure." },
            { title: "Develop and test incremental rescue patch", duration: 2, instructions: "Write the fix locally, ensuring all critical path unit tests are passing before opening a new PR." },
            { title: "Review and merge the fix into production", duration: 1, instructions: "Request review from the Senior Architect and merge only when the staging environment confirms the fix." }
        ]
    };

    if (!GEMINI_API_KEY) {
        console.warn("[AIService] Warning: GEMINI_API_KEY is not configured in .env. Returning simulated Rescue Plan.");
        return mockResponse;
    }

    try {
        console.log(`[AIService] Requesting Gemini rescue plan for failed task: "${failedTask.title}"`);
        
        // Initialize the Gemini SDK
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        // Use the modern gemini sdk model config
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            // System instructions defining the persona
            systemInstruction: "You are a Senior Project Manager, Agile Coach, and Technical Rescue Lead. Analyze why a task failed and break it down into exactly 3 sequential recovery steps. Always reply in strict JSON.",
            generationConfig: {
                responseMimeType: "application/json",
                // Strict Output Schema Enforcement
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        strategicReasoning: {
                            type: SchemaType.STRING,
                            description: "A profound, 2-3 paragraph analysis of why the task likely failed, the underlying bottleneck, and the strategic approach to fixing it."
                        },
                        tasks: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    title: { type: SchemaType.STRING, description: "Name of the rescue step" },
                                    duration: { type: SchemaType.NUMBER, description: "Estimated days to complete, e.g., 1 or 2" },
                                    instructions: { type: SchemaType.STRING, description: "Deep technical context for the assignee..." }
                                },
                                required: ["title", "duration", "instructions"]
                            }
                        }
                    },
                    required: ["strategicReasoning", "tasks"]
                }
            }
        });

        const prompt = `Task Title: "${failedTask.title}"
Task Description: "${failedTask.description || 'No description provided.'}"

Please analyze why this task likely failed and provide profound strategic advice on how to fix the bottleneck. 
Then, break this failed task down into exactly 3 smaller, sequential "Rescue Tasks" to get the project back on track.`;

        const result = await model.generateContent(prompt);
        const content = result.response.text();
        const parsedNode = JSON.parse(content);

        // Sanity Check on the returned structured JSON
        if (parsedNode && parsedNode.strategicReasoning && parsedNode.tasks && Array.isArray(parsedNode.tasks)) {
            console.log(`[AIService] Successfully generated ${parsedNode.tasks.length} rescue tasks with strategic reasoning via Gemini 2.5 Flash.`);
            return parsedNode;
        }

        throw new Error("Gemini returned invalid JSON schema.");
    } catch (error) {
        console.error("[AIService] API Request Failed! Catching gracefully and returning mock response. Error Details:", error.message);
        // Fallback to strict mock object when API limits max out or crashes
        return mockResponse;
    }
};
