import { apiSlice } from "../apiSlice";

const IMPACT_URL = "/impact";

export const impactApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getImpactAnalysis: builder.query({
            query: () => ({
                url: `${IMPACT_URL}/analysis`,
                method: "GET",
                credentials: "include",
            }),
        }),
    }),
});

export const { useGetImpactAnalysisQuery } = impactApiSlice;
