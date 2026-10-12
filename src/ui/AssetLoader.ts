import { ASSET_LOADING } from '../config/balance';

export type AssetSnapshot = Readonly<{ loaded: number; total: number; failed: number; loading: boolean; ready: boolean }>;
export type ImageDecoder = (url: string) => Promise<HTMLImageElement>;

export async function decodeImage(url: string, image = new Image()): Promise<HTMLImageElement> {
  image.decoding = 'async';
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    image.src = url;
    await Promise.race([
      image.decode(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Image loading timed out')), ASSET_LOADING.timeoutMs); }),
    ]);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image');
    return image;
  } catch (error) {
    image.src = '';
    throw error;
  } finally { clearTimeout(timeout); }
}

/** Keep downloaded bytes in memory so new DOM images never depend on another request. */
export async function fetchDecodedImage(url: string): Promise<HTMLImageElement> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASSET_LOADING.timeoutMs);
  let objectUrl: string | undefined;
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
    objectUrl = URL.createObjectURL(await response.blob());
    return await decodeImage(objectUrl);
  } catch (error) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw error;
  } finally { clearTimeout(timeout); }
}

/** Retains decoded images, limits network concurrency, and retries only missing assets. */
export class AssetLoader {
  private readonly urls: readonly string[];
  private readonly decoded = new Map<string, HTMLImageElement>();
  private readonly listeners = new Set<(state: AssetSnapshot) => void>();
  private failed = 0;
  private loading = false;
  private running?: Promise<void>;

  public constructor(urls: readonly string[], private readonly decoder: ImageDecoder = fetchDecodedImage) {
    this.urls = [...new Set(urls)];
  }
  public get snapshot(): AssetSnapshot {
    return { loaded: this.decoded.size, total: this.urls.length, failed: this.failed, loading: this.loading, ready: this.decoded.size === this.urls.length };
  }
  public get(url: string): HTMLImageElement | undefined { return this.decoded.get(url); }
  public subscribe(listener: (state: AssetSnapshot) => void): () => void {
    this.listeners.add(listener); listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
  public start(): Promise<void> {
    if (this.running) return this.running;
    if (this.snapshot.ready) return Promise.resolve();
    this.failed = 0; this.loading = true; this.notify();
    const missing = this.urls.filter(url => !this.decoded.has(url));
    let next = 0;
    const worker = async () => {
      while (next < missing.length) {
        const url = missing[next++];
        try { this.decoded.set(url, await this.decoder(url)); }
        catch { this.failed++; }
        this.notify();
      }
    };
    this.running = Promise.all(Array.from({ length: Math.min(ASSET_LOADING.concurrency, missing.length) }, worker)).then(() => {
      this.loading = false; this.running = undefined; this.notify();
    });
    return this.running;
  }
  private notify(): void { for (const listener of this.listeners) listener(this.snapshot); }
}
