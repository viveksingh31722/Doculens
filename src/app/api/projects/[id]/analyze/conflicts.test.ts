import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => {
  const mockDb = {
    project: {
      findUnique: vi.fn(),
    },
    analysisRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-1' }),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockDb)),
    finding: {
      create: vi.fn(),
    },
    actionItem: {
      create: vi.fn(),
    },
    conflict: {
      create: vi.fn(),
    },
  };
  return { db: mockDb };
});

describe('Analysis Conflicts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env keys to trigger mock offline path
    process.env.GEMINI_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
  });

  it('correctly detects launch date and language scope conflicts for Customer Support Portal documents', async () => {
    // 1. Mock project with Customer Support Portal sections
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: 'proj-csp',
      name: 'Customer Support Portal',
      documents: [
        {
          id: 'doc-kickoff',
          originalName: 'Kickoff Notes.md',
          mimeType: 'text/plain',
          storageKey: 'key-kickoff',
          rawText: 'Launch target date October 8, 2026. The initial release will be English-only.',
          documentType: 'kickoff_notes',
          createdAt: new Date(),
          sections: [
            {
              id: 'sec-kickoff',
              documentId: 'doc-kickoff',
              ordinal: 1,
              heading: 'Launch Date and Scope',
              content: 'Launch target date October 8, 2026. The initial release will be English-only.',
              charStart: 0,
              charEnd: 74,
            },
          ],
        },
        {
          id: 'doc-reqs',
          originalName: 'Requirements.md',
          mimeType: 'text/plain',
          storageKey: 'key-reqs',
          rawText: 'Proposed production launch date is October 22, 2026. Language scope includes English-and-Hindi.',
          documentType: 'requirements',
          createdAt: new Date(),
          sections: [
            {
              id: 'sec-reqs',
              documentId: 'doc-reqs',
              ordinal: 1,
              heading: 'Launch and Languages',
              content: 'Proposed production launch date is October 22, 2026. Language scope includes English-and-Hindi.',
              charStart: 0,
              charEnd: 95,
            },
          ],
        },
      ],
    } as any);

    // 2. Mock db.finding.create to return a simulated saved finding with sequential IDs
    let findingIdCounter = 1;
    (db.finding.create as any).mockImplementation(async (args: any) => {
      const fid = `finding-${findingIdCounter++}`;
      return {
        id: fid,
        projectId: args.data.projectId,
        runId: args.data.runId,
        kind: args.data.kind,
        statement: args.data.statement,
        classification: args.data.classification,
        reviewStatus: args.data.reviewStatus,
        reviewNote: args.data.reviewNote,
        sources: [],
      };
    });

    const request = new Request('http://localhost:3000/api/projects/proj-csp/analyze', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'proj-csp' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // 3. Verify conflicts were persisted with correct titles
    expect(db.conflict.create).toHaveBeenCalledTimes(2);

    const firstCall = vi.mocked(db.conflict.create).mock.calls[0][0];
    const secondCall = vi.mocked(db.conflict.create).mock.calls[1][0];

    expect(firstCall.data.title).toBe('Launch date discrepancy');
    expect(secondCall.data.title).toBe('First-release language scope discrepancy');

    // Verify correct statuses
    expect(firstCall.data.status).toBe('unresolved');
    expect(secondCall.data.status).toBe('unresolved');
  });
});
