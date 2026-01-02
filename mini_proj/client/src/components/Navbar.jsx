import React from 'react'
import { MdOutlineSearch } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { setOpenSidebar } from "../redux/slices/authSlice";
import UserAvater from './UserAvater';
import NotificationPanel from "./NotificationPanel";
const Navbar = () => {

    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    return (
        <div className='flex justify-between items-center bg-white px-8 py-5 2xl:py-6 sticky z-10 top-0' style={{ padding: '20px 32px' }}>
            <div className='flex gap-6'>
                <button
                    onClick={() => dispatch(setOpenSidebar(true))}
                    className='text-2xl text-gray-500 block md:hidden'
                >
                    ☰
                </button>

                <div className='w-80 2xl:w-[480px] flex items-center py-3 px-4 gap-3 rounded-full bg-[#f3f4f6]'>
                    <MdOutlineSearch className='text-gray-500 text-xl' />

                    <input
                        type='text'
                        placeholder='Search....'
                        className='flex-1 outline-none bg-transparent placeholder:text-gray-500 text-gray-800'
                    />
                </div>
            </div>

            <div className='flex gap-4 items-center' style={{ gap: '20px' }}>
                <NotificationPanel />

                <UserAvater />
            </div>
        </div>
    );
};

export default Navbar;