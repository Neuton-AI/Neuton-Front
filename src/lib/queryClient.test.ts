import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { createQueryClient } from './queryClient';

describe('production query policy', () => {
  it.each([400, 401, 403, 404, 409, 429])('does not retry HTTP %s', async (status) => {
    const client = createQueryClient();
    const request = vi.fn().mockRejectedValue(new ApiError('Rejected', status));
    await expect(
      client.fetchQuery({ queryKey: ['policy', status], queryFn: request, retryDelay: 0 }),
    ).rejects.toThrow('Rejected');
    expect(request).toHaveBeenCalledTimes(1);
    client.clear();
  });
  it.each([0, 500, 503])('retries HTTP %s once', async (status) => {
    const client = createQueryClient();
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('Transient', status))
      .mockResolvedValue('recovered');
    await expect(
      client.fetchQuery({ queryKey: ['policy', status], queryFn: request, retryDelay: 0 }),
    ).resolves.toBe('recovered');
    expect(request).toHaveBeenCalledTimes(2);
    client.clear();
  });
  it('stops after a second network failure', async () => {
    const client = createQueryClient();
    const request = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(
      client.fetchQuery({ queryKey: ['policy'], queryFn: request, retryDelay: 0 }),
    ).rejects.toThrow('offline');
    expect(request).toHaveBeenCalledTimes(2);
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
    client.clear();
  });
});
