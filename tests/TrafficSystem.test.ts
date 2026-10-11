import { describe, expect, it } from 'vitest';
import { TRAFFIC, WORLD } from '../src/config/balance';
import { intersectBodies, type CollisionBody } from '../src/game/CollisionWorld';
import { signalColor, trafficBody, TRAFFIC_SIGNALS, TrafficSystem, type TrafficVehicle } from '../src/game/TrafficSystem';

const away: CollisionBody = { x: -10000, y: -10000, halfLength: 74, halfWidth: 36, rotation: 0 };
function car(overrides: Partial<TrafficVehicle> = {}): TrafficVehicle {
  return { id: 'car', kind: 'car', x: 1000, previousX: 1000, y: 610, direction: 1, speed: 90, desiredSpeed: 90,
    halfLength: 36, halfWidth: 17, color: 0xffffff, yieldSeconds: 0, ...overrides };
}

describe('traffic and signals', () => {
  it('cycles green, yellow and red on fixed-step elapsed time', () => {
    const signal = TRAFFIC_SIGNALS[0];
    expect(signalColor(signal, 0)).toBe('green');
    expect(signalColor(signal, TRAFFIC.greenSeconds)).toBe('yellow');
    expect(signalColor(signal, TRAFFIC.greenSeconds + TRAFFIC.yellowSeconds)).toBe('red');
    expect(signalColor(signal, TRAFFIC.greenSeconds + TRAFFIC.yellowSeconds + TRAFFIC.redSeconds)).toBe('green');
  });

  it.each([1, -1] as const)('stops direction %s before the red stop line and restarts on green', (direction) => {
    const signal = TRAFFIC_SIGNALS[0];
    const line = signal.x - direction * TRAFFIC.stopLineOffset;
    const v = car({ direction, y: direction > 0 ? 610 : 430, x: line - direction * (36 + 100) });
    const traffic = new TrafficSystem([v]);
    traffic.elapsedSeconds = TRAFFIC.greenSeconds + TRAFFIC.yellowSeconds;
    for (let i = 0; i < 300; i += 1) traffic.update(1 / 60, away);
    expect((line - (v.x + direction * v.halfLength)) * direction).toBeGreaterThanOrEqual(-0.001);
    expect(v.speed).toBeLessThan(0.2);
    const stoppedX = v.x;
    traffic.elapsedSeconds = TRAFFIC.greenSeconds + TRAFFIC.yellowSeconds + TRAFFIC.redSeconds;
    for (let i = 0; i < 120; i += 1) traffic.update(1 / 60, away);
    expect((v.x - stoppedX) * direction).toBeGreaterThan(20);
  });

  it('keeps a safe following gap behind a stopped vehicle', () => {
    const leader = car({ id: 'leader', x: 1300, speed: 0, desiredSpeed: 0 });
    const follower = car({ id: 'follower', x: 1000 });
    const traffic = new TrafficSystem([leader, follower]);
    for (let i = 0; i < 600; i += 1) {
      traffic.update(1 / 60, away);
      expect(intersectBodies(trafficBody(leader), trafficBody(follower))).toBeUndefined();
    }
    expect(leader.x - follower.x).toBeGreaterThanOrEqual(72 + TRAFFIC.followingGap - 0.001);
  });

  it('waits behind the player but passes a collection truck in a right-side bay', () => {
    const v = car();
    const traffic = new TrafficSystem([v]);
    const player = { ...away, x: 1300, y: 610 };
    for (let i = 0; i < 240; i += 1) traffic.update(1 / 60, player);
    expect(v.x + v.halfLength).toBeLessThan(player.x - player.halfLength);
    expect(intersectBodies(trafficBody(v), player)).toBeUndefined();
    for (let i = 0; i < 300; i += 1) traffic.update(1 / 60, { ...player, y: 695 });
    expect(v.x).toBeGreaterThan(player.x + player.halfLength);
  });

  it('does not respawn inside a player blocking the entry', () => {
    const v = car({ x: WORLD.width + 160, speed: 0, desiredSpeed: 0 });
    const traffic = new TrafficSystem([v]);
    traffic.update(1 / 60, { ...away, x: -100, y: 610 });
    expect(v.x).toBeGreaterThan(WORLD.width);
    traffic.update(1 / 60, away);
    expect(v.x).toBe(-100);
  });

  it('produces the same queue movement independent of iteration order', () => {
    const first = new TrafficSystem([car({ id: 'a' }), car({ id: 'b', x: 1190 })]);
    const second = new TrafficSystem(first.vehicles.map((v) => ({ ...v })).reverse());
    for (let i = 0; i < 120; i += 1) { first.update(1 / 60, away); second.update(1 / 60, away); }
    expect(first.vehicles.map((v) => [v.id, v.x, v.speed]).sort()).toEqual(second.vehicles.map((v) => [v.id, v.x, v.speed]).sort());
  });

  it('keeps the full car and scooter fleet separated across red-light cycles and respawns', () => {
    const traffic = new TrafficSystem();
    for (let tick = 0; tick < 9000; tick += 1) {
      traffic.update(1 / 60, away);
      if (tick % 60 !== 0) continue;
      for (let i = 0; i < traffic.vehicles.length; i += 1) {
        const a = traffic.vehicles[i];
        for (const b of traffic.vehicles.slice(i + 1)) {
          if (a.y === b.y) expect(intersectBodies(trafficBody(a), trafficBody(b))).toBeUndefined();
        }
      }
    }
    expect(traffic.vehicles.some((v) => v.kind === 'scooter')).toBe(true);
    expect(traffic.vehicles.some((v) => v.kind === 'car')).toBe(true);
  });
});
