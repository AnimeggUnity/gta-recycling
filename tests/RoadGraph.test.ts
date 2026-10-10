import { describe, expect, it } from 'vitest';
import { RoadGraph } from '../src/game/RoadGraph';

describe('RoadGraph', () => {
  it('uses A* to choose the shorter connected route', () => {
    const graph = new RoadGraph([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 10, y: 0 },
      { id: 'c', x: 20, y: 0 },
      { id: 'd', x: 10, y: 20 },
    ], [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'a', to: 'd' },
      { from: 'd', to: 'c' },
    ]);
    const path = graph.findPath({ x: 0, y: 0 }, { x: 20, y: 0 });
    expect(path.some((point) => point.x === 10 && point.y === 0)).toBe(true);
    expect(path.some((point) => point.x === 10 && point.y === 20)).toBe(false);
  });
});
