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
    MdAssistant,
    MdOutlineWarning,
    MdKeyboardDoubleArrowLeft,
    MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { setOpenSidebar, toggleSidebar } from "../redux/slices/authSlice";
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
    {
        label: "Agent Control",
        link: "agent-tower",
        icon: <MdAssistant />,
        tooltip: "Interactive AI Agent Orchestration",
    },
    {
        label: "Resolution Center",
        link: "resolution-center",
        icon: <MdOutlineWarning />,
        tooltip: "Autonomous Schedule Healing",
    },
];

const Sidebar = () => {
    const { user, isSidebarMinimized } = useSelector((state) => state.auth);

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
                    "flex gap-3 px-4 py-3 rounded-2xl items-center text-gray-700 dark:text-gray-300 text-base font-medium transition-all duration-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 w-full",
                    path === el.link.split("/")[0] ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:text-white" : "",
                    isSidebarMinimized ? "justify-center px-0 w-12 h-12 rounded-xl mx-auto" : "lg:w-3/4"
                )}
                title={el.tooltip}
            >
                <div className='text-xl'>{el.icon}</div>
                {!isSidebarMinimized && <span className=''>{el.label}</span>}
            </Link>
        );
    };
    return (
        <div className={clsx('w-full h-full flex flex-col gap-6 py-6 transition-all duration-300', isSidebarMinimized ? 'px-2 items-center' : 'p-6 px-4')}>
            <h1 className={clsx('flex items-center gap-3', isSidebarMinimized ? 'justify-center' : 'px-4')}>
                <p className='bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none min-w-[40px]'>
                    <MdOutlineAddTask className='text-white text-2xl font-black' />
                </p>
                {!isSidebarMinimized && (
                    <span className='text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight'>
                        TaskEase
                    </span>
                )}
            </h1>

            <div className='flex-1 flex flex-col gap-y-2 py-4 mt-2 w-full'>
                {sidebarLinks.map((link) => (
                    <NavLink el={link} key={link.label} />
                ))}
            </div>

            <div className='w-full flex flex-col gap-2 mt-auto'>
                {/* Collapse Toggle (Desktop Only) */}
                <button
                    onClick={() => dispatch(toggleSidebar())}
                    className={clsx(
                        'w-full hidden md:flex gap-3 px-4 py-3 rounded-2xl items-center text-base text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none',
                        isSidebarMinimized ? 'justify-center px-0 w-12 h-12 rounded-xl mx-auto' : 'lg:w-3/4'
                    )}
                    title={isSidebarMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isSidebarMinimized ? <MdKeyboardDoubleArrowRight className="text-2xl" /> : <MdKeyboardDoubleArrowLeft className="text-2xl" />}
                    {!isSidebarMinimized && <span className="font-medium">Collapse</span>}
                </button>

                <button className={clsx(
                    'w-full flex gap-3 px-4 py-3 rounded-2xl items-center text-base text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50',
                    isSidebarMinimized ? 'justify-center px-0 w-12 h-12 rounded-xl mx-auto' : 'lg:w-3/4'
                )} title="Settings">
                    <MdSettings className="text-xl" />
                    {!isSidebarMinimized && <span className="font-medium">Settings</span>}
                </button>
            </div>
        </div>
    );
};


export default Sidebar;