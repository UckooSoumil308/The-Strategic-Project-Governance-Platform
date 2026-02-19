import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { BiImages } from "react-icons/bi";
import { toast } from "sonner";

import {
    useCreateTaskMutation,
    useUpdateTaskMutation,
} from "../../redux/slices/api/taskApiSlice";
import { dateFormatter } from "../../utils";
import { supabase } from "../../config/supabaseClient";
import Button from "../Button";
import Loading from "../Loader";
import ModalWrapper from "../ModalWrapper";
import GovernanceModal from "../GovernanceModal";
import SelectList from "../SelectList";
import Textbox from "../Textbox";
import UserList from "./UsersSelect";

const LISTS = ["TODO", "IN PROGRESS", "COMPLETED"];
const PRIORIRY = ["HIGH", "MEDIUM", "NORMAL", "LOW"];

const uploadFile = async (file) => {
    const fileName = `${new Date().getTime()}_${file.name}`;

    const { data, error } = await supabase.storage
        .from("project-assets")
        .upload(fileName, file, { upsert: true });

    if (error) {
        throw error;
    }

    const { data: urlData } = supabase.storage
        .from("project-assets")
        .getPublicUrl(data.path);

    return urlData.publicUrl;
};

const AddTask = ({ open, setOpen, task }) => {
    const defaultValues = {
        title: task?.title || "",
        date: dateFormatter(task?.date || new Date()),
        team: [],
        stage: "",
        priority: "",
        assets: [],
        description: "",
        links: "",
    };
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        reset,
    } = useForm({ defaultValues });

    const [stage, setStage] = useState(task?.stage?.toUpperCase() || LISTS[0]);
    const [team, setTeam] = useState(task?.team || []);
    const [priority, setPriority] = useState(
        task?.priority?.toUpperCase() || PRIORIRY[2]
    );
    const [assets, setAssets] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Governance state
    const [governanceBlock, setGovernanceBlock] = useState(false);
    const [governanceReason, setGovernanceReason] = useState("");
    const [governanceTaskTitle, setGovernanceTaskTitle] = useState("");

    const [createTask, { isLoading }] = useCreateTaskMutation();
    const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
    const URLS = task?.assets ? [...task.assets] : [];

    useEffect(() => {
        if (task) {
            setValue("title", task?.title || "");
            setValue("date", dateFormatter(task?.date || new Date()));
            setValue("priority", task?.priority?.toUpperCase() || PRIORIRY[2]);
            setValue("stage", task?.stage?.toUpperCase() || LISTS[0]);
            setValue("team", task?.team || []);
            setValue("assets", task?.assets || []);
            setValue("description", task?.description || "");
            setValue("links", task?.links || "");

            setStage(task?.stage?.toUpperCase() || LISTS[0]);
            setPriority(task?.priority?.toUpperCase() || PRIORIRY[2]);
            setTeam(task?.team || []);
        } else {
            // Reset to defaults if task is null (new task)
            reset(defaultValues);
            setStage(LISTS[0]);
            setPriority(PRIORIRY[2]);
            setTeam([]);
        }
    }, [task, setValue, reset]);

    const handleOnSubmit = async (data) => {
        const uploadedFileURLs = [];

        for (const file of assets) {
            setUploading(true);
            try {
                const url = await uploadFile(file);
                uploadedFileURLs.push(url);
            } catch (error) {
                console.error("Error uploading file:", error.message);
                toast.error("File upload failed: " + error.message);
                setUploading(false);
                return;
            }
        }
        setUploading(false);

        try {
            const newData = {
                ...data,
                assets: [...URLS, ...uploadedFileURLs],
                team,
                stage,
                priority,
            };
            const res = task?._id
                ? await updateTask({ ...newData, _id: task._id }).unwrap()
                : await createTask(newData).unwrap();

            toast.success(res.message);

            setTimeout(() => {
                setOpen(false);
            }, 500);
        } catch (err) {
            console.log(err);
            // Check for 403 governance block
            if (err?.status === 403 && err?.data?.governance) {
                setGovernanceTaskTitle(err?.data?.task?.title || data.title || "Untitled Task");
                setGovernanceReason(err?.data?.governance?.reason || "Strategic drift detected.");
                setGovernanceBlock(true);
                setOpen(false);
            } else {
                toast.error(err?.data?.message || err.error);
            }
        }
    };

    const handleSelect = (e) => {
        setAssets(e.target.files);
    };

    return (
        <>
            <ModalWrapper open={open} setOpen={setOpen}>
                <form onSubmit={handleSubmit(handleOnSubmit)}>
                    <Dialog.Title
                        as='h2'
                        className='text-base font-bold leading-6 text-gray-900 mb-4'
                    >
                        {task ? "UPDATE TASK" : "ADD TASK"}
                    </Dialog.Title>

                    <div className='mt-2 flex flex-col gap-6'>
                        <Textbox
                            placeholder='Task title'
                            type='text'
                            name='title'
                            label='Task Title'
                            className='w-full rounded'
                            register={register("title", {
                                required: "Title is required!",
                            })}
                            error={errors.title ? errors.title.message : ""}
                        />
                        <UserList setTeam={setTeam} team={team} />
                        <div className='flex gap-4'>
                            <SelectList
                                label='Task Stage'
                                lists={LISTS}
                                selected={stage}
                                setSelected={setStage}
                            />
                            <SelectList
                                label='Priority Level'
                                lists={PRIORIRY}
                                selected={priority}
                                setSelected={setPriority}
                            />
                        </div>
                        <div className='flex gap-4'>
                            <div className='w-full'>
                                <Textbox
                                    placeholder='Date'
                                    type='date'
                                    name='date'
                                    label='Task Date'
                                    className='w-full rounded'
                                    register={register("date", {
                                        required: "Date is required!",
                                    })}
                                    error={errors.date ? errors.date.message : ""}
                                />
                            </div>
                            <div className='w-full flex items-center justify-center mt-4'>
                                <label
                                    className='flex items-center gap-1 text-base text-ascent-2 hover:text-ascent-1 cursor-pointer my-4'
                                    htmlFor='imgUpload'
                                >
                                    <input
                                        type='file'
                                        className='hidden'
                                        id='imgUpload'
                                        onChange={(e) => handleSelect(e)}
                                        accept='.jpg, .png, .jpeg, .pdf, .doc, .docx, .ppt, .pptx, .mp4, .avi, .mov, .mp3, .wav'
                                        multiple={true}
                                    />
                                    <BiImages />
                                    <span>Add Assets</span>
                                </label>
                            </div>
                        </div>

                        <div className='w-full'>
                            <p>Task Description</p>
                            <textarea
                                name='description'
                                {...register("description")}
                                className='w-full bg-transparent px-3 py-1.5 2xl:py-3 border border-gray-300
            dark:border-gray-600 placeholder-gray-300 dark:placeholder-gray-700
            text-gray-900 dark:text-white outline-none text-base focus:ring-2
            ring-blue-300'
                            ></textarea>
                        </div>

                        <div className='w-full'>
                            <p>
                                Add Links{" "}
                                <span className='text- text-gray-600'>
                                    seperated by comma (,)
                                </span>
                            </p>
                            <textarea
                                name='links'
                                {...register("links")}
                                className='w-full bg-transparent px-3 py-1.5 2xl:py-3 border border-gray-300
            dark:border-gray-600 placeholder-gray-300 dark:placeholder-gray-700
            text-gray-900 dark:text-white outline-none text-base focus:ring-2
            ring-blue-300'
                            ></textarea>
                        </div>
                    </div>

                    {isLoading || isUpdating || uploading ? (
                        <div className='py-4'>
                            <Loading />
                            {isLoading && !task?._id && (
                                <p className='text-xs text-blue-500 text-center mt-2 animate-pulse'>
                                    AI Judge evaluating strategic fit…
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className='bg-gray-50 mt-6 mb-4 sm:flex sm:flex-row-reverse gap-4'>
                            <Button
                                label='Submit'
                                type='submit'
                                className='bg-blue-600 px-8 text-sm font-semibold text-white hover:bg-blue-700  sm:w-auto'
                            />

                            <Button
                                type='button'
                                className='bg-white px-5 text-sm font-semibold text-gray-900 sm:w-auto'
                                onClick={() => setOpen(false)}
                                label='Cancel'
                            />
                        </div>
                    )}
                </form>
            </ModalWrapper>

            {/* Governance Drift Modal — renders after form closes on 403 */}
            <GovernanceModal
                open={governanceBlock}
                setOpen={setGovernanceBlock}
                reason={governanceReason}
                taskTitle={governanceTaskTitle}
            />
        </>
    );
};

export { GovernanceModal };
export default AddTask;