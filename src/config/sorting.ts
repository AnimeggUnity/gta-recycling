import type { RecyclingType } from '../game/CargoHold';

export type SortingTarget = 'plastic' | 'paper-container' | 'metal' | 'paper' | 'reject';
export type SortingItem = Readonly<{ id: string; label: string; target: SortingTarget; cargoType?: RecyclingType; volume: number; weight: number; asset: string }>;
export const SORTING_TARGETS: Readonly<Record<SortingTarget, string>> = {
  plastic: '塑膠瓶', 'paper-container': '紙容器', metal: '金屬罐', paper: '紙類', reject: '退回民眾',
};

const groups = [
  { category: 'pet-bottle', label: '寶特瓶', target: 'plastic', cargoType: 'plastic', variants: ['tall-ribbed', 'short-wide', 'square-body', 'waisted-sport', 'crushed-bent'] },
  { category: 'paper-meal-box', label: '紙餐盒', target: 'paper-container', cargoType: 'paper', variants: ['rectangular-clamshell', 'square-folded', 'round-bowl', 'oval-tray', 'trapezoid-box'] },
  { category: 'metal-can', label: '金屬罐', target: 'metal', cargoType: 'metal', variants: ['standard-soda', 'tall-slim', 'short-wide', 'ribbed-food', 'crushed-flat'] },
  { category: 'crumpled-paper', label: '揉紙', target: 'paper', cargoType: 'paper', variants: ['round-ball', 'pointed-wad', 'flattened-star', 'loose-folded', 'elongated-twist'] },
] as const;

const rejectItems = [
  { id: 'non-recyclable-toilet-seat', label: '馬桶蓋', asset: 'non-recyclable/01-toilet-seat.png' },
  { id: 'non-recyclable-wood', label: '木頭', asset: 'non-recyclable/03-wood.png' },
  { id: 'non-recyclable-shoe', label: '鞋子', asset: 'non-recyclable/04-shoe.png' },
  { id: 'non-recyclable-backpack', label: '後背包', asset: 'non-recyclable/05-backpack.png' },
  { id: 'non-recyclable-shoe-red-high-top', label: '鞋子', asset: 'non-recyclable/06-shoe-red-high-top.png' },
  { id: 'non-recyclable-shoe-green-slip-on', label: '鞋子', asset: 'non-recyclable/07-shoe-green-slip-on.png' },
  { id: 'non-recyclable-wood-short-log', label: '木頭', asset: 'non-recyclable/08-wood-short-log.png' },
  { id: 'non-recyclable-wood-flat-plank', label: '木頭', asset: 'non-recyclable/09-wood-flat-plank.png' },
  { id: 'non-recyclable-backpack-clay-flap', label: '後背包', asset: 'non-recyclable/10-backpack-clay-flap.png' },
  { id: 'non-recyclable-backpack-olive-hiking', label: '後背包', asset: 'non-recyclable/11-backpack-olive-hiking.png' },
  { id: 'non-recyclable-eva-mat-blue', label: '藍色巧拼墊', asset: 'eva-mat/01-blue.png' },
  { id: 'non-recyclable-eva-mat-green', label: '綠色巧拼墊', asset: 'eva-mat/02-green.png' },
  { id: 'non-recyclable-eva-mat-yellow', label: '黃色巧拼墊', asset: 'eva-mat/03-yellow.png' },
  { id: 'non-recyclable-eva-mat-pink', label: '粉紅色巧拼墊', asset: 'eva-mat/04-pink.png' },
  { id: 'non-recyclable-eva-mat-purple', label: '紫色巧拼墊', asset: 'eva-mat/05-purple.png' },
] as const;

export const SORTING_ITEMS: Readonly<Record<string, SortingItem>> = Object.fromEntries([...groups.flatMap((group) => group.variants.map((variant, index) => {
  const id = `${group.category}-${variant}`;
  return [id, { id, label: group.label, target: group.target, cargoType: group.cargoType, volume: 3, weight: group.target === 'metal' ? 2 : 1,
    asset: `${group.category}/${String(index + 1).padStart(2, '0')}-${variant}.png` }];
})), ...rejectItems.map(item => [item.id, { ...item, target: 'reject' as const, volume: 3, weight: 1 }])]);

// Interleave the catalog without modular strides that can skip items when counts change.
// Keep the existing 4/3/3 residents, now delivering 3–4 items each.
const ids = Object.keys(SORTING_ITEMS);
const mixedIds = Array.from({ length: 5 }, (_, lane) => ids.filter((_, index) => index % 5 === lane)).flat();
const batches = Array.from({ length: 10 }, (_, index) => mixedIds.slice(
  Math.floor(index * mixedIds.length / 10), Math.floor((index + 1) * mixedIds.length / 10),
));
export const SORTING_BATCHES = [batches.slice(0, 4), batches.slice(4, 7), batches.slice(7, 10)] as const;
