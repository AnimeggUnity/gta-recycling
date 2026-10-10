export type RecyclingType = 'paper' | 'plastic' | 'metal' | 'glass';

export type CargoItem = Readonly<{
  type: RecyclingType;
  volume: number;
  weight: number;
}>;

export const RECYCLING_LABELS: Record<RecyclingType, string> = {
  paper: '紙類',
  plastic: '塑膠',
  metal: '金屬',
  glass: '玻璃',
};

export class CargoHold {
  public readonly maxVolume: number;
  public readonly maxWeight: number;
  public readonly counts: Record<RecyclingType, number> = {
    paper: 0,
    plastic: 0,
    metal: 0,
    glass: 0,
  };
  public volume = 0;
  public weight = 0;

  public constructor(maxVolume = 100, maxWeight = 80) {
    this.maxVolume = maxVolume;
    this.maxWeight = maxWeight;
  }

  public canAdd(item: CargoItem): boolean {
    return this.volume + item.volume <= this.maxVolume && this.weight + item.weight <= this.maxWeight;
  }

  public add(item: CargoItem): boolean {
    if (!this.canAdd(item)) return false;
    this.volume += item.volume;
    this.weight += item.weight;
    this.counts[item.type] += 1;
    return true;
  }
}
