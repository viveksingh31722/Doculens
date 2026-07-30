import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    project: {
      findUnique: vi.fn(),
    },
    summary: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logWorkflow: vi.fn(),
}));

describe('Summary Generation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 if project does not exist', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/projects/123/summary', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('generates summary successfully even if there are unresolved conflicts', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: '123',
      name: 'Test Project',
      findings: [],
      conflicts: [{ id: 'c-1', status: 'unresolved' }],
      actionItems: [],
    } as never);

    vi.mocked(db.summary.findFirst).mockResolvedValue(null);
    vi.mocked(db.summary.create).mockResolvedValue({ id: 'sum-123', version: 1 } as never);

    const request = new Request('http://localhost:3000/api/projects/123/summary', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.version).toBe(1);

    const savedJson = JSON.parse(vi.mocked(db.summary.create).mock.calls[0][0].data.contentJson);
    expect(savedJson.conflicts.length).toBe(1);
    expect(savedJson.conflicts[0].status).toBe('unresolved');
  });

  it('generates and versions summary successfully if conflicts resolved', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: '123',
      name: 'Test Project',
      findings: [
        { id: 'f-1', kind: 'fact', statement: 'Stated fact', sources: [] },
      ],
      conflicts: [{ id: 'c-1', status: 'resolved' }],
      actionItems: [
        { id: 'a-1', text: 'App Action', status: 'approved' },
        { id: 'a-2', text: 'Rej Action', status: 'rejected' },
      ],
    } as never);

    vi.mocked(db.summary.findFirst).mockResolvedValue({ version: 2 } as never);
    vi.mocked(db.summary.create).mockResolvedValue({ id: 'sum-123', version: 3 } as never);

    const request = new Request('http://localhost:3000/api/projects/123/summary', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.version).toBe(3);
    expect(db.summary.create).toHaveBeenCalledWith({
      data: {
        projectId: '123',
        version: 3,
        contentJson: expect.any(String),
      },
    });

    // Check that rejected action items were excluded from saved json
    const savedJson = JSON.parse(vi.mocked(db.summary.create).mock.calls[0][0].data.contentJson);
    expect(savedJson.actionItems.length).toBe(1);
    expect(savedJson.actionItems[0].id).toBe('a-1');
  });
});
