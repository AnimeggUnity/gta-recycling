import { describe, expect, it } from 'vitest';
import { bayBounds, bayGuideY, bayOuterY, isBayPaved, isCurvedBay } from '../src/game/CollectionBay';
import { CURVED_BAY, STREET, TRAFFIC, VEHICLE } from '../src/config/balance';
import { ROUTE_STATIONS, GARBAGE_STATIONS } from '../src/config/stations';
import { RouteMission } from '../src/game/RouteMission';
import { RoadGraph } from '../src/game/RoadGraph';
import { CargoHold } from '../src/game/CargoHold';
import { ROAD_EDGES, ROAD_NODES } from '../src/config/roads';
import { SurfaceSystem } from '../src/game/SurfaceSystem';
import { STATIC_OBSTACLES } from '../src/config/street';
import { intersectBodies, truckBody } from '../src/game/CollisionWorld';

describe.each(ROUTE_STATIONS)('curved collection bay: $name', station => {
  const stop = station.stop;
  it('shares matching curved geometry between truck modes', () => {
    expect(bayBounds(stop)).toEqual({ left: stop.x - 350, right: stop.x + 350 });
    const garbage = GARBAGE_STATIONS.find(item => item.id === station.id)!;
    expect(isCurvedBay(garbage.stop)).toBe(true);
    expect(garbage.stop).toEqual(stop);
    expect(stop.y).toBe(CURVED_BAY.stopY);
  });
  it('keeps pavement inside its curved boundary and preserves the outer sidewalk', () => {
    expect(isBayPaved(stop, stop.x - 345, 700)).toBe(false);
    expect(isBayPaved(stop, stop.x, 735)).toBe(true);
    expect(isBayPaved(stop, stop.x, 755)).toBe(false);
    expect(bayOuterY(stop, stop.x - 350)).toBe(STREET.bottom);
    expect(bayOuterY(stop, stop.x + 350)).toBe(STREET.bottom);
  });
  it('fits the complete rotating truck and its wheels along both guide curves', () => {
    const surface = new SurfaceSystem(ROUTE_STATIONS);
    for (let x = stop.x - 400; x <= stop.x + 400; x += 2) {
      const y = bayGuideY(stop, x);
      const dy = (bayGuideY(stop, x + 0.1) - bayGuideY(stop, x - 0.1)) / 0.2;
      const rotation = Math.atan(dy);
      expect(surface.update({ x, y, rotation, speed: 20 }, 1 / 60).onSidewalk, `wheel at ${x}`).toBe(false);
      const body = truckBody({ x, y, rotation });
      for (const obstacle of STATIC_OBSTACLES) expect(intersectBodies(body, obstacle), `obstacle ${obstacle.id} at ${x}`).toBeUndefined();
      // Corners plus intermediate longitudinal samples check the entire body against the curved curb.
      for (let along = -TRAFFIC.truckHalfLength; along <= TRAFFIC.truckHalfLength; along += 2) for (const across of [-TRAFFIC.truckHalfWidth, TRAFFIC.truckHalfWidth]) {
        const px = body.x + along * Math.cos(rotation) - across * Math.sin(rotation);
        const py = body.y + along * Math.sin(rotation) + across * Math.cos(rotation);
        expect(py <= STREET.bottom || isBayPaved(stop, px, py), `body at ${x}, corner ${px},${py}`).toBe(true);
      }
      const second = (bayGuideY(stop, x + 0.1) - 2 * y + bayGuideY(stop, x - 0.1)) / 0.01;
      const curvature = Math.abs(second) / Math.pow(1 + dy * dy, 1.5);
      expect(curvature, `curvature at ${x}`).toBeLessThan(Math.tan(VEHICLE.lowSpeedSteeringAngle) / VEHICLE.wheelbase);
    }
  });
  it('guides navigation through the entrance curve instead of a perpendicular turn', () => {
    const mission = new RouteMission([station], new CargoHold(), new RoadGraph(ROAD_NODES, ROAD_EDGES));
    for (const position of [{ x: stop.x - 600, y: 610 }, { x: stop.x - 180, y: bayGuideY(stop, stop.x - 180) }]) {
      const path = mission.getNavigation(position).path;
      expect(path.at(-1)).toEqual(stop);
      expect(path.some(point => point.x > stop.x - 350 && point.x < stop.x - 100 && point.y > 610 && point.y < stop.y)).toBe(true);
      expect(path.every((point, index) => index === 0 || point.x >= path[index - 1].x)).toBe(true);
    }
  });
  it('keeps the expanded bay clear of signal crossings and retains resident coordinates', () => {
    const bounds = bayBounds(stop);
    for (const x of TRAFFIC.signalXs) expect(x < bounds.left || x > bounds.right + TRAFFIC.crossingWidth).toBe(true);
    expect(station.queueStart).toEqual({ x: stop.x, y: 745 });
    expect(station.buildingExit).toEqual({ x: stop.x, y: 803 });
  });
});
