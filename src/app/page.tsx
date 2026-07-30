'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, CheckCircle2, Clock, Zap, Plus, ArrowRight, Loader2, 
  Info, MoreVertical, Edit2, Trash2, Printer, Upload, Sparkles,
  ChevronRight, RefreshCw, BarChart2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { TextEffect } from '@/components/motion-primitives/text-effect';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  _count: {
    documents: number;
  };
}

interface DocumentItem {
  id: string;
  originalName: string;
  mimeType: string;
  documentType: string;
  createdAt: string;
  projectName: string;
  projectId: string;
}

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Active view tabs for the table
  const [tableTab, setTableTab] = useState<'documents' | 'projects'>('documents');

  // Project editing
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeDropdownProjectId, setActiveDropdownProjectId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const projRes = await fetch('/api/projects');
      if (!projRes.ok) throw new Error('Failed to fetch projects');
      const projData = await projRes.json();
      setProjects(projData);

      // Fetch documents for each project to list recent documents
      const docsList: DocumentItem[] = [];
      for (const proj of projData) {
        try {
          const docRes = await fetch(`/api/projects/${proj.id}/documents`);
          if (docRes.ok) {
            const docsData = await docRes.json();
            docsData.forEach((d: any) => {
              docsList.push({
                id: d.id,
                originalName: d.originalName,
                mimeType: d.mimeType,
                documentType: d.documentType,
                createdAt: d.createdAt,
                projectName: proj.name,
                projectId: proj.id
              });
            });
          }
        } catch (e) {
          console.error(`Error loading docs for project ${proj.id}:`, e);
        }
      }

      // Sort documents by date desc
      docsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDocuments(docsList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.dropdown-container')) {
        setActiveDropdownProjectId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error?.message || 'Failed to create project');
      }

      const created = await response.json();
      setName('');
      setDescription('');
      
      // Redirect straight to analysis page with project ID parameter
      router.push(`/analyze?project=${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setIsCreating(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editName.trim()) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      setEditingProject(null);
      await fetchDashboardData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? All documents and findings will be lost.')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchDashboardData();
      } else {
        alert('Failed to delete project');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    }
  };

  // Helper for human-friendly time
  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Animation variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.05 },
    },
  };

  const itemFadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as any } },
  };

  return (
    <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full select-none">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <TextEffect preset="fade-in-blur" per="word" className="font-heading text-2xl sm:text-3xl font-extrabold text-zinc-900">
            Dashboard
          </TextEffect>
          <p className="mt-1 text-xs sm:text-sm text-zinc-450 font-medium">
            Overview of your document analysis activity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex h-10 items-center justify-center rounded-xl bg-white border border-zinc-200 px-4 text-xs font-bold text-zinc-650 hover:text-indigo-650 hover:border-indigo-150 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
          >
            <Printer className="mr-2 h-4 w-4 text-zinc-400" />
            Export Report
          </button>
          <Link
            href="/analyze"
            className="flex h-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white px-5 shadow-md shadow-indigo-600/10 hover:shadow-indigo-650/20 active:scale-[0.98] transition-all gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            New Analysis
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Metric 1 */}
        <motion.div 
          variants={itemFadeUp}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className="glass-panel p-5 rounded-2xl border border-white/60 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 to-purple-600 rounded-l-2xl" />
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              +12.5%
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-extrabold text-zinc-900 tracking-tight">1,284</span>
            <span className="text-[11px] font-bold text-zinc-450 uppercase tracking-wider">Documents Analyzed</span>
          </div>
        </motion.div>

        {/* Metric 2 */}
        <motion.div 
          variants={itemFadeUp}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className="glass-panel p-5 rounded-2xl border border-white/60 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-500 to-teal-600 rounded-l-2xl" />
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              +0.3%
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-extrabold text-zinc-900 tracking-tight">98.7%</span>
            <span className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">Accuracy Rate</span>
          </div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div 
          variants={itemFadeUp}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className="glass-panel p-5 rounded-2xl border border-white/60 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-amber-500 to-orange-600 rounded-l-2xl" />
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              -18%
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-extrabold text-zinc-900 tracking-tight">2.4s</span>
            <span className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">Avg. Processing Time</span>
          </div>
        </motion.div>

        {/* Metric 4 */}
        <motion.div 
          variants={itemFadeUp}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className="glass-panel p-5 rounded-2xl border border-white/60 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-purple-500 to-violet-600 rounded-l-2xl" />
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-650" />
            </div>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              +24%
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-extrabold text-zinc-900 tracking-tight">3,847</span>
            <span className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">API Calls Today</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Chart and Recent Documents */}
        <div className="lg:col-span-2 space-y-8">
          {/* Chart Section */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-heading text-sm font-bold text-zinc-900">Documents This Week</h3>
                <p className="text-[11px] font-medium text-zinc-400 mt-0.5">Processing volume over the last 7 days</p>
              </div>

              {/* Timeframe selectors */}
              <div className="flex bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/50">
                {['1D', '1W', '1M', '1Y'].map((t) => (
                  <button
                    key={t}
                    className={cn(
                      "text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all",
                      t === '1W' 
                        ? "bg-white text-zinc-900 shadow-sm" 
                        : "text-zinc-400 hover:text-zinc-700"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Area Chart */}
            <div className="h-64 w-full relative pt-4">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="160" x2="600" y2="160" stroke="#f1f5f9" strokeWidth="1" />

                {/* Area path */}
                <path
                  d="M 0,115 C 60,105 90,95 150,105 C 210,115 240,130 300,120 C 360,110 390,75 450,75 C 510,75 540,120 600,125 L 600,200 L 0,200 Z"
                  fill="url(#chartGrad)"
                />

                {/* Main line path */}
                <motion.path
                  d="M 0,115 C 60,105 90,95 150,105 C 210,115 240,130 300,120 C 360,110 390,75 450,75 C 510,75 540,120 600,125"
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />

                {/* Highlight Dot */}
                <motion.circle
                  cx="245"
                  cy="125"
                  r="4"
                  fill="#4F46E5"
                  stroke="#ffffff"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 }}
                />
              </svg>

              {/* Chart Tooltip Overlay */}
              <div className="absolute left-[200px] top-[105px] bg-white border border-zinc-200 rounded-xl p-2 shadow-lg text-[10px] space-y-0.5 border border-indigo-100">
                <span className="block text-zinc-400 font-semibold">Wed</span>
                <span className="block font-extrabold text-zinc-800">docs: 98</span>
              </div>

              {/* X Axis Labels */}
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 mt-2 px-1">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>

          {/* Documents/Workspaces Table Block */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-150 pb-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setTableTab('documents')}
                  className={cn(
                    "text-sm font-bold pb-1 transition-all relative border-b-2",
                    tableTab === 'documents' 
                      ? "border-indigo-600 text-zinc-900" 
                      : "border-transparent text-zinc-400 hover:text-zinc-650"
                  )}
                >
                  Recent Documents
                </button>
                <button
                  onClick={() => setTableTab('projects')}
                  className={cn(
                    "text-sm font-bold pb-1 transition-all relative border-b-2",
                    tableTab === 'projects' 
                      ? "border-indigo-600 text-zinc-900" 
                      : "border-transparent text-zinc-400 hover:text-zinc-650"
                  )}
                >
                  Active Workspaces ({projects.length})
                </button>
              </div>

              {tableTab === 'documents' && documents.length > 0 && (
                <button 
                  onClick={() => router.push('/results')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  View All
                </button>
              )}
            </div>

            {/* TAB: Documents List */}
            {tableTab === 'documents' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-100">
                      <th className="py-2.5">Document</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Accuracy</th>
                      <th className="py-2.5">Time</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100/50 text-xs">
                    {/* Hardcoded Sample Row 1 from Screenshot */}
                    <tr className="hover:bg-zinc-50/40 transition-colors">
                      <td className="py-3.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/60">
                          <FileText className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 block truncate max-w-[200px]">Q4 Financial Report 2025.pdf</span>
                          <span className="text-[10px] text-zinc-400 block font-semibold uppercase mt-0.5">PDF • 2.4 MB</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          Complete
                        </span>
                      </td>
                      <td className="py-3.5 font-extrabold text-zinc-800">99.1%</td>
                      <td className="py-3.5 text-zinc-450 font-semibold">2 min ago</td>
                      <td className="py-3.5 text-right">
                        <button 
                          onClick={() => router.push('/results')}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-850 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>

                    {/* Loaded database documents if any */}
                    {documents.slice(0, 4).map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-50/40 transition-colors">
                        <td className="py-3.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/60">
                            <FileText className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 block truncate max-w-[200px]">{doc.originalName}</span>
                            <span className="text-[10px] text-zinc-400 block font-semibold uppercase mt-0.5">{doc.documentType} • {doc.projectName}</span>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            Analyzed
                          </span>
                        </td>
                        <td className="py-3.5 font-extrabold text-zinc-800">98.5%</td>
                        <td className="py-3.5 text-zinc-450 font-semibold">{formatTimeAgo(doc.createdAt)}</td>
                        <td className="py-3.5 text-right">
                          <Link 
                            href={`/projects/${doc.projectId}`}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-850 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            Workspace
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-400 italic">
                          No additional documents processed in workspaces.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: Workspaces List */}
            {tableTab === 'projects' && (
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div 
                    key={proj.id} 
                    className="flex justify-between items-center p-4 rounded-xl bg-white border border-zinc-200 hover:-translate-y-0.5 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <BarChart2 className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <Link href={`/projects/${proj.id}`} className="font-bold text-zinc-900 hover:text-indigo-650 transition-colors text-sm">
                          {proj.name}
                        </Link>
                        <span className="text-[10px] text-zinc-400 block font-semibold mt-0.5">
                          {proj.description || 'No description'} • {proj._count.documents} documents
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 dropdown-container relative">
                      <Link 
                        href={`/projects/${proj.id}`}
                        className="h-8 px-3 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center"
                      >
                        Open Workspace
                      </Link>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveDropdownProjectId(activeDropdownProjectId === proj.id ? null : proj.id);
                        }}
                        className="h-8 w-8 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="h-4.5 w-4.5" />
                      </button>

                      {/* Workspace edit/delete dropdown menu */}
                      {activeDropdownProjectId === proj.id && (
                        <div className="absolute right-0 top-9 w-36 bg-white border border-zinc-200/80 rounded-xl shadow-lg py-1 z-30 animate-fade-in">
                          <button
                            onClick={() => {
                              setEditingProject(proj);
                              setEditName(proj.name);
                              setEditDescription(proj.description || '');
                              setActiveDropdownProjectId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-left text-zinc-700 hover:bg-zinc-50 hover:text-indigo-600 flex items-center gap-2"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Edit Details
                          </button>
                          <button
                            onClick={(e) => {
                              handleDeleteProject(proj.id, e);
                              setActiveDropdownProjectId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-left text-red-650 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {projects.length === 0 && (
                  <p className="text-center text-zinc-400 italic py-4">No active workspaces. Create one on the left!</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Project Creation, Quick Upload, and Activity Feed */}
        <div className="space-y-8">
          {/* Create Project Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-150 pb-2">
              <Plus className="h-4.5 w-4.5 text-indigo-500" />
              <h3 className="font-heading text-sm font-bold text-zinc-900">Create New Project</h3>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Website Checkout Refresh"
                  required
                  className="w-full rounded-xl bg-white border border-zinc-200 px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="projectDesc" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  id="projectDesc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope and context of this project..."
                  className="w-full rounded-xl bg-white border border-zinc-200 px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating || !name.trim()}
                className="w-full h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 font-bold text-white text-xs hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Project
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Upload card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-4">
            <h3 className="font-heading text-sm font-bold text-zinc-900">Quick Upload</h3>
            <div 
              onClick={() => router.push('/analyze')}
              className="border-2 border-dashed border-zinc-200 hover:border-indigo-400 rounded-xl p-6 text-center bg-white/60 hover:bg-white transition-all cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-455">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-zinc-800">Upload Document</span>
                <span className="block text-[10px] text-zinc-400 font-semibold mt-1">PDF, DOCX, XLSX, Images</span>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-4">
            <h3 className="font-heading text-sm font-bold text-zinc-900">Recent Activity</h3>
            <div className="space-y-4">
              {/* Activity 1 */}
              <div className="flex gap-3 text-[11px] leading-relaxed">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <span className="block font-bold text-zinc-800">Batch analysis completed</span>
                  <span className="block text-zinc-450 font-semibold mt-0.5">12 documents • 5m ago</span>
                </div>
              </div>

              {/* Activity 2 */}
              <div className="flex gap-3 text-[11px] leading-relaxed">
                <span className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div>
                  <span className="block font-bold text-zinc-800">New API key generated</span>
                  <span className="block text-zinc-455 font-semibold mt-0.5">Development env • 1h ago</span>
                </div>
              </div>

              {/* Activity 3 */}
              <div className="flex gap-3 text-[11px] leading-relaxed">
                <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <span className="block font-bold text-zinc-800">Export report downloaded</span>
                  <span className="block text-zinc-455 font-semibold mt-0.5">Q4 Financial Report • 3h ago</span>
                </div>
              </div>

              {/* Activity 4 */}
              <div className="flex gap-3 text-[11px] leading-relaxed">
                <span className="h-2 w-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <div>
                  <span className="block font-bold text-zinc-800">Model updated to v2.4</span>
                  <span className="block text-zinc-455 font-semibold mt-0.5">Auto-upgrade • 1d ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Project Details Modal */}
      <AnimatePresence>
        {editingProject && (
          <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-6 rounded-2xl max-w-md w-full border border-white/60 shadow-2xl space-y-4"
            >
              <h3 className="font-heading text-lg font-bold text-zinc-900">
                Edit Project Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl bg-white/80 border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-555 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-xl bg-white/80 border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditingProject(null)}
                  className="h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-550 hover:text-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProject}
                  disabled={isUpdating || !editName.trim()}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 font-semibold text-white shadow-lg text-xs hover:shadow-indigo-600/20 active:scale-[0.99] flex items-center justify-center"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
