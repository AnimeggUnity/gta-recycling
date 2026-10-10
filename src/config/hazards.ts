import type { PotholeDefinition } from '../game/PotholeSystem';

export const POTHOLES = [
  { id: 'eastbound-1', x: 760, y: 600, radius: 15, severity: 0.55 },
  { id: 'eastbound-2', x: 930, y: 575, radius: 18, severity: 0.8 },
  { id: 'intersection', x: 805, y: 455, radius: 13, severity: 0.65 },
] satisfies readonly PotholeDefinition[];
