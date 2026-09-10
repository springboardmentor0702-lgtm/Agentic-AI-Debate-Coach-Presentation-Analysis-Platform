import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
export const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (<div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}/>
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>);
};
