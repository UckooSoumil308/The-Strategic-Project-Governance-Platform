import React from 'react'
import TaskCard from "./TaskCard";
const BoardView = ({ tasks }) => {
    return (
        <div className='w-full py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 2xl:gap-14' style={{ marginTop: '60px' }}>
            {tasks.map((task, index) => (
                <TaskCard task={task} key={index} />
            ))}
        </div>
    );
};

export default BoardView;