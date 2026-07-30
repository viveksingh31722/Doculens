import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PATCH } from './route';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    actionItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Action Item PATCH API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid status', async () => {
    const request = new Request('http://localhost:3000/api/action-items/123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid_status' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates status successfully if valid', async () => {
    vi.mocked(db.actionItem.findUnique).mockResolvedValue({
      id: '123',
      text: 'Do something',
      status: 'proposed',
    } as never);
    vi.mocked(db.actionItem.update).mockResolvedValue({} as never);

    const request = new Request('http://localhost:3000/api/action-items/123', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved', reviewNote: 'Approved by human' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(db.actionItem.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        status: 'approved',
        reviewNote: 'Approved by human',
      },
    });
  });
});
