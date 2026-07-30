'use client';

import React, { useState } from 'react';
import { 
  BarChart3, FileText, CheckCircle2, Clock, Zap, Sparkles, Folder,
  ChevronRight, ArrowRight, RefreshCw, BarChart
} from 'lucide-react';
import { motion } from 'motion/react';
import { TextEffect } from '@/components/motion-primitives/text-effect';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const stats = [
    { label: 'Total Documents', value: '12,847', icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'Processing Speed', value: '2.1s avg', icon: Zap, color: 'text-purple-650 bg-purple-50 border-purple-100' },
    { label: 'Accuracy Rate', value: '98.7%', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Categories', value: '14', icon: Folder, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  ];

  const barData = [
    { label: 'Mon', value: 115 },
    { label: 'Tue', value: 135 },
    { label: 'Wed', value: 98 },
    { label: 'Thu', value: 155 },
    { label: 'Fri concluded', value: 175 },
    { label: 'Sat', value: 90 },
    { label: 'Sun', value: 80 },
  ];

  const donutData = [
    { name: 'PDF', value: 45, color: '#4F46E5', offset: 0 },
    { name: 'DOCX', value: 25, color: '#10B981', offset: 45 },
    { name: 'XLSX', value: 15, color: '#F59E0B', offset: 70 },
    { name: 'Images', value: 10, color: '#8B5CF6', offset: 85 },
    { name: 'Other', value: 5, color: '#F97316', offset: 95 },
  ];

  const timeBreakdown = [
    { range: '< 1s', pct: 35, color: 'bg-indigo-500' },
    { range: '1–3s', pct: 45, color: 'bg-emerald-500' },
    { range: '3–5s', pct: 15, color: 'bg-amber-500' },
    { range: '> 5s', pct: 5, color: 'bg-rose-500' },
  ];

  const topPerforming = [
    { category: 'Financial Reports', count: '342 docs', accuracy: 99.2, color: 'bg-emerald-500' },
    { category: 'Contracts', count: '218 docs', accuracy: 97.8, color: 'bg-emerald-500' },
    { category: 'Invoices', count: '186 docs', accuracy: 96.5, color: 'bg-amber-500' },
    { category: 'Research Papers', count: '98 docs', accuracy: 95.2, color: 'bg-amber-500' },
  ];

  // SVG parameters for donut chart
  const radius = 50;
  const circ = 2 * Math.PI * radius;

  return (
    <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full select-none">
      {/* Header Panel */}
      <div>
        <TextEffect preset="fade-in-blur" per="word" className="font-heading text-2xl sm:text-3xl font-extrabold text-zinc-900">
          Analytics
        </TextEffect>
        <p className="mt-1 text-xs sm:text-sm text-zinc-450 font-medium">
          Deep insights into your document processing metrics
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="glass-panel p-5 rounded-2xl border border-white/60 shadow-sm flex items-center gap-4 relative overflow-hidden"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block">{s.label}</span>
              <span className="text-xl font-extrabold text-zinc-900 tracking-tight block mt-0.5">{s.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column (2/3): Bar Chart & Horizontal Progress breakdown */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Documents Processed (Bar Chart) */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-heading text-sm font-bold text-zinc-900">Documents Processed</h3>
                <p className="text-[11px] font-medium text-zinc-400 mt-0.5">Weekly volume distribution</p>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-xl">
                This Week
              </span>
            </div>

            {/* SVG/Div Bar Chart */}
            <div className="h-64 flex justify-between items-end gap-3 pt-6 px-4">
              {barData.map((item, idx) => {
                // Find percentage relative to max value (175)
                const pct = (item.value / 175) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-zinc-900 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold shadow-md absolute translate-y-[-210px] pointer-events-none">
                      {item.value} docs
                    </div>
                    {/* Bar element */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05, ease: 'easeOut' }}
                      className="w-full rounded-t-xl bg-gradient-to-t from-indigo-650 to-indigo-500 shadow-sm group-hover:from-indigo-600 group-hover:to-indigo-400 transition-all"
                    />
                    {/* X Label */}
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-700 transition-colors">
                      {item.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Processing Time Breakdown */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-heading text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-zinc-400" />
                  Processing Time
                </h3>
                <p className="text-[11px] font-medium text-zinc-400 mt-0.5">Distribution of document analysis times</p>
              </div>
            </div>

            <div className="space-y-4">
              {timeBreakdown.map((row, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-800">
                    <span>{row.range}</span>
                    <span>{row.pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                    <motion.div
                      className={cn("h-full rounded-full", row.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${row.pct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1/3): Donut Chart & Top Performing list */}
        <div className="space-y-8">
          
          {/* Document Types Donut */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-heading text-sm font-bold text-zinc-900">Document Types</h3>
              <span className="text-[10px] font-bold text-zinc-400">Distribution</span>
            </div>

            {/* Donut Area */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  {donutData.map((slice, idx) => {
                    const strokeDashoffset = circ - (slice.value / 100) * circ;
                    const strokeDasharray = `${circ} ${circ}`;
                    // Calculate rotation angle
                    const rotation = (slice.offset / 100) * 360;
                    
                    return (
                      <motion.circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 0.8, delay: idx * 0.08 }}
                        transform={`rotate(${rotation} 60 60)`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredType(slice.name)}
                        onMouseLeave={() => setHoveredType(null)}
                        style={{
                          opacity: hoveredType === null || hoveredType === slice.name ? 1 : 0.65
                        }}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-zinc-800 tracking-tight">
                    {hoveredType ? donutData.find(d => d.name === hoveredType)?.value + '%' : '100%'}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
                    {hoveredType ? hoveredType : 'Processed'}
                  </span>
                </div>
              </div>

              {/* Legends list */}
              <div className="w-full space-y-2 pt-2 border-t border-zinc-150">
                {donutData.map((slice, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center text-xs font-semibold text-zinc-700 hover:bg-zinc-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                    onMouseEnter={() => setHoveredType(slice.name)}
                    onMouseLeave={() => setHoveredType(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                      <span>{slice.name}</span>
                    </div>
                    <span className="font-extrabold text-zinc-900">{slice.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Performing Categories */}
          <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm space-y-5">
            <h3 className="font-heading text-sm font-bold text-zinc-900 flex items-center gap-2">
              <BarChart className="h-4.5 w-4.5 text-zinc-450" />
              Top Performing
            </h3>

            <div className="space-y-4">
              {topPerforming.map((row, idx) => (
                <div key={idx} className="space-y-1.5 hover:bg-zinc-50/50 p-1.5 rounded-lg transition-colors">
                  <div className="flex justify-between text-xs font-bold text-zinc-850">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400">{idx + 1}.</span>
                      {row.category}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold">{row.count}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                      <motion.div
                        className={cn("h-full rounded-full", row.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${row.accuracy}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                      />
                    </div>
                    <span className="text-[10px] font-extrabold text-zinc-800">{row.accuracy}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
