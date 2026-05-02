import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBase64Image } from './wechatCompat';

describe('getBase64Image', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        vi.restoreAllMocks();
        globalThis.fetch = originalFetch;
    });

    it('returns the original URL when the fetched response is not an image', async () => {
        const imgUrl = 'https://example.com/not-an-image';
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: vi.fn().mockResolvedValue(new Blob(['plain text'], { type: 'text/plain' }))
        } as unknown as Response);

        globalThis.fetch = fetchMock as typeof fetch;

        await expect(getBase64Image(imgUrl)).resolves.toBe(imgUrl);
        expect(fetchMock).toHaveBeenCalledWith(imgUrl, { mode: 'cors', cache: 'default' });
    });
});