import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional(),
});

async function seedDemoData() {
  await db.project.create({
    data: {
      name: 'Website Checkout Refresh',
      description: 'Demo project workspace evaluating launch parameters and schedule coordination between specs and marketing plan.',
      status: 'active',
      documents: {
        create: [
          {
            originalName: 'launch specs draft.txt',
            mimeType: 'text/plain',
            storageKey: 'demo-launch-specs.txt',
            rawText: 'Website Launch Specs\nWebsite launch date is set for October 10th.\nThe development team is finishing checkout page refinements.',
            documentType: 'requirements_draft',
            sections: {
              create: [
                {
                  ordinal: 1,
                  heading: 'Introduction',
                  content: 'Website launch date is set for October 10th.',
                  charStart: 0,
                  charEnd: 65,
                },
                {
                  ordinal: 2,
                  heading: 'Refinements',
                  content: 'The development team is finishing checkout page refinements.',
                  charStart: 66,
                  charEnd: 125,
                }
              ]
            }
          },
          {
            originalName: 'marketing update.md',
            mimeType: 'text/markdown',
            storageKey: 'demo-marketing-update.md',
            rawText: 'Marketing Updates\nThe marketing campaign is ready for release.\nThe launch event will happen on October 12th.',
            documentType: 'project_update',
            sections: {
              create: [
                {
                  ordinal: 1,
                  heading: 'Campaign',
                  content: 'The marketing campaign is ready for release.',
                  charStart: 0,
                  charEnd: 60,
                },
                {
                  ordinal: 2,
                  heading: 'Launch Event',
                  content: 'The launch event will happen on October 12th.',
                  charStart: 61,
                  charEnd: 120,
                }
              ]
            }
          },
          {
            originalName: 'meeting notes.txt',
            mimeType: 'text/plain',
            storageKey: 'demo-meeting-notes.txt',
            rawText: 'Team Meeting Notes\nWe discussed the checkout launch details.\nWebsite launch date is set for October 10th.',
            documentType: 'meeting_notes',
            sections: {
              create: [
                {
                  ordinal: 1,
                  heading: 'Notes',
                  content: 'Website launch date is set for October 10th.',
                  charStart: 0,
                  charEnd: 85,
                }
              ]
            }
          }
        ]
      }
    }
  });
}

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    let projects = await db.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    if (projects.length === 0) {
      await seedDemoData();
      projects = await db.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      });
    }

    return NextResponse.json(projects);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch projects.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid project data.',
            requestId,
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }
    
    const project = await db.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        status: 'active',
      },
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create project.',
          requestId,
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
