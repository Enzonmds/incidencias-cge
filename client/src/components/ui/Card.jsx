import React from 'react';

const Card = ({ children, className = '' }) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 p-6 ${className}`}>
            {children}
        </div>
    );
};

export default Card;
