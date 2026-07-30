import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        documents: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            documentType: true,
            createdAt: true,
            sections: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        analysisRuns: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!project) {
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

    return NextResponse.json(project);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve project details.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

const patchProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = patchProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid project data provided.',
            requestId,
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const updated = await db.project.update({
      where: { id: projectId },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, project: updated, requestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update project.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    await db.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete project.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
