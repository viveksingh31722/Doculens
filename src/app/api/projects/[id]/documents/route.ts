import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractText, sectionText } from '@/lib/parser';
import crypto from 'crypto';

const MAX_FILES = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_EXTENSIONS = ['txt', 'md', 'docx'];
const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function detectDocumentType(name: string, content: string): string {
  const searchStr = (name + ' ' + content).toLowerCase();
  if (searchStr.includes('meeting') || searchStr.includes('notes') || searchStr.includes('sync') || searchStr.includes('standup')) {
    return 'meeting_notes';
  }
  if (searchStr.includes('requirements') || searchStr.includes('specs') || searchStr.includes('specification') || searchStr.includes('draft')) {
    return 'requirements_draft';
  }
  if (searchStr.includes('update') || searchStr.includes('status') || searchStr.includes('report') || searchStr.includes('weekly') || searchStr.includes('monthly')) {
    return 'project_update';
  }
  return 'unknown';
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await props.params;
  const requestId = crypto.randomUUID();

  try {
    // 1. Verify project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { documents: true },
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

    // 2. Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid multipart/form-data request.',
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No files provided for upload.',
            requestId,
          },
        },
        { status: 400 }
      );
    }

    // 3. Validate file count limit
    const existingCount = project.documents.length;
    if (existingCount + files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: {
            code: 'LIMIT_EXCEEDED',
            message: `Uploading these files would exceed the maximum limit of ${MAX_FILES} documents per project. Current count: ${existingCount}.`,
            requestId,
          },
        },
        { status: 400 }
      );
    }

    // 4. Validate each file and parse
    const processedDocs: {
      originalName: string;
      mimeType: string;
      rawText: string;
      documentType: string;
      storageKey: string;
      sections: {
        ordinal: number;
        heading: string | null;
        content: string;
        charStart: number;
        charEnd: number;
      }[];
    }[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      // Validate extension
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_FILE_TYPE',
              message: `File type for "${file.name}" is not supported. Supported extensions: TXT, MD, DOCX.`,
              requestId,
            },
          },
          { status: 400 }
        );
      }

      // Validate MIME type (optional fallback, since sometimes it's empty)
      if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
        // Warning log but allow if extension is correct, as browser mime types can be unreliable
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File "${file.name}" exceeds the maximum size limit of 2 MB.`,
              requestId,
            },
          },
          { status: 400 }
        );
      }

      // Read content
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Extract text
      let text = '';
      try {
        text = await extractText(buffer, file.type, file.name);
      } catch (err) {
        return NextResponse.json(
          {
            error: {
              code: 'PARSING_ERROR',
              message: `Failed to extract text from file "${file.name}".`,
              requestId,
              details: err instanceof Error ? err.message : String(err),
            },
          },
          { status: 400 }
        );
      }

      // Empty text check
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'EMPTY_FILE',
              message: `File "${file.name}" contains no readable text.`,
              requestId,
            },
          },
          { status: 400 }
        );
      }

      const documentType = detectDocumentType(file.name, text);
      const storageKey = `${crypto.randomUUID()}.${ext}`;
      const sections = sectionText(text);

      processedDocs.push({
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        rawText: text,
        documentType,
        storageKey,
        sections,
      });
    }

    // 5. Save all documents and sections inside a Prisma transaction
    const savedDocuments = await db.$transaction(async (tx) => {
      const docs = [];
      for (const pDoc of processedDocs) {
        const doc = await tx.document.create({
          data: {
            projectId,
            originalName: pDoc.originalName,
            mimeType: pDoc.mimeType,
            storageKey: pDoc.storageKey,
            rawText: pDoc.rawText,
            documentType: pDoc.documentType,
            sections: {
              create: pDoc.sections.map((sec) => ({
                ordinal: sec.ordinal,
                heading: sec.heading,
                content: sec.content,
                charStart: sec.charStart,
                charEnd: sec.charEnd,
              })),
            },
          },
          include: {
            sections: true,
          },
        });
        docs.push(doc);
      }
      return docs;
    }, {
      maxWait: 15000,
      timeout: 60000,
    });

    return NextResponse.json({
      success: true,
      documents: savedDocuments.map(d => ({
        id: d.id,
        originalName: d.originalName,
        documentType: d.documentType,
        sectionCount: d.sections.length,
      })),
      requestId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during document upload.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
