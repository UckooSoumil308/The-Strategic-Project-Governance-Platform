import React from "react";
import TaskCard from "./TaskCard";

const BoardView = ({ tasks }) => {
    // Clean up BoardView to defensively render only parent Epics and prevent subtasks 
    // from cluttering the main columns (assuming subtasks might ever be passed down here).
    const parentEpics = tasks?.filter((task) => {
        // Example check: we exclude any task that is explicitly flagged as not an epic,
        // or has a parent reference, though in our current schema subtasks are embedded.
        return !task.isSubtask;
    }) || [];

    return (
        <div className='w-full py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 2xl:gap-10'>
            {parentEpics.map((task, index) => (
                <TaskCard task={task} key={index} />
            ))}
        </div>
    );
};

export default BoardView;