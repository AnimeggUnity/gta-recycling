import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetLoader, decodeImage, fetchDecodedImage } from '../src/ui/AssetLoader';
import { ASSET_LOADING } from '../src/config/balance';
import { displayImage } from '../src/ui/SafeImage';

const image = () => ({ naturalWidth: 256, naturalHeight: 256 } as HTMLImageElement);
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('decoded asset loading', () => {
  it('counts unique images only and retains successful decoded images', async () => {
    const decoder = vi.fn(async () => image());
    const loader = new AssetLoader(['a', 'a', 'b'], decoder);
    const listener = vi.fn();const unsubscribe = loader.subscribe(listener);
    expect(loader.snapshot.ready).toBe(false);
    await loader.start();await loader.start();
    expect(loader.snapshot).toEqual({ total: 2, loaded: 2, failed: 0, loading: false, ready: true });
    expect(loader.get('a')?.naturalWidth).toBe(256);
    expect(decoder).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
  it('does not start duplicates while loading and limits concurrent decoders', async () => {
    let active = 0, maximum = 0;
    const loader = new AssetLoader(Array.from({ length: 10 }, (_, i) => `${i}`), async () => {
      maximum = Math.max(maximum, ++active);
      await new Promise(resolve => setTimeout(resolve, 1));active--;return image();
    });
    const first = loader.start();expect(loader.start()).toBe(first);await first;
    expect(maximum).toBe(ASSET_LOADING.concurrency);
    expect(loader.snapshot.ready).toBe(true);
  });
  it('keeps the start gate closed after a failure and retries only the missing asset', async () => {
    let offline = true;
    const decoder = vi.fn(async (url: string) => { if (url === 'b' && offline) throw Error('offline');return image(); });
    const loader = new AssetLoader(['a', 'b'], decoder);await loader.start();
    expect(loader.snapshot).toEqual({ total: 2, loaded: 1, failed: 1, loading: false, ready: false });
    offline = false;await loader.start();
    expect(loader.snapshot.ready).toBe(true);
    expect(decoder.mock.calls.filter(([url]) => url === 'a')).toHaveLength(1);
    expect(decoder.mock.calls.filter(([url]) => url === 'b')).toHaveLength(2);
  });
  it('is ready immediately when no images are required', () => {
    expect(new AssetLoader([]).snapshot.ready).toBe(true);
  });
  it('retains downloaded bytes as a local URL and rejects HTTP errors', async () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:cached'), revokeObjectURL: revoke });
    vi.stubGlobal('Image', class { src = ''; decoding = ''; naturalWidth = 256; naturalHeight = 256; async decode() {} });
    const request = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['image']) }));
    vi.stubGlobal('fetch', request);
    expect((await fetchDecodedImage('/asset.webp')).src).toBe('blob:cached');
    expect(revoke).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 404 }));
    await expect(fetchDecodedImage('/missing.webp')).rejects.toThrow('404');
  });
  it('releases downloaded bytes when decoding fails', async () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:broken', revokeObjectURL: revoke });
    vi.stubGlobal('fetch', async () => ({ ok: true, blob: async () => new Blob(['invalid']) }));
    vi.stubGlobal('Image', class { src = ''; decode() { return Promise.reject(Error('invalid image')); } });
    await expect(fetchDecodedImage('/broken.webp')).rejects.toThrow('invalid image');
    expect(revoke).toHaveBeenCalledWith('blob:broken');
  });
  it('times out a stalled network instead of waiting forever', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Image', class { src = ''; decoding = ''; decode() { return new Promise(() => {}); } });
    const assertion = expect(decodeImage('offline')).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(ASSET_LOADING.timeoutMs);await assertion;
  });
  it('hides an image until decoding completes and replaces errors with a safe state', async () => {
    let resolve: () => void = () => {};
    const node = { src: '', decoding: '', dataset: {}, naturalWidth: 256, naturalHeight: 256, decode: () => new Promise<void>(done => { resolve = done; }), removeAttribute: vi.fn() } as unknown as HTMLImageElement;
    const changes = vi.fn();displayImage(node, 'a', changes);
    expect(node.dataset.imageState).toBe('loading');resolve();
    await vi.waitFor(() => expect(node.dataset.imageState).toBe('ready'));
    node.decode = () => Promise.reject(Error('broken'));displayImage(node, 'broken', changes);
    await vi.waitFor(() => expect(node.dataset.imageState).toBe('error'));
    expect(node.removeAttribute).toHaveBeenCalledWith('src');
  });
});
