import { SORTING_ITEMS, type SortingItem, type SortingTarget } from '../config/sorting';
import { CargoHold } from './CargoHold';

export type PendingItem = Readonly<{ instanceId: number; item: SortingItem }>;
export type PlacementResult = 'accepted' | 'returned' | 'wrong' | 'full' | 'missing';

export class SortingQueue {
  private items: PendingItem[] = [];
  private nextId = 1;
  public accepted = 0;
  public returned = 0;
  public mistakes = 0;
  public constructor(private readonly cargo: CargoHold) {}
  public get pending(): readonly PendingItem[] { return this.items; }
  public deliver(ids: readonly string[]): void {
    const definitions = ids.map((id) => {
      const item = SORTING_ITEMS[id];
      if (!item) throw new Error(`Unknown sorting item: ${id}`);
      return item;
    });
    this.items.push(...definitions.map((item) => ({ instanceId: this.nextId++, item })));
  }
  public place(instanceId: number, target: SortingTarget): PlacementResult {
    const entry = this.items.find((item) => item.instanceId === instanceId);
    if (!entry) return 'missing';
    const item = entry.item;
    const cargoItem = item.cargoType ? { type: item.cargoType, volume: item.volume, weight: item.weight } : undefined;
    const full = cargoItem && !this.cargo.canAdd(cargoItem);
    if (target !== item.target && !(target === 'reject' && full)) { this.mistakes++; return 'wrong'; }
    if (target === 'reject') this.returned++;
    else {
      if (!cargoItem || !this.cargo.add(cargoItem)) return 'full';
      this.accepted++;
    }
    this.items = this.items.filter((item) => item.instanceId !== instanceId);
    return target === 'reject' ? 'returned' : 'accepted';
  }
}
