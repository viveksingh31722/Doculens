'use client';

import React from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { TextEffect } from '@/components/motion-primitives/text-effect';

export default function SettingsPage() {
  return (
    <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full select-none">
      <div>
        <TextEffect preset="fade-in-blur" per="word" className="font-heading text-2xl sm:text-3xl font-extrabold text-zinc-900">
          Settings
        </TextEffect>
        <p className="mt-1 text-xs sm:text-sm text-zinc-450 font-medium">
          Configure application parameters and AI models
        </p>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-white/60 shadow-sm max-w-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-150">
          <Settings className="h-5 w-5 text-indigo-500" />
          <h3 className="font-heading text-sm font-bold text-zinc-900">General Configuration</h3>
        </div>
        
        <div className="space-y-4 text-xs font-semibold text-zinc-700">
          <div>
            <label className="block text-zinc-500 mb-1">Active AI Model</label>
            <select className="w-full rounded-xl bg-white border border-zinc-200 px-3.5 py-2 font-medium focus:ring-2 focus:ring-indigo-500/20">
              <option>Gemini 2.5 Pro (Default)</option>
              <option>Gemini 2.5 Flash</option>
              <option>Offline Mock Engine</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-500 mb-1">Default Workspace</label>
            <select className="w-full rounded-xl bg-white border border-zinc-200 px-3.5 py-2 font-medium focus:ring-2 focus:ring-indigo-500/20">
              <option>Website Checkout Refresh</option>
              <option>Global Workspace</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2 text-zinc-450 font-bold">
            <input type="checkbox" defaultChecked className="rounded border-zinc-300 text-indigo-650" />
            <span>Enable real-time schedule conflict alerts</span>
          </div>
        </div>
      </div>
    </main>
  );
}
