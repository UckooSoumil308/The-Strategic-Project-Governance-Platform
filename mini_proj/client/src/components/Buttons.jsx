import clsx from "clsx";
import React from "react";

const Button = ({ icon, className, label, type, onClick = () => { } }) => {
    return (
        <button
            type={type || "button"}
            className={clsx("px-3 py-2 outline-none transition-all duration-300 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed", className)}
            onClick={onClick}
        >
            <span>{label}</span>
            {icon && icon}
        </button>
    );
};

export default Button;