import type { RouteStation } from '../game/RouteMission';

export const ROUTE_STATIONS = [
  {
    id: 'heping-east-road',
    name: '和平東路收運站',
    residentDelays: [0, 1.4, 0, 0.6],
    scheduledOffsetSeconds: 35,
    stop: { x: 1120, y: 585, radius: 92, exitRadius: 145 },
    buildingExit: { x: 1200, y: 345 },
    queueStart: { x: 1200, y: 430 },
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
    scheduledOffsetSeconds: 82,
    stop: { x: 780, y: 170, radius: 88, exitRadius: 140 },
    buildingExit: { x: 1010, y: 170 },
    queueStart: { x: 895, y: 170 },
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
    scheduledOffsetSeconds: 132,
    stop: { x: 250, y: 585, radius: 88, exitRadius: 140 },
    buildingExit: { x: 250, y: 350 },
    queueStart: { x: 250, y: 430 },
    deliveries: [
      { type: 'glass', volume: 10, weight: 8 },
      { type: 'paper', volume: 13, weight: 5 },
      { type: 'plastic', volume: 12, weight: 2 },
    ],
  },
] satisfies readonly RouteStation[];

export const FIRST_STATION = ROUTE_STATIONS[0];
