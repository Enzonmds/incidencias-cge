import React from 'react';

const Card = ({ children, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-dark-card rounded-lg shadow-sm border border-slate-200 dark:border-dark-border 
        transition-colors duration-200 p-6 ${className}`}>
            {children}
        </div>
    );
};

export default Card;
