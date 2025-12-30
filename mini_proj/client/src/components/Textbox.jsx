import React from 'react'
import clsx from "clsx";
const Textbox = React.forwardRef(
    ({ type, placeholder, label, className, register, name, error }, ref) => {
        return (
            <div className='w-full flex flex-col gap-2'>
                {label && (
                    <label htmlFor={name} className='text-slate-800'>
                        {label}
                    </label>
                )}

                <div>
                    <input
                        type={type}
                        name={name}
                        placeholder={placeholder}
                        ref={ref}
                        {...register}
                        aria-invalid={error ? "true" : "false"}
                        className={clsx(
                            "bg-transparent px-3 py-4 2xl:py-5 border border-gray-300 placeholder-gray-400 text-gray-900 outline-none text-base focus:ring-2 ring-blue-300/50 focus:border-blue-600 transition-all duration-300 ease-in-out",
                            className
                        )}
                    />
                </div>
                {error && (
                    <span className='text-xs text-[#f64949fe] mt-0.5 '>{error}</span>
                )}
            </div>
        );
    }
);

export default Textbox;