import React from 'react';

const variants = {
    primary: 'bg-cge-blue text-white hover:bg-opacity-90',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-cge-red text-white hover:bg-opacity-90',
    outline: 'border-2 border-cge-blue text-cge-blue hover:bg-cge-blue hover:text-white'
};

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    return (
        <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
