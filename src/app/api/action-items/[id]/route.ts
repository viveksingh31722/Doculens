import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const patchActionItemSchema = z.object({
  status: z.enum(['proposed', 'approved', 'rejected']).optional(),
  text: z.string().min(1).optional(),
  editedText: z.string().min(1).nullable().optional(),
  reviewNote: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = patchActionItemSchema.safeParse(body);

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

    const actionItem = await db.actionItem.findUnique({
      where: { id },
    });

    if (!actionItem) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Action item not found.',
            requestId,
          },
        },
        { status: 404 }
      );
    }

    const updated = await db.actionItem.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, actionItem: updated, requestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update action item.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
