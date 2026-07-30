'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { 
  ArrowLeft, Check, X, Edit2, FileText, AlertTriangle, 
  CheckCircle, HelpCircle, Info, BookOpen, Loader2,
  FileCode, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TextEffect } from '@/components/motion-primitives/text-effect';

interface FindingSource {
  documentId: string;
  sectionId: string;
  quote: string;
  document: { originalName: string };
  section: { heading: string | null; content: string; ordinal: number };
}

interface Finding {
  id: string;
  kind: string;
  statement: string;
  classification: string;
  reviewStatus: string;
  editedStatement: string | null;
  reviewNote: string | null;
  sources: FindingSource[];
}

interface Conflict {
  id: string;
  title: string;
  description: string;
  status: string;
  resolutionNote: string | null;
  findings: {
    finding: Finding;
  }[];
}

interface ActionItem {
  id: string;
  text: string;
  rationale: string | null;
  status: string;
  editedText: string | null;
  reviewNote: string | null;
}

interface Project {
  id: string;
  name: string;
}

function ConflictResolutionInput({ 
  conflictId, 
  initialValue, 
  onSave 
}: { 
  conflictId: string; 
  initialValue: string; 
  onSave: (id: string, updates: { resolutionNote: string }) => void 
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialValue) {
          onSave(conflictId, { resolutionNote: value });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      placeholder="Enter the resolved action or alignment note..."
      className="flex-1 rounded-xl bg-white border border-zinc-200 px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  );
}

export default function ReviewQueue(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'findings' | 'conflicts' | 'actions'>('findings');
  const [loading, setLoading] = useState(true);
  
  // Drawer state
  const [selectedSource, setSelectedSource] = useState<FindingSource | null>(null);
  
  // Editing state
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editingFindingText, setEditingFindingText] = useState('');
  
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingActionText, setEditingActionText] = useState('');

  const [savingSummary, setSavingSummary] = useState(false);

  const fetchReviewData = useCallback(() => {
    fetch(`/api/projects/${projectId}/review`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load review data');
        return res.json();
      })
      .then((data) => {
        setProject(data.project);
        setFindings(data.findings);
        setConflicts(data.conflicts);
        setActionItems(data.actionItems);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    fetchReviewData();
  }, [fetchReviewData]);

  // Patch Finding
  const handleUpdateFinding = async (id: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/findings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        setEditingFindingId(null);
        fetchReviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Patch Conflict
  const handleUpdateConflict = async (id: string, updates: { status?: 'resolved' | 'unresolved'; resolutionNote?: string | null }) => {
    try {
      const response = await fetch(`/api/conflicts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        fetchReviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Patch Action Item
  const handleUpdateActionItem = async (id: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/action-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        setEditingActionId(null);
        fetchReviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Finalize reviewed summary
  const handleSaveSummary = async () => {
    setSavingSummary(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/summary`, {
        method: 'POST',
      });
      if (response.ok) {
        router.push(`/projects/${projectId}/summary`);
      } else {
        const errData = await response.json();
        alert(errData.error?.message || 'Failed to save summary');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving the summary.');
    } finally {
      setSavingSummary(false);
    }
  };

  const unresolvedConflicts = conflicts.filter((c) => c.status === 'unresolved');
  const pendingActions = actionItems.filter((a) => a.status === 'proposed');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 flex-1 flex flex-col justify-start relative">
      {/* Back to workspace */}
      <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-2 text-sm text-zinc-550 hover:text-indigo-600 transition-colors mb-6 w-fit font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Project
      </Link>

      {/* Top Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-zinc-200/80 mb-8">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Human-in-the-Loop Review Queue
          </span>
          <TextEffect preset="fade-in-blur" per="word" className="font-heading text-2xl sm:text-3xl font-extrabold text-zinc-900 mt-3">
            {project?.name || 'Workspace Loading...'}
          </TextEffect>
          <p className="mt-2 text-sm text-zinc-550 max-w-3xl leading-relaxed">
            Inspect AI-extracted facts, resolve schedule conflicts, and approve proposed action items.
          </p>
        </div>

        {/* Generate summary button */}
        <button
          onClick={handleSaveSummary}
          disabled={savingSummary}
          className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 font-bold text-white px-6 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          {savingSummary ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalizing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Finalize & View Summary
            </>
          )}
        </button>
      </div>

      {/* Overview alerts */}
      {unresolvedConflicts.length > 0 && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800 flex items-center gap-3 font-medium">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <span className="font-bold">Pending Conflicts:</span> There are {unresolvedConflicts.length} unresolved schedule discrepancy conflicts. You must add a resolution note and mark them resolved to finalize the summary.
          </div>
        </div>
      )}

      {/* Primary Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 columns: Review queues */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Tabs */}
          <div className="flex border-b border-zinc-200">
            <button
              onClick={() => setActiveTab('findings')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'findings' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-zinc-400 hover:text-zinc-650'
              }`}
            >
              AI Findings ({findings.length})
            </button>
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'conflicts' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-zinc-400 hover:text-zinc-650'
              }`}
            >
              Conflicts ({conflicts.length})
              {unresolvedConflicts.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-700 rounded-full">
                  {unresolvedConflicts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'actions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-zinc-400 hover:text-zinc-650'
              }`}
            >
              Action proposals ({actionItems.length})
              {pendingActions.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full">
                  {pendingActions.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB CONTENT: Findings */}
          {activeTab === 'findings' && (
            <div className="space-y-4">
              {findings.length === 0 ? (
                <div className="glass-panel text-center py-12 px-6 rounded-2xl border border-white/60 flex flex-col items-center">
                  <Info className="h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-zinc-500 text-sm">No findings extracted yet.</p>
                </div>
              ) : (
                findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="glass-panel p-6 rounded-2xl border border-white/60 space-y-4 hover:border-indigo-150/50 transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Kind Badge */}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-600">
                        {finding.kind}
                      </span>

                      {/* Classification Badge & Dropdown */}
                      <div className="flex items-center gap-2">
                        <select
                          value={finding.classification}
                          onChange={(e) => handleUpdateFinding(finding.id, { classification: e.target.value })}
                          className="bg-white text-zinc-700 text-xs rounded border border-zinc-200 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                        >
                          <option value="confirmed">Confirmed (Fact)</option>
                          <option value="interpretation">Interpretation</option>
                          <option value="unresolved">Unresolved</option>
                        </select>
                      </div>
                    </div>

                    {/* Statement body */}
                    {editingFindingId === finding.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={editingFindingText}
                          onChange={(e) => setEditingFindingText(e.target.value)}
                          className="flex-1 rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          onClick={() => handleUpdateFinding(finding.id, { editedStatement: editingFindingText })}
                          className="h-8 w-8 bg-indigo-50 hover:bg-indigo-100 text-emerald-600 border border-indigo-100 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingFindingId(null)}
                          className="h-8 w-8 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 border border-zinc-200 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="group flex items-start gap-2 justify-between">
                        <p className="text-zinc-950 text-sm leading-relaxed font-semibold">
                          {finding.editedStatement || finding.statement}
                        </p>
                        <button
                          onClick={() => {
                            setEditingFindingId(finding.id);
                            setEditingFindingText(finding.editedStatement || finding.statement);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-indigo-650 p-1 shrink-0 transition-opacity"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Rationale if present */}
                    {finding.reviewNote && (
                      <p className="text-zinc-550 text-xs italic bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 leading-relaxed">
                        <span className="font-bold not-italic text-zinc-700">AI Rationale:</span> {finding.reviewNote}
                      </p>
                    )}

                    {/* Evidence Citations list */}
                    <div className="pt-2 border-t border-zinc-150 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Evidence Citations:
                      </span>
                      {finding.sources.map((src, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSource(src)}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-750 bg-indigo-50/50 border border-indigo-100 px-2.5 py-1 rounded-lg transition-colors hover:bg-indigo-50 font-medium"
                        >
                          <BookOpen className="h-3 w-3" />
                          {src.document.originalName} ({src.section.heading || `Sec ${src.section.ordinal}`})
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB CONTENT: Conflicts */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              {conflicts.length === 0 ? (
                <div className="glass-panel text-center py-12 px-6 rounded-2xl border border-white/60 flex flex-col items-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                  <h4 className="text-sm font-bold text-zinc-900">No Schedule Conflicts</h4>
                  <p className="text-zinc-500 text-xs mt-1">AI analysis found no scheduling discrepancies.</p>
                </div>
              ) : (
                conflicts.map((conflict) => {
                  const isResolved = conflict.status === 'resolved';
                  return (
                    <div
                      key={conflict.id}
                      className={`glass-panel p-6 rounded-2xl border transition-all ${
                        isResolved ? 'border-emerald-100 bg-emerald-50/20' : 'border-white/60'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-heading text-base font-bold text-zinc-900 flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${isResolved ? 'text-emerald-500' : 'text-amber-500'}`} />
                          {conflict.title}
                        </h4>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded border ${
                          isResolved 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {conflict.status}
                        </span>
                      </div>

                      <p className="text-zinc-650 text-xs leading-relaxed mb-4">
                        {conflict.description}
                      </p>

                      {/* Conflicting Findings Side-by-Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                        {conflict.findings.map((cf, idx) => {
                          const f = cf.finding;
                          return (
                            <div key={f.id} className="bg-white/70 p-4 rounded-xl border border-zinc-200/80 flex flex-col justify-between space-y-3 shadow-sm">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-600">
                                  Side {idx + 1}: {f.kind}
                                </span>
                                <p className="text-zinc-950 text-xs font-semibold mt-2 leading-relaxed">
                                  {f.editedStatement || f.statement}
                                </p>
                              </div>
                              
                              <div className="pt-2 border-t border-zinc-150 space-y-1.5">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
                                  Source Citation & Quote:
                                </span>
                                {f.sources.map((src, sIdx) => (
                                  <div key={sIdx} className="space-y-1">
                                    <button
                                      onClick={() => setSelectedSource(src as any)}
                                      className="inline-flex w-full items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-750 bg-indigo-50/50 border border-indigo-100 px-2 py-1 rounded transition-colors hover:bg-indigo-50 text-left font-medium"
                                    >
                                      <BookOpen className="h-2.5 w-2.5 shrink-0" />
                                      <span className="truncate">
                                        {src.document.originalName} ({src.section.heading || `Sec ${src.section.ordinal}`})
                                      </span>
                                    </button>
                                    <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-1 rounded italic truncate font-medium">
                                      &quot;{src.quote}&quot;
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Conflict resolution notes block */}
                      <div className="mt-4 pt-4 border-t border-zinc-150">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                          Conflict Resolution Note
                        </label>
                        <div className="flex gap-2">
                          <ConflictResolutionInput
                            conflictId={conflict.id}
                            initialValue={conflict.resolutionNote || ''}
                            onSave={handleUpdateConflict}
                          />
                          <button
                            onClick={() => handleUpdateConflict(conflict.id, { status: isResolved ? 'unresolved' : 'resolved' })}
                            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm ${
                              isResolved 
                                ? 'bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200' 
                                : 'bg-indigo-650 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            {isResolved ? 'Mark Unresolved' : 'Resolve Conflict'}
                          </button>
                        </div>
                        {conflict.resolutionNote && (
                          <div className="mt-2 text-[10px] font-semibold text-zinc-450 flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Note saved automatically on blur. Marked status: <span className="font-bold text-zinc-600">{conflict.status}</span>.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB CONTENT: Actions */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              {actionItems.length === 0 ? (
                <div className="glass-panel text-center py-12 px-6 rounded-2xl border border-white/60 flex flex-col items-center">
                  <Info className="h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-zinc-500 text-sm">No action proposals generated.</p>
                </div>
              ) : (
                actionItems.map((action) => (
                  <div
                    key={action.id}
                    className={`glass-panel p-6 rounded-2xl border transition-all ${
                      action.status === 'approved' ? 'border-emerald-100 bg-emerald-50/20' : 'border-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-zinc-150">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-600">
                        action_item
                      </span>

                      {/* Dropdown status update */}
                      <div className="flex items-center gap-2">
                        <select
                          value={action.status}
                          onChange={(e) => handleUpdateActionItem(action.id, { status: e.target.value })}
                          className="bg-white text-zinc-700 text-xs rounded border border-zinc-200 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                        >
                          <option value="pending">Pending Approval</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    {/* Statement body */}
                    {editingActionId === action.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={editingActionText}
                          onChange={(e) => setEditingActionText(e.target.value)}
                          className="flex-1 rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          onClick={() => handleUpdateActionItem(action.id, { editedText: editingActionText })}
                          className="h-8 w-8 bg-indigo-50 hover:bg-indigo-100 text-emerald-600 border border-indigo-100 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingActionId(null)}
                          className="h-8 w-8 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 border border-zinc-200 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="group flex items-start gap-2 justify-between">
                        <p className="text-zinc-950 text-sm font-semibold leading-relaxed">
                          {action.editedText || action.text}
                        </p>
                        <button
                          onClick={() => {
                            setEditingActionId(action.id);
                            setEditingActionText(action.editedText || action.text);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-indigo-650 p-1 shrink-0 transition-opacity"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {action.rationale && (
                      <p className="text-zinc-555 text-xs mt-2 italic bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 leading-relaxed">
                        <span className="font-bold not-italic text-zinc-700">AI Rationale:</span> {action.rationale}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right column: Sticky Source Citation Drawer */}
        <div className="lg:sticky lg:top-24 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/60 min-h-[350px] flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-heading text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                Source Grounding Drawer
              </h3>

              {selectedSource ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest block">
                      Document
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                      <FileCode className="h-4 w-4 text-indigo-500" />
                      {selectedSource.document.originalName}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest block">
                      Section heading / index
                    </span>
                    <span className="text-xs font-semibold text-zinc-700">
                      {selectedSource.section.heading || `Section ${selectedSource.section.ordinal}`}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-zinc-150">
                    <span className="text-[10px] font-bold text-zinc-455 uppercase tracking-widest block">
                      Supporting Evidence Quote
                    </span>
                    <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100 font-medium leading-relaxed">
                      &quot;{selectedSource.quote}&quot;
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-zinc-150">
                    <span className="text-[10px] font-bold text-zinc-455 uppercase tracking-widest block font-sans">
                      Section Context
                    </span>
                    <div className="text-xs text-zinc-650 bg-zinc-50 p-3.5 rounded-lg border border-zinc-200/80 max-h-48 overflow-y-auto leading-relaxed">
                      {/* Highlight quote in context */}
                      {(() => {
                        const content = selectedSource.section.content;
                        const quote = selectedSource.quote;
                        const idx = content.toLowerCase().indexOf(quote.toLowerCase());
                        if (idx !== -1) {
                          return (
                            <>
                              {content.substring(0, idx)}
                              <mark className="bg-indigo-100 text-indigo-850 font-bold px-0.5 rounded">
                                {content.substring(idx, idx + quote.length)}
                              </mark>
                              {content.substring(idx + quote.length)}
                            </>
                          );
                        }
                        return content;
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-16 text-zinc-400 px-4">
                  <FileText className="h-8 w-8 text-zinc-300 mb-3" />
                  <p className="text-xs leading-relaxed max-w-[200px] text-zinc-450 font-medium">
                    Click any citation badge in the findings tab to view the source grounding quote inside context.
                  </p>
                </div>
              )}
            </div>

            {selectedSource && (
              <button
                onClick={() => setSelectedSource(null)}
                className="mt-6 w-full text-center text-xs font-bold text-zinc-450 hover:text-indigo-650 transition-colors"
              >
                Clear Grounding Selection
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
