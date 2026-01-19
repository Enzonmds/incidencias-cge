import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
            <input
                className={`border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-cge-blue transition-shadow ${error ? 'border-cge-red focus:ring-cge-red' : 'border-gray-300'}`}
                {...props}
            />
            {error && <span className="text-xs text-cge-red">{error}</span>}
        </div>
    );
};

export default Input;
