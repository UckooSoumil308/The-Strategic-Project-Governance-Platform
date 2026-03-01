import TaskCard from "./TaskCard";

const BoardView = ({ tasks }) => {
    // Defensively ensure only parent Epics are rendered to avoid cluttering columns
    const parentEpics = tasks?.filter((task) => !task.isSubtask) || [];

    return (
        <div className='w-full py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 2xl:gap-8'>
            {parentEpics.map((task, index) => (
                <TaskCard task={task} key={index} />
            ))}
        </div>
    );
};

export default BoardView;