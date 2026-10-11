import type { PotholeDefinition } from '../game/PotholeSystem';

export const POTHOLES = [
  { id: 'eastbound-1', x: 1000, y: 610, radius: 15, severity: 0.55 },
  { id: 'eastbound-2', x: 2900, y: 550, radius: 18, severity: 0.8 },
  { id: 'eastbound-3', x: 4700, y: 610, radius: 13, severity: 0.65 },
] satisfies readonly PotholeDefinition[];
