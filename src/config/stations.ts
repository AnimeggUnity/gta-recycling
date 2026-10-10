import type { CargoItem } from '../game/CargoHold';

export const FIRST_STATION = {
  id: 'heping-east-road',
  name: '和平東路收運站',
  stop: { x: 1120, y: 585, radius: 92, exitRadius: 145 },
  buildingExit: { x: 1200, y: 345 },
  queueStart: { x: 1200, y: 430 },
  deliveries: [
    { type: 'paper', volume: 12, weight: 5 },
    { type: 'plastic', volume: 15, weight: 2 },
    { type: 'metal', volume: 9, weight: 8 },
    { type: 'glass', volume: 11, weight: 10 },
  ] satisfies readonly CargoItem[],
} as const;
