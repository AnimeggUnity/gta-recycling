import type { SortingTarget } from './sorting';

// Percent coordinates in the 1024 × 1536 background; never crop the artwork.
export const SORTING_DROP_ZONES: Readonly<Record<SortingTarget, Readonly<{ x: number; y: number; width: number; height: number; icon?: string }>>> = {
  plastic: { x: 14, y: 11, width: 30, height: 17, icon: 'pet-bottle-tall-ribbed' },
  'paper-container': { x: 16, y: 34, width: 29, height: 17, icon: 'paper-meal-box-rectangular-clamshell' },
  metal: { x: 55, y: 12, width: 29, height: 17, icon: 'metal-can-standard-soda' },
  paper: { x: 56, y: 34, width: 28, height: 17, icon: 'crumpled-paper-round-ball' },
  reject: { x: 77, y: 91, width: 21, height: 8 },
};
