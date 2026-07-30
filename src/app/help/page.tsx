'use client';

import React from 'react';
import { HelpCircle, FileText, Sparkles } from 'lucide-react';
import { TextEffect } from '@/components/motion-primitives/text-effect';

export default function HelpPage() {
  return (
    <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full select-none">
      <div>
        <TextEffect preset="fade-in-blur" per="word" className="font-heading text-2xl sm:text-3xl font-extrabold text-zinc-900">
          Help & Support
        </TextEffect>
        <p className="mt-1 text-xs sm:text-sm text-zinc-450 font-medium">
          Get help operating the DocuLens Glass Laboratory workspace
        </p>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-white/60 shadow-sm max-w-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-150">
          <HelpCircle className="h-5 w-5 text-indigo-500" />
          <h3 className="font-heading text-sm font-bold text-zinc-900">Documentation & Guides</h3>
        </div>
        
        <div className="space-y-4 text-xs font-semibold text-zinc-650 leading-relaxed">
          <div>
            <h4 className="text-zinc-800 font-bold mb-1">What is Document Grounding?</h4>
            <p>AI document grounding analyzes multiple project specifications side-by-side to detect implicit schedule discrepancies, verify operational facts, and propose action items.</p>
          </div>

          <div>
            <h4 className="text-zinc-800 font-bold mb-1">How do I resolve schedule conflicts?</h4>
            <p>Open the Human Review Queue, click the Conflicts tab, select a grounding citation to read its context, input an alignment note, and click Resolve Conflict.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
