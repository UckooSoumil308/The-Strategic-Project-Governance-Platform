import React from 'react'
import clsx from "clsx";
import { IoMdAdd } from "react-icons/io";

const TaskTitle = ({ label, className, onClick }) => {
    return (
        <div className='w-full h-10 md:h-12 px-2 md:px-4 rounded bg-white flex items-center justify-between' style={{ marginBottom: '30px' }}>
            <div className='flex gap-4 items-center'>
                <div className={clsx("w-4 h-6 rounded-full ", className)} />
                <p className='text-sm md:text-base text-gray-600'>{label}</p>
            </div>

            <button className='hidden md:block' onClick={onClick}>
                <IoMdAdd className='text-lg text-black' />
            </button>
        </div>
    );
};

export default TaskTitle;