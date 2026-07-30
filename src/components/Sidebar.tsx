'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, BarChart3, Settings, HelpCircle, 
  ChevronLeft, ChevronRight, FileSearch, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapse state from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileSearch, label: 'Analyze', path: '/analyze' },
    { icon: FileText, label: 'Results', path: '/results' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col justify-between border-r border-zinc-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden select-none",
        isCollapsed ? "items-center py-6" : "p-6"
      )}
    >
      <div className="w-full space-y-8">
        {/* Brand logo/branding */}
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "px-2")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/10">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col"
            >
              <span className="font-heading text-base font-bold tracking-tight text-zinc-900">DocuLens</span>
              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-0.5">Glass Laboratory</span>
            </motion.div>
          )}
        </div>

        {/* Main navigation */}
        <nav className="space-y-1.5 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} className="relative block w-full">
                <div
                  className={cn(
                    "flex items-center gap-3.5 h-11 rounded-xl transition-all duration-200 font-sans text-sm relative z-10",
                    isCollapsed ? "justify-center px-0 w-11 h-11 mx-auto" : "px-4.5",
                    isActive 
                      ? "text-indigo-600 font-semibold bg-indigo-500/8 border border-indigo-500/10" 
                      : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 border border-transparent"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-600" : "text-zinc-450")} />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>

                {/* Left Active spring bar indicator */}
                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-indigo-600 z-20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="w-full space-y-6">
        {/* Help & Settings */}
        <div className="space-y-1.5 w-full border-t border-zinc-150 pt-6">
          {bottomItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} className="relative block w-full">
                <div
                  className={cn(
                    "flex items-center gap-3.5 h-11 rounded-xl transition-all duration-200 font-sans text-sm",
                    isCollapsed ? "justify-center px-0 w-11 h-11 mx-auto" : "px-4.5",
                    isActive 
                      ? "text-indigo-650 font-semibold bg-indigo-50" 
                      : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-600" : "text-zinc-450")} />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Sidebar collapse button */}
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm cursor-pointer mx-auto w-full max-w-[212px] h-9 gap-2 shrink-0 text-zinc-450"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Collapse menu</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
