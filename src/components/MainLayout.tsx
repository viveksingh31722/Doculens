'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { cn } from '@/lib/utils';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    // Read saved desktop sidebar collapse state from localStorage
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar-collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const handleToggleMobileNav = useCallback(() => {
    setIsMobileNavOpen((prev) => !prev);
  }, []);

  const handleCloseMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 relative font-sans overflow-x-hidden">
      {/* Mobile & Tablet Header + Slide-over Drawer */}
      <MobileNav 
        isOpen={isMobileNavOpen}
        onToggle={handleToggleMobileNav}
        onClose={handleCloseMobileNav}
      />

      {/* Desktop Sidebar (visible on lg: >= 1024px) */}
      <Sidebar 
        isCollapsed={isCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Main scrollable content pane */}
      <div 
        className={cn(
          "flex-1 min-h-screen flex flex-col transition-[padding] duration-300 w-full min-w-0 pt-16 lg:pt-0",
          isCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
        )}
      >
        {children}
      </div>
    </div>
  );
}
