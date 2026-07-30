import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logWorkflow } from '@/lib/logger';
import crypto from 'crypto';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    const summary = await db.summary.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    if (!summary) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No summaries found for this project.',
            requestId,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve project summary.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const requestId = crypto.randomUUID();

  logWorkflow(requestId, 'summary_generation_start', { projectId });

  try {
    // 1. Fetch project, documents, conflicts, findings and action items
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        findings: {
          include: {
            sources: {
              include: {
                document: { select: { originalName: true } },
                section: { select: { heading: true, ordinal: true } },
              },
            },
          },
        },
        conflicts: true,
        actionItems: true,
      },
    });

    if (!project) {
      logWorkflow(requestId, 'summary_generation_failed', { projectId, error: 'Project not found' });
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found.',
            requestId,
          },
        },
        { status: 404 }
      );
    }

    // 2. Log conflict resolution status
    const unresolvedConflicts = project.conflicts.filter((c) => c.status === 'unresolved');
    if (unresolvedConflicts.length > 0) {
      console.warn(`[Summary] Generating summary for project ${projectId} with ${unresolvedConflicts.length} unresolved conflicts.`);
    }

    // 3. Assemble components: exclude rejected action items, group findings
    const approvedActions = project.actionItems.filter((a) => a.status === 'approved');
    
    // Group findings
    const groupedFindings = {
      facts: project.findings.filter((f) => f.kind === 'fact'),
      decisions: project.findings.filter((f) => f.kind === 'decision'),
      assumptions: project.findings.filter((f) => f.kind === 'assumption'),
      risks: project.findings.filter((f) => f.kind === 'risk'),
      openQuestions: project.findings.filter((f) => f.kind === 'open_question'),
    };

    const summaryData = {
      projectName: project.name,
      projectId: project.id,
      generatedAt: new Date().toISOString(),
      findings: groupedFindings,
      actionItems: approvedActions,
      resolvedConflicts: project.conflicts.filter((c) => c.status === 'resolved'),
      conflicts: project.conflicts, // Keep all conflicts (resolved & unresolved)
    };

    // 4. Versioning
    const lastSummary = await db.summary.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = lastSummary ? lastSummary.version + 1 : 1;

    // 5. Persist
    const summary = await db.summary.create({
      data: {
        projectId,
        version: nextVersion,
        contentJson: JSON.stringify(summaryData),
      },
    });

    logWorkflow(requestId, 'summary_generation_success', {
      projectId,
      summaryId: summary.id,
      version: nextVersion,
      findingsCount: project.findings.length,
      actionItemsCount: approvedActions.length,
    });

    return NextResponse.json(summary, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWorkflow(requestId, 'summary_generation_error', { projectId, error: errorMessage });
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during summary generation.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
