import { SORTING_ITEMS } from '../config/sorting';
import { AssetLoader } from './AssetLoader';
import background from '../../assets/optimized/backgrounds/truck-bed-sorting-v1.webp?url';
import police from '../../assets/optimized/failure/police-v1.webp?url';
import worker from '../../assets/optimized/failure/angry-worker-v1.webp?url';

const images = import.meta.glob<string>('../../assets/optimized/recycling/*/*.webp', { eager: true, query: '?url', import: 'default' });
export function recyclingImage(asset: string): string {
  const url = images[`../../assets/optimized/recycling/${asset.replace(/\.png$/, '.webp')}`];
  if (!url) throw new Error(`Missing optimized image: ${asset}`);
  return url;
}
export const gameArt = { background, police, worker } as const;
export const gameAssets = new AssetLoader([
  background, ...Object.values(SORTING_ITEMS).map(item => recyclingImage(item.asset)), police, worker,
]);
