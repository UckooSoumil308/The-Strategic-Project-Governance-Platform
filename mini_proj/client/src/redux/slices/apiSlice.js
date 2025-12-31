import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URI = "http://localhost:3000/api";

const baseQuery = fetchBaseQuery({ baseUrl: API_URI });

export const apiSlice = createApi({
    baseQuery,
    tagTypes: [],
    endpoints: (builder) => ({}),
});
//end of apisclice