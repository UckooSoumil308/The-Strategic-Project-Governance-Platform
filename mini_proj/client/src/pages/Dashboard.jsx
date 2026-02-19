import React from 'react'
import { Link } from "react-router-dom";
import {
    MdAdminPanelSettings,
    MdKeyboardArrowDown,
    MdKeyboardArrowUp,
    MdKeyboardDoubleArrowUp,
} from "react-icons/md";
import { LuClipboardPen } from "react-icons/lu";
import { FaNewspaper, FaUsers } from "react-icons/fa";
import { FaArrowsToDot } from "react-icons/fa6";
import moment from "moment";
import clsx from "clsx";
import { Chart } from "../components/Chart";
import { BGS, PRIOTITYSTYELS, TASK_TYPE, getInitials } from "../utils";
import UserInfo from "../components/UserInfo";
import Loading from "../components/Loader";
import { useGetDasboardStatsQuery } from "../redux/slices/api/taskApiSlice";


const TaskTable = ({ tasks }) => {
    const ICONS = {
        high: <MdKeyboardDoubleArrowUp />,
        medium: <MdKeyboardArrowUp />,
        low: <MdKeyboardArrowDown />,
    };

    const TableHeader = () => (
        <thead className='border-b border-gray-100'>
            <tr className='text-gray-500 text-left font-medium'>
                <th className='py-3 pl-4'>Task Title</th>
                <th className='py-3'>Priority</th>
                <th className='py-3'>Team</th>
                <th className='py-3 hidden md:block'>Created At</th>
            </tr>
        </thead>
    );

    const TableRow = ({ task }) => (
        <tr className='border-b border-gray-100 text-gray-600 hover:bg-gray-50/50 transition-colors'>
            <td className='py-3 pl-4'>
                <div className='flex items-center gap-3'>
                    <div
                        className={clsx("w-3 h-3 rounded-full shadow-sm", TASK_TYPE[task.stage])}
                    />


                    <Link to={`/task/${task._id}`} className='text-base text-gray-800 font-medium hover:text-blue-600 hover:underline truncate block'>
                        {task.title}
                    </Link>
                </div>
            </td>

            <td className='py-3'>
                <div className='flex gap-1 items-center'>
                    <span className={clsx("text-lg", PRIOTITYSTYELS[task.priority])}>
                        {ICONS[task.priority]}
                    </span>
                    <span className='capitalize text-sm font-medium'>{task.priority}</span>
                </div>
            </td>

            <td className='py-3'>
                <div className='flex -space-x-2 overflow-hidden'>
                    {task.team.map((m, index) => (
                        <div
                            key={index}
                            className={clsx(
                                "w-8 h-8 rounded-full ring-2 ring-white text-white flex items-center justify-center text-xs",
                                BGS[index % BGS.length]
                            )}
                        >
                            <UserInfo user={m} />
                        </div>
                    ))}
                </div>
            </td>
            <td className='py-3 hidden md:block'>
                <span className='text-sm text-gray-400'>
                    {moment(task?.date).fromNow()}
                </span>
            </td>
        </tr>
    );
    return (
        <>
            <div className='w-full md:w-2/3 bg-white px-4 md:px-8 py-8 shadow-sm rounded-xl border border-gray-100 overflow-hidden' style={{ marginRight: '40px' }}>
                <table className='w-full'>
                    <TableHeader />
                    <tbody className='divide-y divide-gray-100'>
                        {tasks?.map((task, id) => (
                            <TableRow key={id} task={task} />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

const UserTable = ({ users }) => {
    const TableHeader = () => (
        <thead className='border-b border-gray-100'>
            <tr className='text-gray-500 text-left font-medium'>
                <th className='py-3 pl-4'>Full Name</th>
                <th className='py-3'>Status</th>
                <th className='py-3'>Created At</th>
            </tr>
        </thead>
    );

    const TableRow = ({ user }) => (
        <tr className='border-b border-gray-100 text-gray-600 hover:bg-gray-50/50 transition-colors'>
            <td className='py-3 pl-4'>
                <div className='flex items-center gap-3'>
                    <div className='w-9 h-9 rounded-full text-white flex items-center justify-center text-sm bg-violet-600 ring-2 ring-violet-50 shadow-sm'>
                        <span className='text-center uppercase'>{getInitials(user?.name)}</span>
                    </div>

                    <div>
                        <p className='text-gray-800 font-medium'> {user.name}</p>
                        <span className='text-xs text-gray-400'>{user?.role}</span>
                    </div>
                </div>
            </td>

            <td>
                <span
                    className={clsx(
                        "px-3 py-1 rounded-full text-xs font-semibold",
                        user?.isActive ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-600"
                    )}
                >
                    {user?.isActive ? "Active" : "Disabled"}
                </span>
            </td>
            <td className='py-2 text-sm text-gray-400'>{moment(user?.createdAt).fromNow()}</td>
        </tr>
    );

    return (
        <div className='w-full md:w-1/3 bg-white h-fit px-4 md:px-8 py-8 shadow-sm rounded-xl border border-gray-100'>
            <table className='w-full mb-5'>
                <TableHeader />
                <tbody>
                    {users?.map((user, index) => (
                        <TableRow key={index + user?._id} user={user} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const Dashboard = () => {
    const { data, isLoading } = useGetDasboardStatsQuery();

    if (isLoading)
        return (
            <div className='py-10'>
                <Loading />
            </div>
        );

    const totals = data?.tasks || {};

    const stats = [
        {
            _id: "1",
            label: "TOTAL TASK",
            total: data?.totalTasks || 0,
            icon: <FaNewspaper />,
            bg: "bg-[#1d4ed8]",
            tooltip: "Total number of tasks in the workspace",
            link: "/tasks",
        },
        {
            _id: "2",
            label: "COMPLTED TASK",
            total: totals["completed"] || 0,
            icon: <MdAdminPanelSettings />,
            bg: "bg-[#0f766e]",
            tooltip: "View all completed tasks",
            link: "/completed/completed",
        },
        {
            _id: "3",
            label: "TASK IN PROGRESS ",
            total: totals["in progress"] || 0,
            icon: <LuClipboardPen />,
            bg: "bg-[#f59e0b]",
            tooltip: "View tasks currently in progress",
            link: "/in-progress/in progress",
        },
        {
            _id: "4",
            label: "TODOS",
            total: totals["todo"] || 0,
            icon: <FaArrowsToDot />,
            bg: "bg-[#be185d]",
            tooltip: "View tasks waiting to be started",
            link: "/todo/todo",
        },
    ];


    const Card = ({ label, count, bg, icon, link, tooltip }) => {
        const CardContent = (
            <div
                className='w-full h-36 bg-white/50 p-8 shadow-sm rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 flex items-center justify-between cursor-pointer'
                style={{ marginBottom: '20px' }}
                title={tooltip} // Tooltip on hover
            >
                <div className='h-full flex flex-1 flex-col justify-between'>
                    <p className='text-base text-gray-500 font-medium tracking-wide'>{label}</p>
                    <span className='text-3xl font-bold text-gray-800'>{count}</span>
                    <span className='text-xs text-gray-400'>{"110 last month"}</span>
                </div>

                <div
                    className={clsx(
                        "w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl shadow-md",
                        bg
                    )}
                >
                    {icon}
                </div>
            </div>
        );

        return link ? <Link to={link}>{CardContent}</Link> : CardContent;
    };

    return (
        <div className='h-full py-8 px-10 relative'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-12 mb-10' style={{ gap: '40px', marginBottom: '50px' }}>
                {stats.map(({ icon, bg, label, total, link, tooltip }, index) => (
                    <Card key={index} icon={icon} bg={bg} label={label} count={total} link={link} tooltip={tooltip} />
                ))}
            </div>

            <div className='w-full bg-white my-20 p-6 rounded-xl shadow-sm border border-gray-100' style={{ marginTop: '60px', marginBottom: '60px' }}>
                <h4 className='text-xl text-gray-600 font-semibold mb-4'>
                    Chart by Priority
                </h4>
                <Chart data={data?.graphData} />
            </div>

            <div className='w-full flex flex-col md:flex-row gap-16 2xl:gap-20 py-10' style={{ gap: '50px', paddingTop: '40px' }}>
                {/* /left */}

                <TaskTable tasks={data?.last10Task} />

                {/* /right */}

                <UserTable users={data?.users} />
            </div>
        </div>
    );
};

export default Dashboard;