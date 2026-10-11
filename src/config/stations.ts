import type { RouteStation } from '../game/RouteMission';
import { STREET } from './balance';

const stop = (x: number) => ({
  x, y: STREET.bayY, radius: 85, exitRadius: 180,
  docking: { halfLength: STREET.dockingHalfLength, halfWidth: STREET.dockingHalfWidth, heading: 0, headingTolerance: STREET.dockingHeadingTolerance },
});

export const ROUTE_STATIONS = [
  {
    id: 'heping-east-road',
    name: '和平東路收運站',
    residentDelays: [0, 1.4, 0, 0.6],
    scheduledOffsetSeconds: 25,
    stop: stop(1500),
    buildingExit: { x: 1500, y: 803 },
    queueStart: { x: 1500, y: 745 },
    deliveries: [
      { type: 'paper', volume: 12, weight: 5 },
      { type: 'plastic', volume: 15, weight: 2 },
      { type: 'metal', volume: 9, weight: 8 },
      { type: 'glass', volume: 11, weight: 10 },
    ],
  },
  {
    id: 'xinsheng-south-road',
    name: '新生南路收運站',
    residentDelays: [0, 2, 0],
    scheduledOffsetSeconds: 72,
    stop: stop(3200),
    buildingExit: { x: 3200, y: 803 },
    queueStart: { x: 3200, y: 745 },
    deliveries: [
      { type: 'plastic', volume: 14, weight: 2 },
      { type: 'paper', volume: 10, weight: 4 },
      { type: 'metal', volume: 7, weight: 6 },
    ],
  },
  {
    id: 'roosevelt-road',
    name: '羅斯福路收運站',
    residentDelays: [1, 0, 1.8],
    scheduledOffsetSeconds: 118,
    stop: stop(5100),
    buildingExit: { x: 5100, y: 803 },
    queueStart: { x: 5100, y: 745 },
    deliveries: [
      { type: 'glass', volume: 10, weight: 8 },
      { type: 'paper', volume: 13, weight: 5 },
      { type: 'plastic', volume: 12, weight: 2 },
    ],
  },
] satisfies readonly RouteStation[];

export const FIRST_STATION = ROUTE_STATIONS[0];
