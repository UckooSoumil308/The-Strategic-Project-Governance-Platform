import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URL = import.meta.env.VITE_APP_BASE_URL + "/api";
//const API_URI = "http://localhost:3000/api";
const baseQuery = fetchBaseQuery({ baseUrl: API_URL });

export const apiSlice = createApi({
    baseQuery,
    tagTypes: ["Team", "Tasks"],
    endpoints: (builder) => ({}),
});
//end of apisclice