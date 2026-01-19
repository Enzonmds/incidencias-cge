import React from 'react';

const variants = {
    primary: 'bg-cge-blue text-white hover:bg-opacity-90 shadow-sm hover:shadow-md hover:-translate-y-0.5',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
    danger: 'bg-cge-red text-white hover:bg-red-700 shadow-sm hover:shadow-md',
    outline: 'border-2 border-cge-blue text-cge-blue hover:bg-blue-50',
    white: 'bg-white text-cge-blue hover:bg-blue-50 shadow-sm hover:shadow-md'
};

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    return (
        <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cge-blue ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
