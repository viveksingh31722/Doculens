'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { 
  ArrowLeft, Printer, FileText, CheckCircle2, AlertTriangle, 
  HelpCircle, ClipboardList, RefreshCw, Calendar, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { TextEffect } from '@/components/motion-primitives/text-effect';

interface SummaryFinding {
  id: string;
  statement: string;
  editedStatement: string | null;
  reviewNote: string | null;
  classification: string;
}

interface SummaryActionItem {
  id: string;
  text: string;
  editedText: string | null;
  rationale: string | null;
  status: string;
}

interface SummaryConflict {
  id: string;
  title: string;
  description: string;
  resolutionNote: string | null;
  status: string;
}

interface SummaryRecord {
  id: string;
  projectId: string;
  version: number;
  contentJson: string;
  createdAt: string;
}

interface SummaryData {
  projectName: string;
  projectId: string;
  generatedAt: string;
  findings: {
    facts: SummaryFinding[];
    decisions: SummaryFinding[];
    assumptions: SummaryFinding[];
    risks: SummaryFinding[];
    openQuestions: SummaryFinding[];
  };
  actionItems: SummaryActionItem[];
  resolvedConflicts: SummaryConflict[];
  conflicts?: SummaryConflict[];
}

export default function ProjectSummary(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const projectId = params.id;

  const [summary, setSummary] = useState<SummaryRecord | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(() => {
    fetch(`/api/projects/${projectId}/summary`)
      .then((res) => {
        if (!res.ok) throw new Error('No saved summary found for this project.');
        return res.json();
      })
      .then((data) => {
        setSummary(data);
        if (data.contentJson) {
          setSummaryData(JSON.parse(data.contentJson));
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load summary');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-zinc-900">No Summary Found</h2>
        <p className="text-zinc-500 mt-2">
          You must complete the human review queue and click &quot;Finalize &amp; View Summary&quot; first.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href={`/projects/${projectId}/review`} className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-650 px-6 text-xs font-bold text-white hover:bg-indigo-750 transition-colors shadow-sm">
            Go to Review Queue
          </Link>
          <Link href="/" className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200 px-6 text-xs font-bold text-zinc-550 hover:text-zinc-800 transition-colors shadow-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 flex-1 flex flex-col justify-start print:p-0 print:bg-white print:text-black">
      {/* Top action header (hidden on print) */}
      <div className="flex items-center justify-between gap-4 mb-8 print:hidden">
        <Link href={`/projects/${projectId}/review`} className="inline-flex items-center gap-2 text-sm text-zinc-550 hover:text-indigo-600 transition-colors font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Review Queue
        </Link>
        
        <button
          onClick={handlePrint}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-white border border-zinc-200 px-5 text-xs font-bold text-zinc-650 hover:text-indigo-650 hover:border-indigo-150 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
        >
          <Printer className="mr-2 h-4 w-4 text-zinc-400" />
          Print / Export PDF
        </button>
      </div>

      {/* Main summary document */}
      <div className="glass-panel border border-white/60 rounded-3xl p-8 md:p-12 shadow-lg print:border-none print:bg-transparent print:p-0 print:shadow-none">
        {/* Document Header */}
        <div className="border-b border-zinc-200 pb-8 mb-8 print:border-zinc-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-3 py-1 rounded-full w-fit print:border print:border-zinc-300 print:text-zinc-700 print:bg-transparent">
              Executive Project Summary
            </span>
            <div className="flex items-center gap-2 text-xs text-zinc-450 font-medium">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Generated on {new Date(summaryData.generatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <TextEffect preset="fade-in-blur" per="word" className="font-heading text-3xl font-extrabold text-zinc-900 print:text-black">
            {summaryData.projectName}
          </TextEffect>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-zinc-400 print:text-zinc-600 font-semibold">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Version {summary?.version} (Immutable)
            </span>
          </div>
        </div>

        <div className="space-y-10">
          {/* Approved Action Items */}
          {summaryData.actionItems.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-zinc-900 border-b border-zinc-200/80 pb-2 flex items-center gap-2 print:text-black print:border-zinc-300">
                <ClipboardList className="h-5 w-5 text-indigo-500 print:text-zinc-700" />
                Approved Action Items
              </h2>
              <div className="space-y-3">
                {summaryData.actionItems.map((action, i) => (
                  <div key={i} className="bg-zinc-50/50 border border-zinc-200/80 rounded-xl p-4 print:border-zinc-200 print:bg-transparent shadow-sm">
                    <p className="text-sm font-semibold text-zinc-900 leading-relaxed print:text-black">
                      {action.editedText || action.text}
                    </p>
                    {action.rationale && (
                      <p className="text-zinc-500 text-xs mt-2 print:text-zinc-650">
                        <span className="font-bold text-zinc-600 print:text-zinc-700">Rationale:</span> {action.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Decisions */}
          {summaryData.findings.decisions.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-zinc-900 border-b border-zinc-200/80 pb-2 flex items-center gap-2 print:text-black print:border-zinc-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 print:text-zinc-700" />
                Decisions & Alignments
              </h2>
              <ul className="space-y-3 list-none pl-0">
                {summaryData.findings.decisions.map((f, i) => (
                  <li key={i} className="text-sm text-zinc-750 leading-relaxed print:text-zinc-800 flex items-start gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                    <div>
                      <p className="font-medium text-zinc-800">{f.editedStatement || f.statement}</p>
                      {f.reviewNote && <p className="text-zinc-450 text-xs mt-0.5 print:text-zinc-500 font-semibold italic">AI Rationale: {f.reviewNote}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Risks & Violations */}
          {summaryData.findings.risks.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-zinc-900 border-b border-zinc-200/80 pb-2 flex items-center gap-2 print:text-black print:border-zinc-300">
                <AlertTriangle className="h-5 w-5 text-amber-500 print:text-zinc-700" />
                Identified Risks & Rule Deviations
              </h2>
              <ul className="space-y-3 list-none pl-0">
                {summaryData.findings.risks.map((f, i) => (
                  <li key={i} className="text-sm text-zinc-750 leading-relaxed print:text-zinc-800 flex items-start gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 mt-2 shrink-0"></span>
                    <div>
                      <p className="font-medium text-zinc-800">{f.editedStatement || f.statement}</p>
                      {f.reviewNote && <p className="text-zinc-450 text-xs mt-0.5 print:text-zinc-500 font-semibold italic">AI Rationale: {f.reviewNote}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Conflicts */}
          {((summaryData.conflicts && summaryData.conflicts.length > 0) || 
            (summaryData.resolvedConflicts && summaryData.resolvedConflicts.length > 0)) && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-zinc-900 border-b border-zinc-200/80 pb-2 flex items-center gap-2 print:text-black print:border-zinc-300">
                <AlertTriangle className="h-5 w-5 text-indigo-500 print:text-zinc-700" />
                Project Conflicts
              </h2>
              <div className="space-y-3">
                {(summaryData.conflicts || summaryData.resolvedConflicts).map((c, i) => {
                  const isResolved = c.status === 'resolved';
                  return (
                    <div key={i} className={`border rounded-xl p-4 print:border-zinc-200 print:bg-transparent ${
                      isResolved ? 'border-zinc-200 bg-zinc-50/50' : 'border-amber-100 bg-amber-50/30'
                    }`}>
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <h4 className="text-xs font-bold text-zinc-900 print:text-black">{c.title}</h4>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          isResolved 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 print:text-zinc-650 font-medium">{c.description}</p>
                      {isResolved ? (
                        c.resolutionNote && (
                          <p className="text-xs text-emerald-700 mt-2 print:text-green-800 font-bold bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded w-fit">
                            <span className="font-bold text-zinc-500 print:text-zinc-700 mr-1.5">Resolution:</span> {c.resolutionNote}
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-amber-750 mt-2 print:text-amber-800 font-bold italic bg-amber-50 border border-amber-100/50 px-2 py-0.5 rounded w-fit">
                          Unresolved Conflict: Requires resolution note.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Facts */}
          {summaryData.findings.facts.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-zinc-900 border-b border-zinc-200/80 pb-2 flex items-center gap-2 print:text-black print:border-zinc-300">
                <FileText className="h-5 w-5 text-indigo-500 print:text-zinc-700" />
                Verifiable Facts
              </h2>
              <ul className="space-y-3 list-none pl-0">
                {summaryData.findings.facts.map((f, i) => (
                  <li key={i} className="text-sm text-zinc-750 leading-relaxed print:text-zinc-800 flex items-start gap-2.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                    <p className="text-zinc-800">{f.editedStatement || f.statement}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Assumptions */}
          {summaryData.findings.assumptions.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-zinc-900 border-b border-zinc-200/80 pb-2 flex items-center gap-2 print:text-black print:border-zinc-300">
                <HelpCircle className="h-5 w-5 text-purple-500 print:text-zinc-700" />
                Document Assumptions
              </h2>
              <ul className="space-y-3 list-none pl-0">
                {summaryData.findings.assumptions.map((f, i) => (
                  <li key={i} className="text-sm text-zinc-750 leading-relaxed print:text-zinc-800 flex items-start gap-2.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-purple-500 mt-2 shrink-0"></span>
                    <p className="text-zinc-800">{f.editedStatement || f.statement}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Open Questions */}
          {summaryData.findings.openQuestions.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-zinc-900 border-b border-zinc-200/80 pb-2 flex items-center gap-2 print:text-black print:border-zinc-300">
                <HelpCircle className="h-5 w-5 text-rose-500 print:text-zinc-700" />
                Open / Unresolved Questions
              </h2>
              <ul className="space-y-3 list-none pl-0">
                {summaryData.findings.openQuestions.map((f, i) => (
                  <li key={i} className="text-sm text-zinc-750 leading-relaxed print:text-zinc-800 flex items-start gap-2.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-rose-500 mt-2 shrink-0"></span>
                    <p className="text-zinc-800">{f.editedStatement || f.statement}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
