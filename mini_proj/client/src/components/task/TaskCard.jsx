import clsx from "clsx";
import React, { useState } from "react";
import { IoMdAdd } from "react-icons/io";
import {
    MdKeyboardArrowDown,
    MdKeyboardArrowUp,
    MdKeyboardDoubleArrowUp,
} from "react-icons/md";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import {
    BGS,
    PRIOTITYSTYELS,
    TASK_TYPE,
    formatDate,
} from "../../utils/index.js";
import UserInfo from "../UserInfo.jsx";
import { AddSubTask, TaskAssets, TaskColor, TaskDialog } from "./index";

const ICONS = {
    high: <MdKeyboardDoubleArrowUp />,
    medium: <MdKeyboardArrowUp />,
    low: <MdKeyboardArrowDown />,
};

const TaskCard = ({ task }) => {
    const { user } = useSelector((state) => state.auth);
    const [open, setOpen] = useState(false);

    return (
        <>
            <div className='w-full h-fit bg-white dark:bg-[#1f1f1f] shadow-sm hover:shadow-xl transition-shadow duration-300 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 focus-within:ring-2 focus-within:ring-indigo-500'>
                <div className='w-full flex justify-between items-center mb-3'>
                    <div
                        className={clsx(
                            "flex gap-1.5 items-center text-xs font-bold px-2.5 py-1 rounded-full",
                            PRIOTITYSTYELS[task?.priority] || "bg-gray-100 text-gray-600"
                        )}
                    >
                        <span className='text-sm'>{ICONS[task?.priority]}</span>
                        <span className='uppercase'>{task?.priority}</span>
                    </div>
                    <TaskDialog task={task} />
                </div>
                <>
                    <Link to={`/task/${task._id}`}>
                        <div className='flex items-center gap-3 mb-1'>
                            <TaskColor className={TASK_TYPE[task.stage]} />
                            <h4 className='text-base font-semibold line-clamp-1 text-gray-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors'>
                                {task?.title}
                            </h4>
                        </div>
                    </Link>
                    <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                        {formatDate(new Date(task?.date))}
                    </span>
                </>

                <div className='w-full border-t border-gray-100 dark:border-gray-800 my-4' />
                <div className='flex items-center justify-between mb-2'>
                    <TaskAssets
                        activities={task?.activities?.length}
                        subTasks={task?.subTasks}
                        assets={task?.assets?.length}
                    />

                    <div className='flex flex-row-reverse'>
                        {task?.team?.length > 0 &&
                            task?.team?.map((m, index) => (
                                <div
                                    key={index}
                                    className={clsx(
                                        "w-8 h-8 rounded-full text-white flex items-center justify-center text-sm -mr-2 border-2 border-white dark:border-[#1f1f1f] shadow-sm hover:z-10 transition-transform hover:scale-110",
                                        BGS[index % BGS?.length]
                                    )}
                                >
                                    <UserInfo user={m} />
                                </div>
                            ))}
                    </div>
                </div>

                {/* subtasks */}
                {task?.subTasks?.length > 0 ? (
                    <div className='py-4 border-t border-gray-200 dark:border-gray-700'>
                        <h5 className='text-base line-clamp-1 text-black dark:text-gray-400'>
                            {task?.subTasks[0].title}
                        </h5>

                        <div className='p-4 space-x-8'>
                            <span className='text-sm text-gray-600 dark:text-gray-500'>
                                {formatDate(new Date(task?.subTasks[0]?.date))}
                            </span>
                            <span className='bg-blue-600/10 px-3 py-1 rounded-full text-blue-700 font-medium'>
                                {task?.subTasks[0]?.tag}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className='py-4 border-t border-gray-200 dark:border-gray-700'>
                            <span className='text-gray-500'>No Sub-Task</span>
                        </div>
                    </div>
                )}

                <div className='w-full mt-4'>
                    <button
                        disabled={user.isAdmin ? false : true}
                        onClick={() => setOpen(true)}
                        className='w-full flex justify-center gap-2 items-center text-sm text-gray-600 dark:text-gray-400 font-medium disabled:cursor-not-allowed disabled:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 py-2 rounded-xl transition-all duration-300'
                    >
                        <IoMdAdd className='text-lg' />
                        <span>Add Subtask</span>
                    </button>
                </div>
            </div>

            <AddSubTask open={open} setOpen={setOpen} id={task._id} />
        </>
    );
};

export default TaskCard;