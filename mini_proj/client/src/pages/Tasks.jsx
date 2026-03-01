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
import GanttTimeline from "../components/GanttTimeline";
import AiChatPanel from "../components/AiChatPanel";
import AiGovernanceSandbox from "../components/AiGovernanceSandbox";
import { useState } from 'react';
import Loading from '../components/Loader';
import { useGetAllTaskQuery, useCreateTaskMutation } from "../redux/slices/api/taskApiSlice";
import { toast } from "sonner";


const TABS = [
    { title: "Board View", icon: <MdGridView /> },
    { title: "List View", icon: <FaList /> },
    { title: "Timeline View", icon: <MdGridView /> }, // Reusing grid icon, can update to Gantt icon if available
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
    const [aiChatOpen, setAiChatOpen] = useState(false);
    const [draftAiTasks, setDraftAiTasks] = useState([]);
    const [isSavingAiTasks, setIsSavingAiTasks] = useState(false);
    const [createTask] = useCreateTaskMutation();

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
    const combinedTasks = [...tasks, ...draftAiTasks];

    // Local state for the Sandbox Modal
    const [showSandbox, setShowSandbox] = useState(false);

    const handleSaveAiTasks = async (finalTasksToSave) => {
        setIsSavingAiTasks(true);
        const idMap = new Map(); // Map 'mock-ai-x' to real MongoDB _id

        const tasksList = finalTasksToSave || draftAiTasks;

        try {
            // Save sequentially to resolve dependencies
            for (const mockTask of tasksList) {
                // Swap mock predecessor IDs for the newly created real IDs
                const rawPredecessors = mockTask.predecessors || mockTask.logical_predecessors || [];
                const mappedPredecessors = rawPredecessors
                    .map(mockId => idMap.get(mockId))
                    .filter(id => id); // Remove any unresolved dependencies just in case

                // Formulate the DTO for the backend
                const payload = {
                    title: mockTask.title,
                    stage: mockTask.stage || "todo",
                    priority: mockTask.priority || "normal",
                    duration: mockTask.estimated_duration_days || mockTask.duration || 1,
                    team: mockTask.team || [],
                    date: mockTask.date || new Date(),
                    predecessors: mappedPredecessors,
                    isEpic: true,
                    isMilestone: mockTask.is_milestone || false,
                    description: mockTask.description || "",
                    subTasks: (mockTask.subtasks || []).map((st) => ({
                        title: st.title,
                        estimated_hours: st.estimated_hours || 1,
                        date: new Date(),
                    })),
                };

                const result = await createTask(payload).unwrap();
                // Store the mapping from the mock ID to the new real ID
                if (result?.task?._id) {
                    idMap.set(mockTask._id, result.task._id);
                }
            }

            toast.success("AI Schedule successfully saved to your project!");
            setDraftAiTasks([]);
            setShowSandbox(false);
            refetch(); // Reload from DB
        } catch (error) {
            console.error("Failed to save AI tasks:", error);
            toast.error(error?.data?.message || error.message || "Failed to save schedule.");
        } finally {
            setIsSavingAiTasks(false);
        }
    };

    return isLoading ? (
        <div className='py-10'>
            <Loading />
        </div>
    ) : (
        <div className='w-full relative'>

            {/* AI Assistant Button */}
            <button
                onClick={() => setAiChatOpen(true)}
                className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition"
            >
                AI Assistant
            </button>

            {/* AI Chat Panel */}
            <AiChatPanel
                isOpen={aiChatOpen}
                onClose={() => setAiChatOpen(false)}
                onMinimize={() => setAiChatOpen(false)}
                onScheduleGenerated={(aiTasks) => {
                    setDraftAiTasks(aiTasks);
                    setShowSandbox(true); // Open sandbox instead of auto-jumping timeline
                }}
            />

            {/* AI Governance Sandbox */}
            {showSandbox && (
                <AiGovernanceSandbox
                    draftTasks={draftAiTasks}
                    onDiscard={() => {
                        setDraftAiTasks([]);
                        setShowSandbox(false);
                    }}
                    onSave={handleSaveAiTasks}
                />
            )}

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


                {selected === 0 ? (
                    <BoardView tasks={combinedTasks} />
                ) : selected === 1 ? (
                    <div className='w-full'>
                        <Table tasks={combinedTasks} />
                    </div>
                ) : (
                    <div className='w-full mt-4'>
                        <GanttTimeline tasks={combinedTasks} />
                        {/* We use Sandbox now instead of this preview banner, but keep it just in case */}
                    </div>
                )}
            </Tabs>

            <AddTask open={open} setOpen={setOpen} refetch={refetch} task={selectedTask} />
        </div>
    );
};

export default Tasks;