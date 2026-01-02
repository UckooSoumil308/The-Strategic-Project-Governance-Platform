import React, { useState } from "react";
import Title from "../components/Title";
import Button from "../components/Button";
import { IoMdAdd } from "react-icons/io";
import { summary } from "../assets/data";
import { getInitials } from "../utils";
import clsx from "clsx";
import ConfirmatioDialog, { UserAction } from "../components/Dialogs";
import AddUser from "../components/AddUser";

const Users = () => {
    const [openDialog, setOpenDialog] = useState(false);
    const [open, setOpen] = useState(false);
    const [openAction, setOpenAction] = useState(false);
    const [selected, setSelected] = useState(null);

    const userActionHandler = () => { };
    const deleteHandler = () => { };

    const deleteClick = (id) => {
        setSelected(id);
        setOpenDialog(true);
    };

    const editClick = (el) => {
        setSelected(el);
        setOpen(true);
    };

    const TableHeader = () => (
        <thead className='border-b border-gray-300'>
            <tr className='text-black text-left'>
                <th className='py-4'>Full Name</th>
                <th className='py-4'>Title</th>
                <th className='py-4'>Email</th>
                <th className='py-4'>Role</th>
                <th className='py-4'>Active</th>
            </tr>
        </thead>
    );

    const TableRow = ({ user }) => (
        <tr className='border-b border-gray-200 text-gray-600 hover:bg-gray-400/10'>
            <td className='py-4 px-2'>
                <div className='flex items-center gap-4'>
                    <div className='w-10 h-10 rounded-full text-white flex items-center justify-center text-sm bg-blue-700'>
                        <span className='text-xs md:text-sm text-center'>
                            {getInitials(user.name)}
                        </span>
                    </div>
                    {user.name}
                </div>
            </td>

            <td className='py-4 px-2'>{user.title}</td>
            <td className='py-4 px-2'>{user.email || "user.emal.com"}</td>
            <td className='py-4 px-2'>{user.role}</td>

            <td>
                <button
                    // onClick={() => userStatusClick(user)}
                    className={clsx(
                        "w-fit px-4 py-1 rounded-full",
                        user?.isActive ? "bg-blue-200" : "bg-yellow-100"
                    )}
                >
                    {user?.isActive ? "Active" : "Disabled"}
                </button>
            </td>

            <td className='py-4 px-2 flex gap-6 justify-end'>
                <Button
                    className='text-blue-600 hover:text-blue-500 font-semibold sm:px-0'
                    label='Edit'
                    type='button'
                    onClick={() => editClick(user)}
                />

                <Button
                    className='text-red-700 hover:text-red-500 font-semibold sm:px-0'
                    label='Delete'
                    type='button'
                    onClick={() => deleteClick(user?._id)}
                />
            </td>
        </tr >
    );

    return (
        <>
            <div className='w-full md:px-1 px-0 mb-6'>
                <div className='flex items-center justify-between mb-8' style={{ marginBottom: '40px' }}>
                    <Title title='  Team Members' />
                    <Button
                        label='Add New User'
                        icon={<IoMdAdd className='text-lg' />}
                        className='flex flex-row-reverse gap-1 items-center bg-blue-600 text-white rounded-md 2xl:py-2.5'
                        onClick={() => setOpen(true)}
                    />
                </div>

                <div className='bg-white px-4 md:px-8 py-8 shadow-md rounded-lg' style={{ padding: '32px' }}>
                    <div className='overflow-x-auto'>
                        <table className='w-full mb-5'>
                            <TableHeader />
                            <tbody>
                                {summary.users?.map((user, index) => (
                                    <TableRow key={index} user={user} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AddUser
                open={open}
                setOpen={setOpen}
                userData={selected}
                key={new Date().getTime().toString()}
            />

            <ConfirmatioDialog
                open={openDialog}
                setOpen={setOpenDialog}
                onClick={deleteHandler}
            />

            <UserAction
                open={openAction}
                setOpen={setOpenAction}
                onClick={userActionHandler}
            />
        </>
    );
};

export default Users;