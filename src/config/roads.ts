import type { RoadEdge, RoadNode } from '../game/RoadGraph';

export const ROAD_NODES = [
  { id: 'west-stop', x: 250, y: 585 },
  { id: 'start', x: 470, y: 585 },
  { id: 'intersection', x: 780, y: 585 },
  { id: 'east-stop', x: 1120, y: 585 },
  { id: 'east-end', x: 1420, y: 585 },
  { id: 'north-stop', x: 780, y: 170 },
  { id: 'north-mid', x: 780, y: 390 },
  { id: 'south-end', x: 780, y: 820 },
] satisfies readonly RoadNode[];

export const ROAD_EDGES = [
  { from: 'west-stop', to: 'start' },
  { from: 'start', to: 'intersection' },
  { from: 'intersection', to: 'east-stop' },
  { from: 'east-stop', to: 'east-end' },
  { from: 'north-stop', to: 'north-mid' },
  { from: 'north-mid', to: 'intersection' },
  { from: 'intersection', to: 'south-end' },
] satisfies readonly RoadEdge[];
