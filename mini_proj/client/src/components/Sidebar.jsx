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
                    "w-fult lg:w-3/4 flex gap-2 px-3 py-2 rounded-full items-center text-gray-800 dark:text-gray-400 text-base hover:bg-[#2564ed2d]",
                    path === el.link.split("/")[0] ? "bg-blue-700 text-white" : ""
                )}
                title={el.tooltip}
            >
                {el.icon}
                <span className='hover:text-[#2564ed]'>{el.label}</span>
            </Link>
        );
    };
    return (
        <div className='w-full h-full flex flex-col gap-8 p-8' style={{ padding: '32px' }}>
            <h1 className='flex gap-2 items-center'>
                <p className='bg-blue-600 p-2 rounded-full'>
                    <MdOutlineAddTask className='text-white text-2xl font-black' />
                </p>
                <span className='text-2xl font-bold text-black dark:text-white'>
                    TaskEase
                </span>
            </h1>

            <div className='flex-1 flex flex-col gap-y-8 py-8' style={{ gap: '28px', paddingTop: '32px' }}>
                {sidebarLinks.map((link) => (
                    <NavLink el={link} key={link.label} />
                ))}
            </div>

            <div className=''>
                <button className='w-full flex gap-2 p-2 items-center text-lg text-gray-800 dark:text-white'>
                    <MdSettings />
                    <span>Settings</span>
                </button>
            </div>
        </div>
    );
};


export default Sidebar;