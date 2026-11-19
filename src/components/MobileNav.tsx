'use client';

import React, { useEffect, useRef } from 'react';
import { 
  Menu, X, Sparkles, LayoutDashboard, FileSearch, 
  FileText, BarChart3, Settings, HelpCircle, Plus,
  ChevronRight, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function MobileNav({ isOpen, onToggle, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevPathnameRef = useRef(pathname);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close mobile drawer only when route actually changes
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      onCloseRef.current();
    }
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Release scroll lock and close drawer when viewport enters desktop breakpoint (>= 1024px)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches && isOpen) {
        onClose();
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [isOpen, onClose]);

  // Focus management: move focus into drawer on open, trap focus inside, restore on close
  useEffect(() => {
    if (isOpen) {
      // Focus the close button when opened
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab' && drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const firstEl = focusable[0];
          const lastEl = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      };

      window.addEventListener('keydown', handleTabKey);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleTabKey);
        // Restore focus to trigger when closed
        triggerRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileSearch, label: 'Analyze', path: '/analyze' },
    { icon: FileText, label: 'Results', path: '/results' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help & Docs', path: '/help' },
  ];

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-xl border-b border-zinc-200/70 z-30 px-4 sm:px-6 flex items-center justify-between select-none shadow-xs">
        {/* Left: Hamburger Button with animated icon transition */}
        <motion.button
          ref={triggerRef}
          onClick={onToggle}
          whileTap={{ scale: 0.92 }}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation-drawer"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 transition-colors cursor-pointer border border-zinc-200/60"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5 text-zinc-800" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Menu className="h-5 w-5 text-zinc-800" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Center: Brand Identity */}
        <Link 
          href="/" 
          onClick={onClose}
          className="flex items-center gap-2.5 active:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-sm shadow-indigo-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-sm font-extrabold tracking-tight text-zinc-900 leading-tight">DocuLens</span>
            <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest leading-none">Glass Lab</span>
          </div>
        </Link>

        {/* Right: Quick Action Button with explicit accessible name */}
        <Link
          href="/analyze"
          aria-label="Launch document analysis"
          className="flex h-8.5 items-center gap-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Analyze</span>
        </Link>
      </header>

      {/* Slide-over Mobile Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation Menu">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              onClick={onClose}
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
              aria-hidden="true"
            />

            {/* Slide-in Drawer Container */}
            <motion.aside
              id="mobile-navigation-drawer"
              ref={drawerRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-72 sm:w-80 max-w-[85vw] h-full bg-white/95 backdrop-blur-2xl border-r border-zinc-200/80 shadow-2xl flex flex-col justify-between p-5 z-50 select-none overflow-y-auto"
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-150">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/10">
                      <Sparkles className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <span className="font-heading text-base font-extrabold tracking-tight text-zinc-900 block leading-tight">
                        DocuLens
                      </span>
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block">
                        AI Document Grounding
                      </span>
                    </div>
                  </div>

                  {/* Close button with ref for focus management */}
                  <motion.button
                    ref={closeButtonRef}
                    onClick={onClose}
                    whileTap={{ scale: 0.9 }}
                    className="h-8 w-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors focus:ring-2 focus:ring-indigo-500/30"
                    aria-label="Close navigation menu"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>

                {/* Primary Nav List */}
                <nav className="space-y-1" aria-label="Main navigation links">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 block mb-2">
                    Navigation
                  </span>
                  {navItems.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={onClose}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 font-sans text-sm font-semibold",
                          isActive
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold shadow-xs"
                            : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "text-zinc-400")} />
                          <span>{item.label}</span>
                        </div>
                        {isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-zinc-350" />
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {/* Quick New Project Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-purple-50/70 border border-indigo-100/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">DocuLens AI Ready</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
                    Upload new specifications or review conflict alerts across documents.
                  </p>
                  <Link
                    href="/analyze"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors pt-1"
                  >
                    <span>Launch Analysis</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Bottom Nav / Settings */}
              <div className="space-y-4 pt-4 border-t border-zinc-150">
                <nav className="space-y-1" aria-label="Secondary navigation links">
                  {bottomItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors font-sans text-xs font-semibold",
                          isActive
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold"
                            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-zinc-400")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                {/* Environment badge */}
                <div className="px-3.5 py-2 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                  <span>DocuLens v2.4</span>
                  <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    Online
                  </span>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
