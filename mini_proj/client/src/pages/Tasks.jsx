import React from 'react'
import { FaList } from 'react-icons/fa';
import { MdGridView } from 'react-icons/md';
import { useParams, useSearchParams } from 'react-router-dom';
import Title from "../components/Title";
import Button from "../components/Button";
import { IoMdAdd } from "react-icons/io";
import Tabs from "../components/Tabs";
import TaskTitle from "../components/TaskTitle";
import BoardView from "../components/BoardView";
import Table from "../components/task/Table";
import AddTask from "../components/task/AddTask";
import { useState } from 'react';
import Loading from '../components/Loader';
import { useGetAllTaskQuery } from "../redux/slices/api/taskApiSlice";


const TABS = [
    { title: "Board View", icon: <MdGridView /> },
    { title: "List View", icon: <FaList /> },
];

const TASK_TYPE = {
    todo: "bg-blue-600",
    "in progress": "bg-yellow-600",
    completed: "bg-green-600",
};

const Tasks = () => {
    const params = useParams();
    const [searchParams] = useSearchParams();

    const [selected, setSelected] = useState(0);
    const [open, setOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const handleOpenModal = (stage) => {
        setSelectedTask(stage ? { stage } : null);
        setOpen(true);
    };

    const status = params?.status || "";
    const search = searchParams.get("search") || "";

    const { data, isLoading, refetch } = useGetAllTaskQuery({
        strQuery: status,
        isTrashed: "",
        search: search,
    });

    const tasks = data?.tasks || [];

    return isLoading ? (
        <div className='py-10'>
            <Loading />
        </div>
    ) : (
        <div className='w-full'>
            <div className='flex items-center justify-between mb-8' style={{ marginBottom: '40px' }}>
                <Title title={status ? `${status} Tasks` : "Tasks"} />

                {!status && (
                    <Button
                        onClick={() => handleOpenModal(null)}
                        label='Create Task'
                        icon={<IoMdAdd className='text-lg' />}
                        className='flex flex-row-reverse gap-1 items-center bg-blue-600 text-white rounded-md py-2 2xl:py-2.5'
                    />
                )}
            </div>

            <Tabs tabs={TABS} setSelected={setSelected}>
                {!status && (
                    <div className='w-full flex justify-between gap-10 md:gap-x-20 py-6 mb-8'>
                        <TaskTitle label='To Do' className={TASK_TYPE.todo} onClick={() => handleOpenModal("todo")} />
                        <TaskTitle
                            label='In Progress'
                            className={TASK_TYPE["in progress"]}
                            onClick={() => handleOpenModal("in progress")}
                        />
                        <TaskTitle label='completed' className={TASK_TYPE.completed} onClick={() => handleOpenModal("completed")} />
                    </div>
                )}


                {selected !== 1 ? (
                    <BoardView tasks={tasks} />
                ) : (
                    <div className='w-full'>
                        <Table tasks={tasks} />
                    </div>
                )}
            </Tabs>

            <AddTask open={open} setOpen={setOpen} refetch={refetch} task={selectedTask} />
        </div>
    );
};

export default Tasks;