import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSignedUrl } = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: vi.fn(() => ({ createSignedUrl })) } },
}));

import { getReceiptUrl } from './receiptUrl';

describe('receipt access', () => {
  beforeEach(() => {
    createSignedUrl.mockReset();
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://files.example/receipt.jpg?token=test' }, error: null });
  });

  it('resolves an uploaded storage path instead of treating it as an app page', async () => {
    expect(await getReceiptUrl('worker/receipt.jpg')).toBe('https://files.example/receipt.jpg?token=test');
    expect(createSignedUrl).toHaveBeenCalledWith('worker/receipt.jpg', 300);
  });

  it('renews legacy storage links rather than reusing an expired token', async () => {
    await getReceiptUrl('https://files.example/storage/v1/object/sign/belege/worker/receipt%20photo.jpg?token=expired');
    expect(createSignedUrl).toHaveBeenCalledWith('worker/receipt photo.jpg', 300);
  });

  it('preserves external legacy receipt links', async () => {
    expect(await getReceiptUrl('https://files.example/legacy.jpg')).toBe('https://files.example/legacy.jpg');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('reports denied or missing receipts instead of returning a broken link', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Access denied' } });
    await expect(getReceiptUrl('worker/missing.jpg')).rejects.toThrow('Receipt could not be loaded');
  });
});