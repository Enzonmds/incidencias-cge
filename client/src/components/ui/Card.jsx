import React from 'react';

const Card = ({ children, className = '' }) => {
    return (
        <div className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 
        hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out p-6 ${className}`}>
            {children}
        </div>
    );
};

export default Card;
