import type { RecyclingType } from '../game/CargoHold';

export type SortingTarget = 'plastic' | 'paper-container' | 'metal' | 'paper' | 'reject';
export type SortingItem = Readonly<{ id: string; label: string; target: SortingTarget; cargoType?: RecyclingType; volume: number; weight: number; asset: string }>;
export const SORTING_TARGETS: Readonly<Record<SortingTarget, string>> = {
  plastic: '塑膠瓶', 'paper-container': '紙容器', metal: '金屬罐', paper: '紙類', reject: '退回',
};

const groups = [
  { category: 'pet-bottle', label: '寶特瓶', target: 'plastic', cargoType: 'plastic', variants: ['tall-ribbed', 'short-wide', 'square-body', 'waisted-sport', 'crushed-bent'] },
  { category: 'paper-meal-box', label: '紙餐盒', target: 'paper-container', cargoType: 'paper', variants: ['rectangular-clamshell', 'square-folded', 'round-bowl', 'oval-tray', 'trapezoid-box'] },
  { category: 'metal-can', label: '金屬罐', target: 'metal', cargoType: 'metal', variants: ['standard-soda', 'tall-slim', 'short-wide', 'ribbed-food', 'crushed-flat'] },
  { category: 'crumpled-paper', label: '揉紙', target: 'paper', cargoType: 'paper', variants: ['round-ball', 'pointed-wad', 'flattened-star', 'loose-folded', 'elongated-twist'] },
  { category: 'used-tissue', label: '衛生紙', target: 'reject', cargoType: undefined, variants: ['soft-wad', 'folded-napkin', 'damp-flat', 'torn-strip', 'open-fan'] },
] as const;

export const SORTING_ITEMS: Readonly<Record<string, SortingItem>> = Object.fromEntries(groups.flatMap((group) => group.variants.map((variant, index) => {
  const id = `${group.category}-${variant}`;
  return [id, { id, label: group.label, target: group.target, cargoType: group.cargoType, volume: 3, weight: group.target === 'metal' ? 2 : 1,
    asset: `${group.category}/${String(index + 1).padStart(2, '0')}-${variant}.png` }];
})));

// Mix materials per resident; all 25 silhouettes appear across the three stops.
const ids = Object.keys(SORTING_ITEMS);
const batches = Array.from({ length: 10 }, (_, index) => Array.from({ length: 3 }, (_, offset) => ids[((index * 3 + offset) * 7) % ids.length]));
export const SORTING_BATCHES = [batches.slice(0, 4), batches.slice(4, 7), batches.slice(7, 10)] as const;
