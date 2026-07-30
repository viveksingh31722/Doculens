import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: docId } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    const document = await db.document.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Document not found.',
            requestId,
          },
        },
        { status: 404 }
      );
    }

    await db.document.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete document.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
