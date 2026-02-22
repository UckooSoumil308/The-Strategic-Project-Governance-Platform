import React from 'react'
import clsx from "clsx";
import { FaTasks, FaTrashAlt, FaUsers } from "react-icons/fa";
import {
    MdDashboard,
    MdInsights,
    MdOutlineAddTask,
    MdOutlinePendingActions,
    MdSettings,
    MdTaskAlt,
    MdGavel,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { setOpenSidebar } from "../redux/slices/authSlice";
import { IoCheckmarkDoneOutline } from "react-icons/io5";

const linkData = [
    {
        label: "Dashboard",
        link: "dashboard",
        icon: <MdDashboard />,
        tooltip: "Overview of your project stats and recent activities",
    },
    {
        label: "Tasks",
        link: "tasks",
        icon: <FaTasks />,
        tooltip: "View and manage all your tasks",
    },
    {
        label: "Completed",
        link: "completed/completed",
        icon: <MdTaskAlt />,
        tooltip: "View your completed tasks history",
    },
    {
        label: "In Progress",
        link: "in-progress/in progress",
        icon: <MdOutlinePendingActions />,
        tooltip: "Tasks currently being worked on",
    },
    {
        label: "To Do",
        link: "todo/todo",
        icon: <MdOutlinePendingActions />,
        tooltip: "Tasks waiting to be started",
    },
    {
        label: "Team",
        link: "team",
        icon: <FaUsers />,
        tooltip: "Manage team members and collaborators",
    },

    {
        label: "Trash",
        link: "trashed",
        icon: <FaTrashAlt />,
        tooltip: "View deleted items",
    },
    {
        label: "Impact Analysis",
        link: "impact-analysis",
        icon: <MdInsights />,
        tooltip: "Analyze project impact and critical paths",
    },
    {
        label: "Governance Review",
        link: "governance-review",
        icon: <MdGavel />,
        tooltip: "Review blocked tasks for strategic drift",
    },
];

const Sidebar = () => {
    const { user } = useSelector((state) => state.auth);

    const dispatch = useDispatch();
    const location = useLocation();
    const path = location.pathname.split("/")[1];
    const sidebarLinks = user?.isAdmin ? linkData : linkData.slice(0, 5);

    const closeSidebar = () => {
        dispatch(setOpenSidebar(false));
    };

    const NavLink = ({ el }) => {
        return (
            <Link
                onClick={closeSidebar}
                to={el.link}
                className={clsx(
                    "w-full lg:w-3/4 flex gap-3 px-4 py-2.5 rounded-2xl items-center text-gray-700 dark:text-gray-300 text-base font-medium transition-all duration-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400",
                    path === el.link.split("/")[0] ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:text-white" : ""
                )}
                title={el.tooltip}
            >
                <div className='text-lg'>{el.icon}</div>
                <span className=''>{el.label}</span>
            </Link>
        );
    };
    return (
        <div className='w-full h-full flex flex-col gap-6 p-6' style={{ padding: '24px' }}>
            <h1 className='flex gap-3 items-center px-4'>
                <p className='bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none'>
                    <MdOutlineAddTask className='text-white text-2xl font-black' />
                </p>
                <span className='text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight'>
                    TaskEase
                </span>
            </h1>

            <div className='flex-1 flex flex-col gap-y-2 py-6' style={{ gap: '8px', paddingTop: '24px' }}>
                {sidebarLinks.map((link) => (
                    <NavLink el={link} key={link.label} />
                ))}
            </div>

            <div className='px-4'>
                <button className='w-full flex gap-3 px-4 py-3 rounded-2xl items-center text-base text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50'>
                    <MdSettings className="text-xl" />
                    <span className="font-medium">Settings</span>
                </button>
            </div>
        </div>
    );
};


export default Sidebar;