import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const patchFindingSchema = z.object({
  classification: z.enum(['confirmed', 'interpretation', 'unresolved']).optional(),
  statement: z.string().min(1).optional(),
  editedStatement: z.string().min(1).nullable().optional(),
  reviewNote: z.string().nullable().optional(),
  reviewStatus: z.enum(['unreviewed', 'reviewed']).optional(),
});

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = patchFindingSchema.safeParse(body);

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

    const finding = await db.finding.findUnique({
      where: { id },
    });

    if (!finding) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Finding not found.',
            requestId,
          },
        },
        { status: 404 }
      );
    }

    const updated = await db.finding.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, finding: updated, requestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update finding.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
