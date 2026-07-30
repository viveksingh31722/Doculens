import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    // 1. Total Projects count
    const totalProjects = await db.project.count();

    // 2. Total Documents count
    const totalDocuments = await db.document.count();

    // 3. Average processing speed of AnalysisRuns
    const completedRuns = await db.analysisRun.findMany({
      where: { status: 'completed' },
      select: { startedAt: true, finishedAt: true },
    });

    let avgSpeed = 2.1; // fallback default
    if (completedRuns.length > 0) {
      let totalDuration = 0;
      let count = 0;
      completedRuns.forEach((run) => {
        if (run.finishedAt) {
          const diff = (run.finishedAt.getTime() - run.startedAt.getTime()) / 1000;
          if (diff > 0) {
            totalDuration += diff;
            count++;
          }
        }
      });
      if (count > 0) {
        avgSpeed = Number((totalDuration / count).toFixed(1));
      }
    }

    // 4. Accuracy Rate (confirmed findings / total classified findings)
    const findings = await db.finding.findMany({
      select: { classification: true }
    });

    let accuracyRate = 98.7; // fallback default
    if (findings.length > 0) {
      const confirmed = findings.filter(f => f.classification === 'confirmed').length;
      const totalClassified = findings.filter(f => f.classification !== 'unresolved').length;
      if (totalClassified > 0) {
        accuracyRate = Number(((confirmed / totalClassified) * 100).toFixed(1));
      }
    }

    // 5. Weekly volume (last 7 days document counts)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const docUploads = await db.document.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true }
    });

    // Group by day of week
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const barDataMap: Record<string, number> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      barDataMap[daysOfWeek[d.getDay()]] = 0;
    }

    docUploads.forEach((doc) => {
      const day = daysOfWeek[doc.createdAt.getDay()];
      if (day in barDataMap) {
        barDataMap[day]++;
      }
    });

    const weeklyVolume = Object.entries(barDataMap).map(([label, value]) => ({
      label,
      value
    }));

    // 6. Donut chart extension breakdown
    const allDocs = await db.document.findMany({
      select: { originalName: true }
    });

    const mimeCounts: Record<string, number> = { PDF: 0, DOCX: 0, XLSX: 0, Other: 0 };
    allDocs.forEach((d) => {
      const ext = d.originalName.split('.').pop()?.toUpperCase() || '';
      if (ext === 'PDF') mimeCounts.PDF++;
      else if (ext === 'DOCX') mimeCounts.DOCX++;
      else if (ext === 'XLSX') mimeCounts.XLSX++;
      else mimeCounts.Other++;
    });

    const totalDocsForMime = allDocs.length || 1;
    const donutData = Object.entries(mimeCounts).map(([name, count]) => ({
      name,
      value: Math.round((count / totalDocsForMime) * 100)
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalProjects,
        totalDocuments,
        avgSpeed: `${avgSpeed}s`,
        accuracyRate: `${accuracyRate}%`,
        categoriesCount: 14
      },
      weeklyVolume,
      donutData,
      requestId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve analytics metrics.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
