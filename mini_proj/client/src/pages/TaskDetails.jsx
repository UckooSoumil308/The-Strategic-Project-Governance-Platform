import clsx from "clsx";
import moment from "moment";
import React, { useState } from "react";
import { FaBug, FaRobot, FaSpinner, FaTasks, FaThumbsUp, FaUser } from "react-icons/fa";
import { GrInProgress } from "react-icons/gr";
import {
    MdKeyboardArrowDown,
    MdKeyboardArrowUp,
    MdKeyboardDoubleArrowUp,
    MdOutlineDelete,
    MdOutlineDoneAll,
    MdOutlineMessage,
    MdTaskAlt,
    MdClose,
    MdDownload,
} from "react-icons/md";
import { FaFilePdf, FaFileWord, FaFilePowerpoint, FaFileAlt, FaMusic } from "react-icons/fa";
import AiChatPanel from "../components/AiChatPanel";
import { RxActivityLog } from "react-icons/rx";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button, Loading, Tabs } from "../components";
import { TaskColor } from "../components/task";
import {
    useChangeSubTaskStatusMutation,
    useDeleteAssetMutation,
    useGetSingleTaskQuery,
    usePostTaskActivityMutation,

} from "../redux/slices/api/taskApiSlice";
import {
    PRIOTITYSTYELS,
    TASK_TYPE,
    getCompletedSubTasks,
    getInitials,
} from "../utils";



const ICONS = {
    high: <MdKeyboardDoubleArrowUp />,
    medium: <MdKeyboardArrowUp />,
    low: <MdKeyboardArrowDown />,
};

const bgColor = {
    high: "bg-red-200",
    medium: "bg-yellow-200",
    low: "bg-blue-200",
};

const TABS = [
    { title: "Task Detail", icon: <FaTasks /> },
    { title: "Activities/Timeline", icon: <RxActivityLog /> },
];

const TASKTYPEICON = {
    commented: (
        <div className='w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white'>
            <MdOutlineMessage />,
        </div>
    ),
    started: (
        <div className='w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white'>
            <FaThumbsUp size={20} />
        </div>
    ),
    assigned: (
        <div className='w-6 h-6 flex items-center justify-center rounded-full bg-gray-500 text-white'>
            <FaUser size={14} />
        </div>
    ),
    bug: (
        <div className='text-red-600'>
            <FaBug size={24} />
        </div>
    ),
    completed: (
        <div className='w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white'>
            <MdOutlineDoneAll size={24} />
        </div>
    ),
    "in progress": (
        <div className='w-8 h-8 flex items-center justify-center rounded-full bg-violet-600 text-white'>
            <GrInProgress size={16} />
        </div>
    ),
};

const act_types = [
    "Started",
    "Completed",
    "In Progress",
    "Commented",
    "Bug",
    "Assigned",
];

const Activities = ({ activity, id, refetch }) => {
    const [selected, setSelected] = useState("Started");
    const [text, setText] = useState("");

    const [postActivity, { isLoading }] = usePostTaskActivityMutation();

    const handleSubmit = async () => {
        try {
            const data = {
                type: selected?.toLowerCase(),
                activity: text,
            };
            const res = await postActivity({
                data,
                id,
            }).unwrap();
            setText("");
            toast.success(res?.message);
            refetch();
        } catch (err) {
            console.log(err);
            toast.error(err?.data?.message || err.error);
        }
    };

    const Card = ({ item }) => {
        return (
            <div className={`flex space-x-4`}>
                <div className='flex flex-col items-center flex-shrink-0'>
                    <div className='w-10 h-10 flex items-center justify-center'>
                        {TASKTYPEICON[item?.type]}
                    </div>
                    <div className='h-full flex items-center'>
                        <div className='w-0.5 bg-gray-300 h-full'></div>
                    </div>
                </div>

                <div className='flex flex-col gap-y-1 mb-8'>
                    <p className='font-semibold'>{item?.by?.name}</p>
                    <div className='text-gray-500 space-x-2'>
                        <span className='capitalize'>{item?.type}</span>
                        <span className='text-sm'>{moment(item?.date).fromNow()}</span>
                    </div>
                    <div className='text-gray-700'>{item?.activity}</div>
                </div>
            </div>
        );
    };

    return (
        <div className='w-full flex gap-10 2xl:gap-20 min-h-screen px-10 py-8 bg-white shadow rounded-md justify-between overflow-y-auto'>
            <div className='w-full md:w-1/2'>
                <h4 className='text-gray-600 font-semibold text-lg mb-5'>Activities</h4>
                <div className='w-full space-y-0'>
                    {activity?.map((item, index) => (
                        <Card
                            key={item.id}
                            item={item}
                            isConnected={index < activity?.length - 1}
                        />
                    ))}
                </div>
            </div>

            <div className='w-full md:w-1/3'>
                <h4 className='text-gray-600 font-semibold text-lg mb-5'>
                    Add Activity
                </h4>
                <div className='w-full flex flex-wrap gap-5'>
                    {act_types.map((item, index) => (
                        <div key={item} className='flex gap-2 items-center'>
                            <input
                                type='checkbox'
                                className='w-4 h-4'
                                checked={selected === item ? true : false}
                                onChange={(e) => setSelected(item)}
                            />
                            <p>{item}</p>
                        </div>
                    ))}
                    <textarea
                        rows={10}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder='Type ......'
                        className='bg-white w-full mt-10 border border-gray-300 outline-none p-4 rounded-md focus:ring-2 ring-blue-500'
                    ></textarea>
                    {isLoading ? (
                        <Loading />
                    ) : (
                        <Button
                            type='button'
                            label='Submit'
                            onClick={handleSubmit}
                            className='bg-blue-600 text-white rounded'
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const TaskDetails = () => {
    const { id } = useParams();
    const { data, isLoading, refetch } = useGetSingleTaskQuery(id);
    const [subTaskAction, { isLoading: isSubmitting }] =
        useChangeSubTaskStatusMutation();
    const [deleteAsset, { isLoading: isDeleting }] = useDeleteAssetMutation();
    const { user } = useSelector((state) => state.auth);

    const [viewAsset, setViewAsset] = useState(null);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [aiPanelMinimized, setAiPanelMinimized] = useState(false);

    const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const isVideo = (url) => /\.(mp4|avi|mov|webm)$/i.test(url);
    const isAudio = (url) => /\.(mp3|wav|ogg)$/i.test(url);
    const isPdf = (url) => /\.(pdf)$/i.test(url);
    const isDoc = (url) => /\.(doc|docx)$/i.test(url);
    const isPPT = (url) => /\.(ppt|pptx)$/i.test(url);

    const selectedAssetHandler = (asset) => {
        setViewAsset(asset);
    };

    const renderAssetPreview = (asset) => {
        if (isImage(asset)) {
            return (
                <img
                    src={asset}
                    alt='Preview'
                    className='max-w-full max-h-full object-contain rounded-md shadow-2xl'
                    onClick={(e) => e.stopPropagation()}
                />
            );
        } else if (isVideo(asset)) {
            return (
                <video
                    src={asset}
                    controls
                    className='max-w-full max-h-full rounded-md shadow-2xl'
                    onClick={(e) => e.stopPropagation()}
                />
            );
        } else if (isAudio(asset)) {
            return (
                <audio
                    src={asset}
                    controls
                    className='w-full max-w-md shadow-md rounded-full bg-white p-2'
                    onClick={(e) => e.stopPropagation()}
                />
            );
        } else if (isPdf(asset)) {
            return (
                <iframe
                    src={asset}
                    className='w-full h-full rounded-md bg-white'
                    title='Document Preview'
                />
            );
        } else if (isDoc(asset) || isPPT(asset)) {
            return (
                <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(asset)}`}
                    className='w-full h-full rounded-md bg-white'
                    title='Document Preview'
                />
            );
        } else {
            return (
                <div className='bg-white p-10 rounded-md shadow-md text-center'>
                    <FaFileAlt size={50} className='text-gray-500 mx-auto mb-4' />
                    <p className='text-gray-700'>Preview not available for this file type.</p>
                </div>
            );
        }
    };

    const [selected, setSelected] = useState(0);
    const task = data?.task || [];



    const handleSubmitAction = async (el) => {
        try {
            const data = {
                id: el.id,
                subId: el.subId,
                status: !el.status,
            };
            const res = await subTaskAction({
                ...data,
            }).unwrap();

            toast.success(res?.message);
            refetch();



        } catch (err) {
            console.log(err);
            toast.error(err?.data?.message || err.error);
        }
    };

    const deleteAssetHandler = async (assetUrl) => {
        try {
            const res = await deleteAsset({
                id,
                assetUrl,
            }).unwrap();

            toast.success(res?.message);
            refetch();
        } catch (err) {
            console.log(err);
            toast.error(err?.data?.message || err.error);
        }
    };

    if (isLoading)
        return (
            <div className='py-10'>
                <Loading />
            </div>
        );

    const percentageCompleted =
        task?.subTasks?.length === 0
            ? 0
            : (getCompletedSubTasks(task?.subTasks) / task?.subTasks?.length) * 100;

    return (
        <div className='w-full flex flex-col gap-3 mb-4 overflow-y-hidden'>
            {/* Asset Preview Modal */}
            {viewAsset && (
                <div
                    className='fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm'
                    onClick={() => setViewAsset(null)}
                >
                    <div className='relative w-full h-full max-w-6xl max-h-[90vh] p-4 flex items-center justify-center'>
                        <button
                            onClick={() => setViewAsset(null)}
                            className='absolute top-5 right-5 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-all z-10'
                        >
                            <MdClose size={30} />
                        </button>

                        <a
                            href={viewAsset}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className='absolute top-5 right-20 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-all z-10'
                            title="Download Asset"
                        >
                            <MdDownload size={30} />
                        </a>

                        {renderAssetPreview(viewAsset)}
                    </div>
                </div>
            )}

            {/* task detail */}
            <h1 className='text-2xl text-gray-600 font-bold'>{task?.title}</h1>
            <Tabs tabs={TABS} setSelected={setSelected}>
                {selected === 0 ? (
                    <>
                        <div className='w-full flex flex-col md:flex-row gap-5 2xl:gap-8 bg-white shadow rounded-md px-8 py-8 overflow-y-auto'>
                            <div className='w-full md:w-1/2 space-y-8'>
                                <div className='flex items-center gap-5'>
                                    <div
                                        className={clsx(
                                            "flex gap-1 items-center text-base font-semibold px-3 py-1 rounded-full",
                                            PRIOTITYSTYELS[task?.priority],
                                            bgColor[task?.priority]
                                        )}
                                    >
                                        <span className='text-lg'>{ICONS[task?.priority]}</span>
                                        <span className='uppercase'>{task?.priority} Priority</span>
                                    </div>

                                    <div className={clsx("flex items-center gap-2")}>
                                        <TaskColor className={TASK_TYPE[task?.stage]} />
                                        <span className='text-black uppercase'>{task?.stage}</span>
                                    </div>
                                </div>

                                <p className='text-gray-500'>
                                    Created At: {new Date(task?.date).toDateString()}
                                </p>

                                <div className='flex items-center gap-8 p-4 border-y border-gray-200'>
                                    <div className='space-x-2'>
                                        <span className='font-semibold'>Assets :</span>
                                        <span>{task?.assets?.length}</span>
                                    </div>
                                    <span className='text-gray-400'>|</span>
                                    <div className='space-x-2'>
                                        <span className='font-semibold'>Sub-Task :</span>
                                        <span>{task?.subTasks?.length}</span>
                                    </div>
                                </div>

                                <div className='space-y-4 py-6'>
                                    <p className='text-gray-500 font-semibold text-sm'>
                                        TASK TEAM
                                    </p>
                                    <div className='space-y-3'>
                                        {task?.team?.map((m, index) => (
                                            <div
                                                key={index + m?._id}
                                                className='flex gap-4 py-2 items-center border-t border-gray-200'
                                            >
                                                <div
                                                    className={
                                                        "w-10 h-10 rounded-full text-white flex items-center justify-center text-sm -mr-1 bg-blue-600"
                                                    }
                                                >
                                                    <span className='text-center'>
                                                        {getInitials(m?.name)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className='text-lg font-semibold'>{m?.name}</p>
                                                    <span className='text-gray-500'>{m?.title}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {task?.subTasks?.length > 0 && (
                                    <div className='space-y-4 py-6'>
                                        <div className='flex items-center gap-5'>
                                            <p className='text-gray-500 font-semibold text-sm'>
                                                SUB-TASKS
                                            </p>
                                            <div
                                                className={`w-fit h-8 px-2 rounded-full flex items-center justify-center text-white ${percentageCompleted < 50
                                                    ? "bg-rose-600"
                                                    : percentageCompleted < 80
                                                        ? "bg-amber-600"
                                                        : "bg-emerald-600"
                                                    }`}
                                            >
                                                <p>{percentageCompleted.toFixed(2)}%</p>
                                            </div>
                                        </div>
                                        <div className='space-y-8'>
                                            {task?.subTasks?.map((el, index) => (
                                                <div key={index + el?._id} className='flex gap-3'>
                                                    <div className='w-10 h-10 flex items-center justify-center rounded-full bg-violet-200'>
                                                        <MdTaskAlt className='text-violet-600' size={26} />
                                                    </div>

                                                    <div className='space-y-1'>
                                                        <div className='flex gap-2 items-center'>
                                                            <span className='text-sm text-gray-500'>
                                                                {new Date(el?.date).toDateString()}
                                                            </span>

                                                            <span className='px-2 py-0.5 text-center text-sm rounded-full bg-violet-100 text-violet-700 font-semibold lowercase'>
                                                                {el?.tag}
                                                            </span>

                                                            <span
                                                                className={`px-2 py-0.5 text-center text-sm rounded-full font-semibold ${el?.isCompleted
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-amber-50 text-amber-600"
                                                                    }`}
                                                            >
                                                                {el?.isCompleted ? "done" : "in progress"}
                                                            </span>
                                                        </div>
                                                        <p className='text-gray-700 pb-2'>{el?.title}</p>

                                                        <>
                                                            <button
                                                                disabled={isSubmitting}
                                                                className={`text-sm outline-none bg-gray-100 text-gray-800 p-1 rounded ${el?.isCompleted
                                                                    ? "hover:bg-rose-100 hover:text-rose-800"
                                                                    : "hover:bg-emerald-100 hover:text-emerald-800"
                                                                    } disabled:cursor-not-allowed`}
                                                                onClick={() =>
                                                                    handleSubmitAction({
                                                                        status: el?.isCompleted,
                                                                        id: task?._id,
                                                                        subId: el?._id,
                                                                    })
                                                                }
                                                            >
                                                                {isSubmitting ? (
                                                                    <FaSpinner className='animate-spin' />
                                                                ) : el?.isCompleted ? (
                                                                    " Mark as Undone"
                                                                ) : (
                                                                    " Mark as Done"
                                                                )}
                                                            </button>
                                                        </>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className='w-full md:w-1/2 space-y-3'>
                                {task?.description && (
                                    <div className='mb-10'>
                                        <p className='text-lg font-semibold'>TASK DESCRIPTION</p>
                                        <div className='w-full'>{task?.description}</div>
                                    </div>
                                )}

                                {task?.assets?.length > 0 && (
                                    <div className='pb-10'>
                                        <div className='flex items-center justify-between mb-2'>
                                            <p className='text-lg font-semibold'>ASSETS</p>
                                            <button
                                                onClick={() => {
                                                    setAiPanelOpen(true);
                                                    setAiPanelMinimized(false);
                                                }}
                                                className='flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-full hover:shadow-lg hover:shadow-violet-300 transition-all duration-300 hover:scale-105'
                                            >
                                                <FaRobot size={14} />
                                                <span>Review with AI</span>
                                            </button>
                                        </div>
                                        <div className='w-full grid grid-cols-1 md:grid-cols-2 gap-4'>
                                            {task?.assets?.map((el, index) => (
                                                <div
                                                    key={index}
                                                    className='relative group flex items-center justify-center bg-gray-50 rounded-md border border-gray-200 overflow-hidden h-44 2xl:h-52'
                                                >
                                                    {isImage(el) ? (
                                                        <img
                                                            src={el}
                                                            alt={index}
                                                            onClick={() => selectedAssetHandler(el)}
                                                            className='w-full h-full object-cover cursor-pointer transition-all duration-700 md:hover:scale-110'
                                                        />
                                                    ) : isVideo(el) ? (
                                                        <video
                                                            src={el}
                                                            onClick={() => selectedAssetHandler(el)}
                                                            className='w-full h-full object-cover cursor-pointer'
                                                            muted
                                                        />
                                                    ) : isAudio(el) ? (
                                                        <div
                                                            onClick={() => selectedAssetHandler(el)}
                                                            className='flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-blue-600'
                                                        >
                                                            <FaMusic size={40} />
                                                            <span className='text-sm mt-2'>Audio File</span>
                                                        </div>
                                                    ) : isPdf(el) ? (
                                                        <div
                                                            onClick={() => selectedAssetHandler(el)}
                                                            className='flex flex-col items-center justify-center cursor-pointer text-red-500 hover:text-red-700'
                                                        >
                                                            <FaFilePdf size={40} />
                                                            <span className='text-sm mt-2'>PDF Document</span>
                                                        </div>
                                                    ) : isDoc(el) ? (
                                                        <div
                                                            onClick={() => selectedAssetHandler(el)}
                                                            className='flex flex-col items-center justify-center cursor-pointer text-blue-500 hover:text-blue-700'
                                                        >
                                                            <FaFileWord size={40} />
                                                            <span className='text-sm mt-2'>Word Document</span>
                                                        </div>
                                                    ) : isPPT(el) ? (
                                                        <div
                                                            onClick={() => selectedAssetHandler(el)}
                                                            className='flex flex-col items-center justify-center cursor-pointer text-orange-500 hover:text-orange-700'
                                                        >
                                                            <FaFilePowerpoint size={40} />
                                                            <span className='text-sm mt-2'>PowerPoint Presentation</span>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => selectedAssetHandler(el)}
                                                            className='flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700'
                                                        >
                                                            <FaFileAlt size={40} />
                                                            <span className='text-sm mt-2'>File</span>
                                                        </div>
                                                    )}

                                                    {user?.isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteAssetHandler(el);
                                                            }}
                                                            className='absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                                                            title='Delete Asset'
                                                        >
                                                            <MdOutlineDelete />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {task?.links?.length > 0 && (
                                    <div className=''>
                                        <p className='text-lg font-semibold'>SUPPORT LINKS</p>
                                        <div className='w-full flex flex-col gap-4'>
                                            {task?.links?.map((el, index) => (
                                                <a
                                                    key={index}
                                                    href={el}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                    className='text-blue-600 hover:underline'
                                                >
                                                    {el}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <Activities activity={task?.activities} refetch={refetch} id={id} />
                    </>
                )}
            </Tabs>

            {/* AI Chat Panel */}
            <AiChatPanel
                isOpen={aiPanelOpen && !aiPanelMinimized}
                onClose={() => {
                    setAiPanelOpen(false);
                    setAiPanelMinimized(false);
                }}
                onMinimize={() => setAiPanelMinimized(true)}
                taskId={id}
                assets={task?.assets || []}
            />

            {/* Floating restore pill when minimized */}
            {aiPanelOpen && aiPanelMinimized && (
                <button
                    onClick={() => setAiPanelMinimized(false)}
                    className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-lg shadow-violet-300 hover:shadow-xl hover:shadow-violet-400 hover:scale-105 transition-all duration-300 animate-bounce-slow"
                >
                    <FaRobot size={18} />
                    <span className="font-semibold text-sm">AI Chat</span>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </button>
            )}
        </div>
    );
};

export default TaskDetails;