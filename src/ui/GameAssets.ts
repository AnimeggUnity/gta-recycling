import { SORTING_ITEMS } from '../config/sorting';
import { AssetLoader } from './AssetLoader';
import { readGameMode } from './GameMode';
import background from '../../assets/optimized/backgrounds/truck-bed-sorting-v1.webp?url';
import police from '../../assets/optimized/failure/police-v1.webp?url';
import worker from '../../assets/optimized/failure/angry-worker-v1.webp?url';
import garbageWorker from '../../assets/optimized/failure/angry-garbage-worker-v1.webp?url';

const images = import.meta.glob<string>(['../../assets/optimized/recycling/*/*.webp', '!../../assets/optimized/recycling/used-tissue/*.webp', '!../../assets/optimized/recycling/non-recyclable/02-pillow.webp'], { eager: true, query: '?url', import: 'default' });
export function recyclingImage(asset: string): string {
  const url = images[`../../assets/optimized/recycling/${asset.replace(/\.png$/, '.webp')}`];
  if (!url) throw new Error(`Missing optimized image: ${asset}`);
  return url;
}
const garbageMode = typeof window !== 'undefined' && readGameMode() === 'garbage';
export const gameArt = { background, police, worker, garbageWorker } as const;
export const gameAssets = new AssetLoader([
  ...(garbageMode ? [] : [background, ...Object.values(SORTING_ITEMS).map(item => recyclingImage(item.asset))]), police, garbageMode ? garbageWorker : worker,
]);
