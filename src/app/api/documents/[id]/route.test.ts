import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DELETE } from './route';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    document: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Delete Document API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 if document does not exist', async () => {
    vi.mocked(db.document.findUnique).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/documents/123', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('deletes document successfully if it exists', async () => {
    vi.mocked(db.document.findUnique).mockResolvedValue({
      id: '123',
      originalName: 'test.txt',
    } as never);
    vi.mocked(db.document.delete).mockResolvedValue({} as never);

    const request = new Request('http://localhost:3000/api/documents/123', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(db.document.delete).toHaveBeenCalledWith({
      where: { id: '123' },
    });
  });
});
