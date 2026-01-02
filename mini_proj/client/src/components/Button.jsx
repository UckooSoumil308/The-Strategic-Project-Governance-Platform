import clsx from "clsx";
import React from "react";

const Button = ({ icon, className, label, type, onClick = () => { } }) => {
    return (
        <button
            type={type || "button"}
            className={clsx("px-4 py-2.5 outline-none transition-all duration-300 hover:opacity-90 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium", className)}
            onClick={onClick}
            style={{ padding: '10px 20px', borderRadius: '8px' }}
        >
            <span>{label}</span>
            {icon && icon}
        </button>
    );
};

export default Button;