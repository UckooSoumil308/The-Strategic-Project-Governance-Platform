import { TASKS_URL } from "../../../utils/contants";
import { apiSlice } from "../apiSlice";

export const postApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        createTask: builder.mutation({
            query: (data) => ({
                url: `${TASKS_URL}/create`,
                method: "POST",
                body: data,
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        duplicateTask: builder.mutation({
            query: (id) => ({
                url: `${TASKS_URL}/duplicate/${id}`,
                method: "POST",
                body: {},
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        updateTask: builder.mutation({
            query: (data) => ({
                url: `${TASKS_URL}/update/${data._id}`,
                method: "PUT",
                body: data,
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        getAllTask: builder.query({
            query: ({ strQuery, isTrashed, search }) => ({
                url: `${TASKS_URL}?stage=${strQuery}&isTrashed=${isTrashed}&search=${search}`,
                method: "GET",
                credentials: "include",
            }),
            providesTags: ["Tasks"],
        }),

        getSingleTask: builder.query({
            query: (id) => ({
                url: `${TASKS_URL}/${id}`,
                method: "GET",
                credentials: "include",
            }),
        }),

        createSubTask: builder.mutation({
            query: ({ data, id }) => ({
                url: `${TASKS_URL}/create-subtask/${id}`,
                method: "PUT",
                body: data,
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        postTaskActivity: builder.mutation({
            query: ({ data, id }) => ({
                url: `${TASKS_URL}/activity/${id}`,
                method: "POST",
                body: data,
                credentials: "include",
            }),
        }),

        trashTast: builder.mutation({
            query: ({ id }) => ({
                url: `${TASKS_URL}/${id}`,
                method: "PUT",
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        deleteRestoreTast: builder.mutation({
            query: ({ id, actionType }) => ({
                url: `${TASKS_URL}/delete-restore/${id}?actionType=${actionType}`,
                method: "DELETE",
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        getDasboardStats: builder.query({
            query: () => ({
                url: `${TASKS_URL}/dashboard`,
                method: "GET",
                credentials: "include",
            }),
        }),

        changeTaskStage: builder.mutation({
            query: (data) => ({
                url: `${TASKS_URL}/change-stage/${data?.id}`,
                method: "PUT",
                body: data,
                credentials: "include",
            }),
        }),

        changeSubTaskStatus: builder.mutation({
            query: (data) => ({
                url: `${TASKS_URL}/change-status/${data?.id}/${data?.subId}`,
                method: "PUT",
                body: data,
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        deleteAsset: builder.mutation({
            query: ({ id, assetUrl }) => ({
                url: `${TASKS_URL}/delete-asset/${id}`,
                method: "PUT",
                body: { assetUrl },
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        getGovernanceTasks: builder.query({
            query: () => ({
                url: `${TASKS_URL}/governance-tasks`,
                method: "GET",
                credentials: "include",
            }),
            providesTags: ["Tasks"],
        }),

        reviewGovernanceTask: builder.mutation({
            query: ({ id, status }) => ({
                url: `${TASKS_URL}/governance-review/${id}`,
                method: "PUT",
                body: { status },
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"],
        }),

        updateTaskSchedule: builder.mutation({
            query: (data) => ({
                url: `${TASKS_URL}/update/${data._id}`,
                method: "PUT",
                // We send specific scheduling fields for optimal timeline rendering
                body: data,
                credentials: "include",
            }),
            invalidatesTags: ["Tasks"], // Force re-fetch of all tasks to get the cascaded dates
        }),
    }),
});

export const {
    usePostTaskActivityMutation,
    useCreateTaskMutation,
    useGetAllTaskQuery,
    useCreateSubTaskMutation,
    useTrashTastMutation,
    useDeleteRestoreTastMutation,
    useDuplicateTaskMutation,
    useUpdateTaskMutation,
    useGetSingleTaskQuery,
    useGetDasboardStatsQuery,
    useChangeTaskStageMutation,
    useChangeSubTaskStatusMutation,
    useDeleteAssetMutation,
    useGetGovernanceTasksQuery,
    useReviewGovernanceTaskMutation,
    useUpdateTaskScheduleMutation,
} = postApiSlice;