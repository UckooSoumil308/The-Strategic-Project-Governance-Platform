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
    }),
});

export const { useAnalyzeContextMutation, useSendAiChatMutation } = aiApiSlice;
