import { expect, test, vi } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
  },
}));

test('GET health endpoint returns healthy state', async () => {
  const response = await GET();
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.status).toBe('healthy');
  expect(data.database).toBe('connected');
});
