'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, ArrowRight, Loader2, Sparkles, AlertCircle, 
  CheckCircle2, Info, ChevronRight, HelpCircle, FileCheck, Check,
  BookOpen, Printer
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { TextEffect } from '@/components/motion-primitives/text-effect';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description: string | null;
}

export default function AnalyzePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisType, setAnalysisType] = useState<string>('comprehensive');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  
  // Inline create project state
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [creatingProj, setCreatingProj] = useState(false);

  // Load projects to associate upload with
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          
          // Check query parameters safely on mount
          const params = new URLSearchParams(window.location.search);
          const queryProjId = params.get('project');
          if (queryProjId && data.some(p => p.id === queryProjId)) {
            setSelectedProjectId(queryProjId);
          } else {
            setSelectedProjectId(data[0].id);
          }
        }
      })
      .catch((e) => console.error('Error fetching projects:', e));
  }, []);

  // Load documents for the selected project
  useEffect(() => {
    if (!selectedProjectId) {
      setExistingDocuments([]);
      return;
    }

    fetch(`/api/projects/${selectedProjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.documents)) {
          setExistingDocuments(data.documents);
        } else {
          setExistingDocuments([]);
        }
      })
      .catch((e) => {
        console.error('Error fetching documents:', e);
        setExistingDocuments([]);
      });
  }, [selectedProjectId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i]);
      }
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files: File[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        files.push(e.target.files[i]);
      }
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = async () => {
    if (!selectedProjectId) {
      setError('Please select or create a project workspace first.');
      return;
    }
    if (selectedFiles.length === 0 && existingDocuments.length === 0) {
      setError('Please upload or choose at least one document to analyze.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setCurrentStep(1);
    setUploadProgress(10);
    setStatusText('Ingesting and parsing documents...');

    try {
      // 1. Upload files using FormData only if we have selected new files
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const response = await fetch(`/api/projects/${selectedProjectId}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData?.error?.message || 'Failed to upload files.');
        }
      }

      setCurrentStep(2);
      setUploadProgress(50);
      setStatusText('Running AI document grounding analysis...');

      // 2. Trigger analysis run
      const analyzeResponse = await fetch(`/api/projects/${selectedProjectId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!analyzeResponse.ok) {
        throw new Error('Analysis run execution failed.');
      }

      setCurrentStep(3);
      setUploadProgress(90);
      setStatusText('Saving summaries and generating facts...');

      // 3. Trigger summary finalize
      await fetch(`/api/projects/${selectedProjectId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setUploadProgress(100);
      setStatusText('Analysis complete! Redirecting...');
      
      // Delay slightly for visual feedback
      setTimeout(() => {
        // Take them to the project details page
        router.push(`/projects/${selectedProjectId}`);
      }, 800);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
      setIsUploading(false);
    }
  };

  const handleCreateProjectInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    setCreatingProj(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjName, description: newProjDesc }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error?.message || 'Failed to create project');
      }

      const created = await response.json();
      
      // Reload projects list
      const projRes = await fetch('/api/projects');
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }

      // Select new project
      setSelectedProjectId(created.id);
      
      // Clear fields
      setNewProjName('');
      setNewProjDesc('');
      setShowCreateInline(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setCreatingProj(false);
    }
  };

  const analysisOptions = [
    { id: 'comprehensive', title: 'Comprehensive', desc: 'Full content analysis with insights' },
    { id: 'extraction', title: 'Data Extraction', desc: 'Key-value pair extraction' },
    { id: 'classification', title: 'Classification', desc: 'Category and sentiment analysis' },
    { id: 'comparison', title: 'Comparison', desc: 'Multi-document comparison' },
  ];

  return (
    <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full select-none">
      {/* Header Panel */}
      <div>
        <TextEffect preset="fade-in-blur" per="word" className="font-heading text-2xl sm:text-3xl font-extrabold text-zinc-900">
          Analyze Documents
        </TextEffect>
        <p className="mt-1 text-xs sm:text-sm text-zinc-450 font-medium">
          Upload documents for AI-powered analysis and extraction
        </p>
      </div>

      {/* Main Form Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Drag & Drop + Process flow */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Workspace selector */}
          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Select Workspace Project
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* + Create New Workspace Card */}
              {showCreateInline ? (
                <form 
                  onSubmit={handleCreateProjectInline}
                  className="glass-panel p-4 rounded-xl border border-indigo-200 bg-white/90 shadow-sm flex flex-col justify-between min-h-24 h-auto space-y-3 animate-fade-in"
                >
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      placeholder="Project Name..."
                      className="w-full rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    />
                    <input
                      type="text"
                      value={newProjDesc}
                      onChange={(e) => setNewProjDesc(e.target.value)}
                      placeholder="Description (optional)..."
                      className="w-full rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={creatingProj}
                      className="flex-1 flex h-8 items-center justify-center rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors"
                    >
                      {creatingProj ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateInline(false)}
                      className="flex-1 flex h-8 items-center justify-center rounded-lg bg-zinc-150 hover:bg-zinc-200 text-zinc-650 text-[10px] font-bold border border-zinc-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  onClick={() => setShowCreateInline(true)}
                  className="border-2 border-dashed border-zinc-250 hover:border-indigo-400 hover:bg-white rounded-xl p-4 flex flex-col items-center justify-center min-h-24 h-auto transition-all cursor-pointer bg-white/40 space-y-1.5 group select-none"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-455 group-hover:scale-105 transition-transform shrink-0">
                    <span className="text-lg font-bold leading-none">+</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-750">Create New Project</span>
                </div>
              )}

              {projects.map((p) => {
                const isSelected = selectedProjectId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    onDoubleClick={() => router.push(`/projects/${p.id}`)}
                    className={cn(
                      "glass-panel p-4 rounded-xl border cursor-pointer transition-all shadow-sm flex flex-col justify-between min-h-24 h-auto relative overflow-hidden space-y-3",
                      isSelected 
                        ? "border-indigo-500 ring-2 ring-indigo-500/10 bg-white" 
                        : "border-white/60 bg-white/60 hover:bg-white hover:border-zinc-300"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-650 rounded-l-xl" />
                    )}
                    <div>
                      <span className="block text-xs font-bold text-zinc-900 truncate pr-4">{p.name}</span>
                      <span className="block text-[10px] text-zinc-455 font-semibold mt-1.5 line-clamp-2 leading-relaxed">
                        {p.description || "No description provided."}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-150/60 mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${p.id}/review`);
                          }}
                          className="flex-1 flex h-8 items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-750 text-[10px] font-bold border border-indigo-100 transition-colors gap-1"
                        >
                          <BookOpen className="h-3 w-3 text-indigo-500" />
                          Review Queue
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${p.id}/summary`);
                          }}
                          className="flex-1 flex h-8 items-center justify-center rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-755 text-[10px] font-bold border border-zinc-200 transition-colors gap-1"
                        >
                          <Printer className="h-3 w-3 text-zinc-450" />
                          Print Report
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {projects.length === 0 && (
                <div className="col-span-2 glass-panel text-center py-6 border border-white/60 text-zinc-450 text-xs font-semibold">
                  No workspaces available. Create one first on Dashboard.
                </div>
              )}
            </div>
          </div>

          {/* Upload Area */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-6">
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 hover:border-indigo-400 rounded-2xl p-12 text-center bg-white/60 hover:bg-white transition-all cursor-pointer flex flex-col items-center justify-center space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-455 hover:scale-105 transition-transform duration-200">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="block text-sm font-bold text-zinc-800">Drag & drop documents here</span>
                <span className="block text-xs text-zinc-400 font-semibold">PDF, DOCX, XLSX, PNG, JPG — up to 25MB per file</span>
              </div>
              <button
                type="button"
                className="flex h-9 items-center justify-center rounded-xl bg-white border border-zinc-200 px-4 text-xs font-bold text-zinc-650 hover:text-indigo-650 hover:border-indigo-150 transition-all shadow-sm"
              >
                Browse files
              </button>
            </div>

            {/* Selected files list */}
            {(selectedFiles.length > 0 || existingDocuments.length > 0) && (
              <div className="space-y-3 pt-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Documents Selected ({selectedFiles.length + existingDocuments.length})
                </span>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {/* Database Ingested documents */}
                  {existingDocuments.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex justify-between items-center p-3 rounded-xl bg-zinc-50/80 border border-zinc-200 text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-bold text-zinc-800 truncate max-w-[280px]">{doc.originalName}</span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                          Ingested
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-semibold pr-2">
                        {new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}

                  {/* Local select files */}
                  {selectedFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center p-3 rounded-xl bg-white border border-indigo-100 text-xs shadow-sm animate-fade-in"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="font-bold text-zinc-800 truncate max-w-[280px]">{file.name}</span>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full shrink-0">
                          To Upload
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="text-[10px] font-bold text-red-550 hover:text-red-750 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* How it works workflow */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-4">
            <h4 className="block text-xs font-bold uppercase tracking-wider text-zinc-400">How It Works</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-sm transition-all",
                  currentStep > 1 
                    ? "bg-emerald-500 text-white" 
                    : "bg-indigo-600 text-white"
                )}>
                  {currentStep > 1 ? <Check className="h-4.5 w-4.5" /> : "1"}
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-800 mt-1">Upload</span>
                  <span className="block text-[10px] text-zinc-450 font-semibold mt-0.5">Drop your files</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 transition-all",
                  currentStep === 2 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : currentStep > 2 
                    ? "bg-emerald-500 text-white" 
                    : "bg-zinc-200 text-zinc-500"
                )}>
                  {currentStep > 2 ? <Check className="h-4.5 w-4.5" /> : "2"}
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-800 mt-1">Analyze</span>
                  <span className="block text-[10px] text-zinc-450 font-semibold mt-0.5">AI processes content</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 transition-all",
                  currentStep === 3 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "bg-zinc-200 text-zinc-500"
                )}>
                  3
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-800 mt-1">Results</span>
                  <span className="block text-[10px] text-zinc-455 font-semibold mt-0.5">View extracted data</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Analysis configs */}
        <div className="space-y-8">
          
          {/* Analysis Type */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-4">
            <h4 className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Analysis Type</h4>
            <div className="space-y-3">
              {analysisOptions.map((opt) => {
                const isSelected = analysisType === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setAnalysisType(opt.id)}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all shadow-sm bg-white/60 hover:bg-white",
                      isSelected 
                        ? "border-indigo-500 ring-2 ring-indigo-500/10" 
                        : "border-zinc-200"
                    )}
                  >
                    <div className="pt-0.5">
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                        isSelected ? "border-indigo-600" : "border-zinc-350"
                      )}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-600 animate-scale-in" />}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-900 leading-tight">{opt.title}</span>
                      <span className="block text-[10px] text-zinc-455 font-semibold mt-1 leading-normal">{opt.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trigger box */}
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-xs text-red-700 flex items-center gap-2.5 font-medium shadow-sm">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isUploading && (
              <div className="glass-panel p-5 rounded-2xl border border-white/60 shadow-sm space-y-3 animate-fade-in">
                <div className="flex justify-between text-xs font-bold text-zinc-800">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    {statusText}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                    initial={{ width: '0%' }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleStartAnalysis}
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 font-bold text-white shadow-lg text-sm hover:shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="h-4 w-4" />
              Start Analysis
            </button>
          </div>

          {/* Supported formats */}
          <div className="glass-panel p-5 rounded-2xl border border-white/60 shadow-sm space-y-3">
            <h4 className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Supported Formats</h4>
            <div className="flex flex-wrap gap-1.5">
              {['PDF', 'DOCX', 'XLSX', 'PNG', 'JPG', 'TXT', 'CSV', 'HTML'].map((f) => (
                <span 
                  key={f} 
                  className="text-[9px] font-bold px-2 py-1 bg-zinc-100 text-zinc-500 border border-zinc-200 rounded-lg shadow-sm"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
