import { AI_URL } from "../../../utils/contants";
import { apiSlice } from "../apiSlice";

export const aiApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        analyzeContext: builder.mutation({
            query: (data) => ({
                url: `${AI_URL}/analyze-context`,
                method: "POST",
                body: data,
                credentials: "include",
            }),
        }),

        sendAiChat: builder.mutation({
            query: (data) => ({
                url: `${AI_URL}/chat`,
                method: "POST",
                body: data,
                credentials: "include",
            }),
        }),

        generateAiSchedule: builder.mutation({
            query: (data) => ({
                // Points directly to the FastAPI Python service since Vite's default /api proxy 
                // is likely pointing to the Node.js Express server on port 8800
                url: `http://localhost:8001/api/ai/generate-schedule`,
                method: "POST",
                body: data,
                // No credentials needed currently for the local Python microservice 
            }),
        }),

        refineAiSchedule: builder.mutation({
            query: (data) => ({
                url: `http://localhost:8001/api/ai/refine-schedule`,
                method: "POST",
                body: data,
            }),
        }),
    }),
});

export const { useAnalyzeContextMutation, useSendAiChatMutation, useGenerateAiScheduleMutation, useRefineAiScheduleMutation } = aiApiSlice;
