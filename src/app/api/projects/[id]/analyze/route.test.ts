import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { db } from '@/lib/db';
import { extractFindings } from '@/lib/openai';

vi.mock('@/lib/db', () => ({
  db: {
    project: {
      findUnique: vi.fn(),
    },
    analysisRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(db)),
    finding: {
      create: vi.fn().mockResolvedValue({ id: 'f-1', sources: [] }),
    },
    actionItem: {
      create: vi.fn(),
    },
    conflict: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/openai', () => ({
  extractFindings: vi.fn(),
  promptVersion: 'v1.0.0',
}));

describe('Analysis API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 if project is not found', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/projects/123/analyze', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 if project has no sections', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: '123',
      name: 'Project',
      documents: [],
    } as never);

    const request = new Request('http://localhost:3000/api/projects/123/analyze', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('NO_DOCUMENTS');
  });

  it('runs analysis and validates citations successfully', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: '123',
      name: 'Project',
      documents: [
        {
          id: 'doc-1',
          sections: [
            {
              id: 'sec-1',
              heading: 'Launch Specs',
              content: 'Website launch date is set for October 10th.',
            },
          ],
        },
      ],
    } as never);

    vi.mocked(db.analysisRun.create).mockResolvedValue({ id: 'run-1' } as never);
    vi.mocked(db.analysisRun.update).mockResolvedValue({} as never);

    // Mock extraction returning one valid citation and one invalid citation finding
    vi.mocked(extractFindings).mockResolvedValue({
      findings: [
        {
          kind: 'decision',
          statement: 'Launch on October 10th',
          classification: 'confirmed',
          evidence: [
            {
              sectionId: 'sec-1',
              quote: 'October 10th',
            },
          ],
        },
        {
          kind: 'fact',
          statement: 'Hallucinated finding',
          classification: 'confirmed',
          evidence: [
            {
              sectionId: 'sec-1',
              quote: 'This text is not in content',
            },
          ],
        },
      ],
      geminiCallCount: 1,
      provider: 'gemini',
    } as never);

    const request = new Request('http://localhost:3000/api/projects/123/analyze', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.findingsCount).toBe(1); // 1 valid, 1 invalid quote filtered out
    expect(db.analysisRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: 'completed',
      }),
    });
  });
});
