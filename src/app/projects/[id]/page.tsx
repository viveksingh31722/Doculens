'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { 
  ArrowLeft, FileText, Upload, Trash2, Play, Loader2, 
  CheckCircle2, XCircle, ChevronRight, FileCode, Clock, AlertTriangle, Edit
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TextEffect } from '@/components/motion-primitives/text-effect';

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  documentType: string;
  createdAt: string;
  sections: { id: string }[];
}

interface AnalysisRun {
  id: string;
  status: string;
  model: string;
  startedAt: string;
  finishedAt: string | null;
  errorCode: string | null;
  geminiCallCount?: number;
  provider?: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  documents: Document[];
  analysisRuns: AnalysisRun[];
}

export default function ProjectWorkspace(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzingState, setAnalyzingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit states
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProject = async () => {
    if (!project || !editName.trim()) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      setIsEditingProject(false);
      await fetchProjectData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProjectWorkspace = async () => {
    if (!project) return;
    if (!confirm('Are you sure you want to delete this project? This will permanently delete all associated documents, findings, and summaries.')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/');
      } else {
        alert('Failed to delete project');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    }
  };

  const fetchProjectData = useCallback(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load project details');
        return res.json();
      })
      .then((data) => {
        setProject(data);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const activeRun = project?.analysisRuns?.[0];
  const activeRunStatus = activeRun?.status;
  const analyzing = analyzingState || activeRunStatus === 'running';

  // Poll analysis run status if it is running
  useEffect(() => {
    if (activeRunStatus !== 'running') return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
          const currentRun = data.analysisRuns?.[0];
          if (currentRun && currentRun.status === 'completed') {
            router.push(`/projects/${projectId}/review`);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeRunStatus, projectId, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error?.message || 'Failed to upload documents');
      }

      await fetchProjectData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload files';
      setUploadError(msg);
    } finally {
      setUploading(false);
      // Reset input element value
      e.target.value = '';
    }
  };

  const handleStartAnalysis = async () => {
    if (!project || project.documents.length === 0 || analyzing) return;
    setAnalyzingState(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: 'POST',
      });

      const responseData = await response.json();

      if (response.status === 429) {
        throw new Error(
          responseData?.error?.message ||
          'Rate limit reached. The free Gemini tier allows 5 requests/min and 20/day. Please wait 60 seconds and try again.'
        );
      }

      if (!response.ok) {
        throw new Error(responseData?.error?.message || 'Analysis initiation failed');
      }

      router.push(`/projects/${projectId}/review`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed to start';
      setError(msg);
    } finally {
      setAnalyzingState(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      await fetchProjectData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete document';
      alert(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-12 text-center">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Project Not Found</h2>
        <p className="text-zinc-400 mt-2">{error}</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const totalDocs = project?.documents?.length || 0;
  const canUpload = totalDocs < 3;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 flex-1 flex flex-col justify-start">
      {/* Back to dashboard */}
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-550 hover:text-indigo-600 transition-colors mb-6 w-fit font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-zinc-200/80 mb-8">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Project Workspace
          </span>
          <TextEffect preset="fade-in-blur" per="word" className="font-heading text-2xl sm:text-3xl font-extrabold text-zinc-900 mt-3">
            {project?.name || 'Workspace Loading...'}
          </TextEffect>
          {project?.description && (
            <p className="mt-2 text-sm text-zinc-500 max-w-3xl leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* Project Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!project) return;
              setEditName(project.name);
              setEditDescription(project.description || '');
              setIsEditingProject(true);
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white border border-zinc-200 px-4 text-xs font-bold text-zinc-650 hover:text-indigo-650 hover:border-indigo-150 transition-colors shadow-sm"
          >
            <Edit className="mr-2 h-3.5 w-3.5 text-zinc-400" />
            Edit Project
          </button>
          <button
            onClick={handleDeleteProjectWorkspace}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-red-50 border border-red-100 px-4 text-xs font-bold text-red-650 hover:text-red-700 hover:bg-red-50 transition-colors shadow-sm"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5 text-red-400" />
            Delete Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Documents management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/60">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading text-lg font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Project Documents ({totalDocs}/3)
              </h2>
              {canUpload && (
                <label className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg bg-white border border-zinc-200 px-4 text-xs font-bold text-zinc-650 hover:text-indigo-650 hover:border-indigo-150 hover:bg-indigo-50 transition-colors shadow-sm">
                  <Upload className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                  Upload
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {uploadError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-4 text-xs text-red-700 flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploading && (
              <div className="flex items-center justify-center py-12 bg-indigo-50/20 rounded-xl border border-dashed border-indigo-200 mb-4 animate-pulse">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  <span className="text-sm font-semibold text-zinc-600">Processing and splitting document sections...</span>
                </div>
              </div>
            )}

            {totalDocs === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 text-center px-4">
                <Upload className="h-8 w-8 text-zinc-400 mb-3" />
                <h4 className="text-sm font-bold text-zinc-800 mb-1">Add Project Documents</h4>
                <p className="text-zinc-500 text-xs max-w-sm mb-4">
                  Drag and drop or select up to 3 files. Supported formats: Plain Text (.txt), Markdown (.md), and Word Documents (.docx) up to 2MB each.
                </p>
                <label className="cursor-pointer inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 px-6 text-xs font-bold text-white shadow-md shadow-indigo-650/10 hover:shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99]">
                  Select Files
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {project?.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-white/50 border border-zinc-200/80 rounded-xl group transition-all hover:border-indigo-150 hover:bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition-colors shrink-0">
                        <FileCode className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-950 truncate max-w-xs sm:max-w-md">
                          {doc.originalName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded border border-indigo-100/50">
                            {doc.documentType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-zinc-450 font-medium">
                            {doc.sections.length} sections
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="h-8 w-8 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Analysis state and execution */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/60">
            <h3 className="font-heading text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-indigo-500" />
              Analysis Engine
            </h3>

            {totalDocs === 0 ? (
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-xs text-zinc-550 flex items-center gap-2 leading-relaxed">
                <Clock className="h-4 w-4 shrink-0 text-zinc-450" />
                <span>Please upload at least one document to start the analysis.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleStartAnalysis}
                  disabled={analyzing}
                  className="w-full flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 font-bold text-white shadow-md shadow-indigo-600/10 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none hover:shadow-indigo-600/20"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Run Grounded AI Analysis'
                  )}
                </button>

                {activeRun && (
                  <div className="rounded-xl border border-zinc-200 bg-white/50 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                        Last Run Status
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        activeRun.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : activeRun.status === 'failed'
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse'
                      }`}>
                        {activeRun.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                        {activeRun.status === 'failed' && <XCircle className="h-3 w-3" />}
                        {activeRun.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {activeRun.status}
                      </span>
                    </div>

                    {activeRun.model.includes('Mock') && (
                      <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 text-[10px] text-amber-700 flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                        <span>Running in Mock Offline Mode — no AI API key configured.</span>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Model:</span>
                        <span className="text-zinc-800 font-mono font-semibold">{activeRun.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Started:</span>
                        <span className="text-zinc-800 font-semibold">{new Date(activeRun.startedAt).toLocaleString()}</span>
                      </div>
                      {activeRun.finishedAt && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-medium">Duration:</span>
                          <span className="text-zinc-800 font-semibold">
                            {Math.round((new Date(activeRun.finishedAt).getTime() - new Date(activeRun.startedAt).getTime()) / 1000)}s
                          </span>
                        </div>
                      )}
                      {typeof activeRun.geminiCallCount === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-medium">Gemini Calls:</span>
                          <span className={`font-mono font-bold ${
                            activeRun.geminiCallCount === 1 ? 'text-emerald-600' : 'text-zinc-800'
                          }`}>
                            {activeRun.geminiCallCount} {activeRun.geminiCallCount === 1 ? '✓' : ''}
                          </span>
                        </div>
                      )}
                      {activeRun.errorCode && (
                        <div className="mt-2 text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-100 font-medium">
                          <span className="font-bold">Error:</span> {activeRun.errorCode}
                        </div>
                      )}
                    </div>

                    {activeRun.status === 'completed' && (
                      <Link
                        href={`/projects/${projectId}/review`}
                        className="mt-4 w-full flex h-10 items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-850 text-xs font-bold text-white transition-all shadow-md active:scale-[0.98]"
                      >
                        Open Review Queue <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      {isEditingProject && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-white/60 shadow-2xl space-y-4">
            <h3 className="font-heading text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Edit className="h-5 w-5 text-indigo-500" />
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 mb-1">
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
                onClick={() => setIsEditingProject(false)}
                className="h-10 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-550 hover:text-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProject}
                disabled={isUpdating || !editName.trim()}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 font-semibold text-white shadow-lg text-xs hover:shadow-indigo-600/20 active:scale-[0.99]"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
