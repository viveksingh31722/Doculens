'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Sync with sidebar collapse state
    const checkState = () => {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved) {
        setIsCollapsed(saved === 'true');
      }
    };
    checkState();
    
    // Set up an interval or event listener to watch changes
    const interval = setInterval(checkState, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex bg-zinc-50 relative font-sans overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main scrollable content pane */}
      <div 
        className="flex-1 min-h-screen flex flex-col transition-all duration-300"
        style={{ paddingLeft: isCollapsed ? '72px' : '260px' }}
      >
        {children}
      </div>
    </div>
  );
}
