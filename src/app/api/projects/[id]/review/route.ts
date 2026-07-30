import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    // 1. Verify project exists
    const projectExists = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!projectExists) {
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

    // 2. Fetch findings with sources and document details
    const findings = await db.finding.findMany({
      where: { projectId },
      include: {
        sources: {
          include: {
            document: {
              select: {
                originalName: true,
              },
            },
            section: {
              select: {
                heading: true,
                content: true,
                ordinal: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Fetch conflicts with linked findings and their sources
    const conflicts = await db.conflict.findMany({
      where: { projectId },
      include: {
        findings: {
          include: {
            finding: {
              include: {
                sources: {
                  include: {
                    document: {
                      select: {
                        originalName: true,
                      },
                    },
                    section: {
                      select: {
                        heading: true,
                        content: true,
                        ordinal: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 4. Fetch proposed action items
    const actionItems = await db.actionItem.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      project: projectExists,
      findings,
      conflicts,
      actionItems,
      requestId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve review queue data.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
