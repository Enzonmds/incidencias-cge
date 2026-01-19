import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-cge-bg">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 p-4 md:ml-64 md:p-8 overflow-y-auto w-full transition-all duration-300">
                {/* Mobile Header Trigger */}
                <div className="md:hidden flex items-center gap-3 mb-6">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 bg-white rounded-lg shadow text-gray-600 hover:bg-gray-50"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-gray-700">Menú</span>
                </div>

                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
