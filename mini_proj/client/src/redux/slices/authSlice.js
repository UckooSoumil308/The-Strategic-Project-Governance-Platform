import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: localStorage.getItem("userInfo")
        ? JSON.parse(localStorage.getItem("userInfo"))
        : null,

    isSidebarOpen: false,
    isSidebarMinimized: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            state.user = action.payload;
            localStorage.setItem("userInfo", JSON.stringify(action.payload));
        },
        logout: (state, action) => {
            state.user = null;
            localStorage.removeItem("userInfo");
        },
        setOpenSidebar: (state, action) => {
            state.isSidebarOpen = action.payload;
        },
        toggleSidebar: (state, action) => {
            state.isSidebarMinimized = action.payload !== undefined ? action.payload : !state.isSidebarMinimized;
        },
    },
});

export const { setCredentials, logout, setOpenSidebar, toggleSidebar } = authSlice.actions;

export default authSlice.reducer;