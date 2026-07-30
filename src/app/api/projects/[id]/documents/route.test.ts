import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    project: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/parser', () => ({
  extractText: vi.fn(),
  sectionText: vi.fn(),
}));

describe('Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 if project does not exist', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue(null);

    const request = {
      formData: vi.fn().mockResolvedValue({
        getAll: () => [],
      }),
    } as unknown as Request;

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('rejects if file size exceeds 2 MB', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: '123',
      name: 'Test Project',
      documents: [],
    } as never);

    const mockFile = {
      name: 'large.txt',
      type: 'text/plain',
      size: 2 * 1024 * 1024 + 1,
      arrayBuffer: async () => new ArrayBuffer(0),
    };

    const request = {
      formData: vi.fn().mockResolvedValue({
        getAll: () => [mockFile],
      }),
    } as unknown as Request;

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects unsupported extensions', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: '123',
      name: 'Test Project',
      documents: [],
    } as never);

    const mockFile = {
      name: 'test.pdf',
      type: 'application/pdf',
      size: 1000,
      arrayBuffer: async () => new ArrayBuffer(0),
    };

    const request = {
      formData: vi.fn().mockResolvedValue({
        getAll: () => [mockFile],
      }),
    } as unknown as Request;

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects if upload limit exceeded', async () => {
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: '123',
      name: 'Test Project',
      documents: [{}, {}, {}], // 3 existing
    } as never);

    const mockFile = {
      name: 'test.txt',
      type: 'text/plain',
      size: 1000,
      arrayBuffer: async () => new ArrayBuffer(0),
    };

    const request = {
      formData: vi.fn().mockResolvedValue({
        getAll: () => [mockFile],
      }),
    } as unknown as Request;

    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('LIMIT_EXCEEDED');
  });
});
