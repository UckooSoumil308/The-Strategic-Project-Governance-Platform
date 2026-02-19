import React from "react";
import { useGetGovernanceTasksQuery, useReviewGovernanceTaskMutation } from "../redux/slices/api/taskApiSlice";
import Title from "../components/Title";
import Button from "../components/Button";
import { MdOutlineCheckCircle, MdOutlineCancel } from "react-icons/md";
import { toast } from "sonner";
import Loading from "../components/Loader";
import clsx from "clsx";
import { PRIOTITYSTYELS, TASK_TYPE, formatDate } from "../utils";
import UserInfo from "../components/UserInfo";

const GovernanceReview = () => {
    const { data, isLoading, refetch } = useGetGovernanceTasksQuery();
    const [reviewTask, { isLoading: isReviewing }] = useReviewGovernanceTaskMutation();

    const handleReview = async (id, status) => {
        try {
            const res = await reviewTask({ id, status }).unwrap();
            toast.success(res?.message);
            refetch();
        } catch (err) {
            console.log(err);
            toast.error(err?.data?.message || err.error);
        }
    };

    if (isLoading) return <div className="py-10"><Loading /></div>;

    return (
        <div className='w-full'>
            <div className='flex items-center justify-between mb-4'>
                <Title title='Governance Review Queue' />
            </div>

            <div className='bg-white px-2 md:px-4 pt-4 pb-9 shadow-md rounded' style={{ padding: '24px' }}>
                <div className='overflow-x-auto'>
                    <table className='w-full'>
                        <thead className='w-full border-b border-gray-300'>
                            <tr className='w-full text-black text-left'>
                                <th className='py-2'>Task Title</th>
                                <th className='py-2'>Priority</th>
                                <th className='py-2'>Created At</th>
                                <th className='py-2'>Team</th>
                                <th className='py-2'>AI Reason</th>
                                <th className='py-2 text-right'>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.tasks?.length === 0 ? (
                                <tr>
                                    <td colSpan='6' className='text-center py-10 text-gray-500'>
                                        No pending governance reviews.
                                    </td>
                                </tr>
                            ) : (
                                data?.tasks?.map((task) => (
                                    <tr key={task._id} className='border-b border-gray-200 text-gray-600 hover:bg-gray-300/10' style={{ height: '60px' }}>
                                        <td className='py-2'>
                                            <div className='flex items-center gap-2'>
                                                <div className={clsx("w-4 h-4 rounded-full", TASK_TYPE[task.stage])} />
                                                <p className='w-full line-clamp-2 text-base text-black'>
                                                    {task?.title}
                                                </p>
                                            </div>
                                        </td>
                                        <td className='py-2'>
                                            <div className='flex gap-1 items-center'>
                                                <span className={clsx("text-lg", PRIOTITYSTYELS[task?.priority])}></span>
                                                <span className='capitalize'>{task?.priority}</span>
                                            </div>
                                        </td>
                                        <td className='py-2'>
                                            <span className='text-sm text-gray-600'>
                                                {formatDate(new Date(task?.date))}
                                            </span>
                                        </td>
                                        <td className='py-2'>
                                            <div className='flex'>
                                                {task?.team?.map((m, index) => (
                                                    <div
                                                        key={m._id}
                                                        className={clsx(
                                                            "w-7 h-7 rounded-full text-white flex items-center justify-center text-sm -mr-1",
                                                            "bg-blue-600"
                                                        )}
                                                    >
                                                        <UserInfo user={m} />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className='py-2 max-w-xs'>
                                            <p className='text-red-500 text-sm line-clamp-3' title={task.governanceReason}>
                                                {task.governanceReason}
                                            </p>
                                        </td>
                                        <td className='py-2 flex gap-2 justify-end'>
                                            <Button
                                                label='Approve'
                                                icon={<MdOutlineCheckCircle className='text-lg' />}
                                                className='flex flex-row-reverse gap-1 items-center bg-green-600 text-white rounded-md py-1 px-3 hover:bg-green-700'
                                                onClick={() => handleReview(task._id, "approved")}
                                                disabled={isReviewing}
                                            />
                                            <Button
                                                label='Block'
                                                icon={<MdOutlineCancel className='text-lg' />}
                                                className='flex flex-row-reverse gap-1 items-center bg-red-600 text-white rounded-md py-1 px-3 hover:bg-red-700'
                                                onClick={() => handleReview(task._id, "blocked")}
                                                disabled={isReviewing}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GovernanceReview;
