import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const patchConflictSchema = z.object({
  status: z.enum(['unresolved', 'resolved']).optional(),
  resolutionNote: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = patchConflictSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid data provided for patch.',
            requestId,
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const conflict = await db.conflict.findUnique({
      where: { id },
    });

    if (!conflict) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Conflict not found.',
            requestId,
          },
        },
        { status: 404 }
      );
    }

    const updated = await db.conflict.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, conflict: updated, requestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update conflict.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
