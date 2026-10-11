import type { RoadEdge, RoadNode } from '../game/RoadGraph';
import { STREET, WORLD } from './balance';

export const ROAD_NODES = [
  { id: 'west-end', x: 120, y: STREET.startY },
  { id: 'first', x: 1500, y: STREET.startY },
  { id: 'second', x: 3200, y: STREET.startY },
  { id: 'third', x: 5100, y: STREET.startY },
  { id: 'east-end', x: WORLD.width - 120, y: STREET.startY },
] satisfies readonly RoadNode[];

export const ROAD_EDGES = [
  { from: 'west-end', to: 'first' },
  { from: 'first', to: 'second' },
  { from: 'second', to: 'third' },
  { from: 'third', to: 'east-end' },
] satisfies readonly RoadEdge[];
