import { describe, expect, it } from 'vitest';
import { CollisionWorld, intersectBodies, truckBody, type CollisionBody } from '../src/game/CollisionWorld';
import { Vehicle } from '../src/game/Vehicle';
import { STATIC_OBSTACLES } from '../src/config/street';
import { ROUTE_STATIONS } from '../src/config/stations';

const box: CollisionBody = { x: 0, y: 0, halfLength: 30, halfWidth: 10, rotation: 0 };

describe('oriented collisions', () => {
  it.each(['vehicle', 'building'] as const)('reports %s contact as fatal even when stationary or barely scraping', (kind) => {
    const vehicle = new Vehicle();
    const obstacle = { ...truckBody(vehicle), id: 'fatal', label: kind === 'vehicle' ? '機車' : '建築物', kind };
    const result = new CollisionWorld(kind === 'building' ? [obstacle] : []).resolve(vehicle, kind === 'vehicle' ? [obstacle] : []);
    expect(result.impactSpeed).toBe(0);
    expect(result.fatalContact).toEqual(obstacle);
  });
  it('does not classify trees or signal poles as vehicle/building failures', () => {
    const vehicle = new Vehicle();
    const result = new CollisionWorld([{ ...truckBody(vehicle), id: 'tree', label: '路樹' }]).resolve(vehicle, []);
    expect(result.contacts).toContain('tree');
    expect(result.fatalContact).toBeUndefined();
  });
  it('distinguishes separated, touching and rotated overlapping rectangles', () => {
    expect(intersectBodies(box, { ...box, x: 61 })).toBeUndefined();
    expect(intersectBodies(box, { ...box, x: 60 })).toBeUndefined();
    const contact = intersectBodies(box, { ...box, x: 25, rotation: Math.PI / 4 });
    expect(contact?.depth).toBeGreaterThan(0);
    expect(contact?.normalX).toBeLessThan(0);
  });

  it('uses the rear-offset truck body rather than only the cab position', () => {
    expect(truckBody({ x: 100, y: 100, rotation: 0 }).x).toBe(72);
    expect(truckBody({ x: 100, y: 100, rotation: Math.PI / 2 }).y).toBe(72);
  });

  it('prevents maximum-speed tunneling through a thin wall at fixed step', () => {
    const vehicle = new Vehicle();
    const wall = { id: 'wall', label: '建築物', x: 600, y: vehicle.y, halfLength: 5, halfWidth: 150, rotation: 0 };
    const world = new CollisionWorld([wall]);
    let largestImpact = 0;
    for (let i = 0; i < 300; i += 1) {
      vehicle.update({ throttle: 1, steering: 0, brake: false }, 1 / 60);
      largestImpact = Math.max(largestImpact, world.resolve(vehicle, []).impactSpeed);
      expect(intersectBodies(truckBody(vehicle), wall)).toBeUndefined();
    }
    expect(vehicle.x + 46).toBeLessThanOrEqual(wall.x - wall.halfLength);
    expect(largestImpact).toBeGreaterThan(100);
  });

  it('resolves a side impact without deleting tangential movement', () => {
    const vehicle = new Vehicle();
    vehicle.y = 610;
    vehicle.velocityX = 80;
    vehicle.velocityY = -50;
    const obstacle = { id: 'car', label: '汽車', x: vehicle.x - 28, y: 565, halfLength: 36, halfWidth: 17, rotation: 0 };
    const result = new CollisionWorld([]).resolve(vehicle, [obstacle]);
    expect(result.contacts).toContain('car');
    expect(result.impactSpeed).toBe(50);
    expect(vehicle.velocityX).toBe(80);
    expect(vehicle.velocityY).toBeGreaterThanOrEqual(0);
    expect(intersectBodies(truckBody(vehicle), obstacle)).toBeUndefined();
  });

  it('keeps all three collection bays clear of static obstacles', () => {
    for (const station of ROUTE_STATIONS) {
      const body = truckBody({ x: station.stop.x, y: station.stop.y, rotation: 0 });
      expect(STATIC_OBSTACLES.filter((obstacle) => intersectBodies(body, obstacle))).toEqual([]);
    }
  });
});
