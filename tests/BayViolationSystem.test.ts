import { describe, expect, it } from 'vitest';
import { BAY_VIOLATION } from '../src/config/balance';
import { ROUTE_STATIONS } from '../src/config/stations';
import { BayViolationSystem } from '../src/game/BayViolationSystem';
import { CargoHold } from '../src/game/CargoHold';
import { CollisionWorld } from '../src/game/CollisionWorld';
import { StationCycle } from '../src/game/StationCycle';
import { Vehicle } from '../src/game/Vehicle';

describe('one random bay obstruction per run', () => {
  it.each([0, 0.5, 0.999])('selects one bay once with draw %s', draw => {
    let calls = 0;
    const bays = new BayViolationSystem(ROUTE_STATIONS, () => { calls++; return draw; });
    expect(calls).toBe(1); expect(bays.violators).toHaveLength(1);
    expect(bays.violators[0].stationId).toBe(ROUTE_STATIONS[Math.floor(draw * 3)].id);
    for (let i = 0; i < 600; i++) bays.update(1 / 60);
    expect(calls).toBe(1); expect(bays.violators[0].phase).toBe('parked');
    expect(ROUTE_STATIONS.filter(s => bays.blocksStation(s.id))).toHaveLength(1);
  });
  it('rejects distant horns and repeat horns, then clears the bay without respawning', () => {
    const bays = new BayViolationSystem(ROUTE_STATIONS, () => 0);
    const v = bays.violators[0];
    expect(bays.triggerHorn(v.x - BAY_VIOLATION.hornRange - 1, v.y)).toBe(false);
    bays.update(BAY_VIOLATION.hornCooldownSeconds);
    expect(bays.triggerHorn(v.x - BAY_VIOLATION.hornRange, v.y)).toBe(true);
    expect(bays.triggerHorn(v.x, v.y)).toBe(false);
    bays.update(BAY_VIOLATION.reactionSeconds / 2);
    expect(v.phase).toBe('reacting'); expect(v.speed).toBe(0);
    for (let i = 0; i < 900; i++) bays.update(1 / 60);
    expect(v.phase).toBe('cleared'); expect(bays.blocksStation(v.stationId)).toBe(false);
    expect(bays.getObstacles()).toHaveLength(0);
    expect(bays.triggerHorn(v.x, v.y)).toBe(false);
    expect(bays.violators).toHaveLength(1);
  });
  it.each([1 / 30, 1 / 60, 1 / 120])('drives away on the paved bay with fixed step %s', dt => {
    const bays = new BayViolationSystem(ROUTE_STATIONS, () => 0);
    const v = bays.violators[0]; bays.triggerHorn(v.x, v.y);
    for (let elapsed = 0; elapsed < 10; elapsed += dt) bays.update(dt);
    expect(v.phase).toBe('cleared'); expect(v.y).toBeCloseTo(610);
  });
  it('waits for an obstacle in its departure path, then resumes', () => {
    const bays = new BayViolationSystem(ROUTE_STATIONS, () => 0);
    const v = bays.violators[0]; bays.triggerHorn(v.x, v.y);
    const obstacle = { ...bays.getObstacles()[0], id: 'blocked', x: v.x + 80 };
    for (let i = 0; i < 120; i++) bays.update(1 / 60, [obstacle]);
    expect(v.speed).toBe(0); expect(v.x).toBe(v.stop.x + BAY_VIOLATION.parkedOffsetX);
    for (let i = 0; i < 600; i++) bays.update(1 / 60);
    expect(v.phase).toBe('cleared');
  });
  it('blocks service until the stop clears and remains a fatal collision obstacle', () => {
    const bays = new BayViolationSystem(ROUTE_STATIONS, () => 0);
    const v = bays.violators[0];
    const cycle = new StationCycle(ROUTE_STATIONS[0], new CargoHold());
    const observation = { vehicleX: v.stop.x, vehicleY: v.stop.y, vehicleRotation: 0, vehicleSpeed: 0, attemptingToDrive: false };
    for (let i = 0; i < 120; i++) cycle.update({ ...observation, dockingBlocked: bays.blocksStation(v.stationId) }, 1 / 60);
    expect(cycle.phase).toBe('approaching');
    const truck = new Vehicle(); truck.x = v.x; truck.y = v.y; truck.rotation = 0;
    expect(new CollisionWorld([]).resolve(truck, bays.getObstacles()).fatalContact?.label).toBe('收運灣違停車輛');
    bays.triggerHorn(v.x, v.y);
    for (let i = 0; i < 900; i++) bays.update(1 / 60);
    for (let i = 0; i < 120; i++) cycle.update({ ...observation, dockingBlocked: bays.blocksStation(v.stationId) }, 1 / 60);
    expect(cycle.phase).toBe('servicing');
  });
  it('supports an empty route without drawing random numbers', () => {
    const bays = new BayViolationSystem([], () => { throw new Error('unexpected draw'); });
    expect(bays.violators).toHaveLength(0); expect(bays.triggerHorn(0, 0)).toBe(false);
  });
});
