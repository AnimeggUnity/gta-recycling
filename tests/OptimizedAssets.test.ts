import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { SORTING_ITEMS } from '../src/config/sorting';

describe('optimized game artwork', () => {
  it('preserves genuine transparency in the provided civilian failure illustration', async () => {
    const image = sharp(await readFile(new URL('../assets/optimized/failure/angry-woman-throw-v1.webp', import.meta.url)));
    const metadata = await image.metadata();
    expect(metadata.width).toBe(512); expect(metadata.height).toBe(512);
    expect(metadata.hasAlpha).toBe(true);
    const { channels } = await image.stats();
    expect(channels[3].min).toBe(0); expect(channels[3].max).toBe(255);
  });
  it('ships all three toss bags as small transparent sprites', async () => {
    for (const name of ['normal-bag', 'hazard-bag-gas', 'hazard-bag-battery']) {
      const image = sharp(await readFile(new URL(`../assets/optimized/toss/${name}.webp`, import.meta.url)));
      const metadata = await image.metadata();
      expect(metadata.width).toBe(256); expect(metadata.height).toBe(256);
      expect(metadata.hasAlpha).toBe(true);
      const { channels } = await image.stats();
      expect(channels[3].min).toBe(0); expect(channels[3].max).toBe(255);
    }
  });
  it('keeps all active images and archived tissues small and genuinely transparent', async () => {
    const manifest = JSON.parse(await readFile(new URL('../assets/optimized/manifest.json', import.meta.url), 'utf8'));
    const items = manifest.entries.filter((entry: { output: string }) => entry.output.includes('/recycling/'));
    expect(items).toHaveLength(41);
    expect(Object.values(SORTING_ITEMS)).toHaveLength(35);
    for (const item of Object.values(SORTING_ITEMS)) expect(items.some((entry: { output: string }) => entry.output.endsWith(item.asset.replace(/\.png$/, '.webp')))).toBe(true);
    expect(items.filter((entry: { output: string }) => entry.output.includes('/used-tissue/'))).toHaveLength(5);
    for (const entry of items) {
      const url = new URL(`../${entry.output}`, import.meta.url);
      const buffer = await readFile(url);const metadata = await sharp(buffer).metadata();
      expect(Math.max(metadata.width!, metadata.height!)).toBe(256);
      expect(metadata.hasAlpha).toBe(true);
      const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(data[info.channels - 1]).toBe(0);
      expect(buffer.length).toBeLessThan(40000);
    }
  });
  it('preserves background composition and reduces total image payload by over 90%', async () => {
    const manifest = JSON.parse(await readFile(new URL('../assets/optimized/manifest.json', import.meta.url), 'utf8'));
    const background = manifest.entries.find((entry: { output: string }) => entry.output.includes('/backgrounds/'));
    expect(background.width / background.height).toBe(2 / 3);
    expect(manifest.totals.optimizedBytes).toBeLessThan(manifest.totals.originalBytes * .1);
  });
});
