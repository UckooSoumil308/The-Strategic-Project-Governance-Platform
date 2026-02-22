import React, { useEffect, useState } from "react";
import { MdOutlineSearch } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { setOpenSidebar } from "../redux/slices/authSlice";
import NotificationPanel from "./NotificationPanel";
import UserAvater from "./UserAvater";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { updateURL } from "../utils";

const Navbar = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(
        searchParams.get("search") || ""
    );

    useEffect(() => {
        updateURL({ searchTerm, navigate, location });
    }, [searchTerm]);

    const handleSubmit = (e) => {
        e.preventDefault();
        window.location.reload();
    };

    return (
        <div className='flex justify-between items-center bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-md px-6 py-4 sticky z-10 top-0 border-b border-gray-100 dark:border-gray-800 shadow-sm'>
            <div className='flex gap-4'>
                <div className=''>
                    <button
                        onClick={() => dispatch(setOpenSidebar(true))}
                        className='text-2xl text-gray-500 block md:hidden'
                    >
                        ☰
                    </button>
                </div>

                {location?.pathname !== "/dashboard" && (
                    <form
                        onSubmit={handleSubmit}
                        className='w-64 2xl:w-[400px] flex items-center py-2.5 px-4 gap-3 rounded-full bg-gray-50 border border-gray-200 dark:border-gray-700 dark:bg-gray-800/50 hover:bg-white focus-within:bg-white hover:border-indigo-300 focus-within:border-indigo-500 focus-within:shadow-md focus-within:shadow-indigo-100 dark:hover:bg-gray-800 dark:focus-within:bg-gray-800 dark:focus-within:shadow-none transition-all duration-300 group'
                    >
                        <MdOutlineSearch className='text-gray-400 group-focus-within:text-indigo-500 text-xl transition-colors duration-300' />

                        <input
                            onChange={(e) => setSearchTerm(e.target.value)}
                            value={searchTerm}
                            type='text'
                            placeholder='Search anything...'
                            className='flex-1 outline-none bg-transparent placeholder:text-gray-400 text-gray-700 dark:text-gray-200 font-medium'
                        />
                    </form>
                )}
            </div>

            <div className='flex gap-2 items-center'>
                <NotificationPanel />

                <UserAvater />
            </div>
        </div>
    );
};

export default Navbar;