import { afterEach, describe, expect, it, vi } from 'vitest';
import { TOSS } from '../src/config/balance';
import { GARBAGE_STATIONS } from '../src/config/stations';
import { CargoHold } from '../src/game/CargoHold';
import { RoadGraph } from '../src/game/RoadGraph';
import { RouteMission } from '../src/game/RouteMission';
import { StationCycle } from '../src/game/StationCycle';
import { TossQueue } from '../src/game/TossQueue';

afterEach(() => vi.restoreAllMocks());

const observation = { vehicleX: GARBAGE_STATIONS[0].stop.x, vehicleY: GARBAGE_STATIONS[0].stop.y, vehicleRotation: 0, vehicleSpeed: 0, attemptingToDrive: false };
function hitVelocity(size: keyof typeof TOSS.bagSizes) { return -1.8 * Math.sqrt(TOSS.bagSizes[size].mass) / TOSS.speedGain; }

describe('garbage station lifecycle', () => {
  it('draws bags on arrival, locks departure through all throws, compression and safe boarding', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Ordinary-bag cargo lifecycle is deterministic.
    const cargo = new CargoHold(180, 140);
    const cycle = new StationCycle(GARBAGE_STATIONS[0], cargo);
    expect(cycle.sorting).toBeUndefined(); expect(cycle.tossing).toBeUndefined();
    for (let i = 0; i < 60; i++) cycle.update(observation, 1 / 60);
    const queue = cycle.tossing!;
    expect(queue.bags.length).toBeGreaterThanOrEqual(3); expect(queue.bags.length).toBeLessThanOrEqual(5);
    for (let i = 0; i < 60; i++) cycle.update(observation, 1 / 60);
    expect(cycle.phase).toBe('servicing'); expect(cycle.departureLocked).toBe(true);
    let expectedVolume = 0, expectedWeight = 0;
    while (!queue.complete) {
      const bag = queue.current!; const size = TOSS.bagSizes[bag.size];
      expectedVolume += size.volume; expectedWeight += size.weight;
      queue.launch(bag.id, { vx: 0, vy: hitVelocity(bag.size) });
      while (queue.flight) cycle.update(observation, 1 / 60);
    }
    expect(cycle.phase).toBe('organizing'); expect(cycle.departureLocked).toBe(true);
    expect(cargo.volume).toBe(expectedVolume); expect(cargo.weight).toBe(expectedWeight);
    expect(Object.values(cargo.counts)).toEqual([0, 0, 0, 0]);
    for (let i = 0; i < 105; i++) cycle.update(observation, 1 / 60);
    expect(cycle.workerState).toBe('returning'); expect(cycle.departureLocked).toBe(true);
    for (let i = 0; i < 60; i++) cycle.update(observation, 1 / 60);
    expect(cycle.phase).toBe('ready'); expect(cycle.workerState).toBe('riding');
  });
  it('does not load returned or exploded hazards and consumes anger only once', () => {
    const cargo = new CargoHold(180, 140);
    const cycle = new StationCycle(GARBAGE_STATIONS[0], cargo);
    for (let i = 0; i < 60; i++) cycle.update(observation, 1 / 60);
    const q = cycle.tossing = new TossQueue(() => 0, true);
    q.launch(1, { vx: 0, vy: hitVelocity('small') });
    while (q.flight) cycle.update(observation, 1 / 60);
    const volume = cargo.volume;
    q.rejectCurrent(2); cycle.update(observation, 1 / 60);
    expect(cargo.volume).toBe(volume); expect(cycle.consumeHazardAnger()).toBe(0);
    q.launch(3, { vx: 0, vy: hitVelocity('small') });
    while (q.flight) cycle.update(observation, 1 / 60);
    expect(cargo.volume).toBe(volume); expect(cycle.consumeHazardAnger()).toBe(35);
    expect(cycle.consumeHazardAnger()).toBe(0); expect(cycle.phase).toBe('organizing');
    for (let i = 0; i < 160; i++) cycle.update(observation, 1 / 60);
    expect(cycle.phase).toBe('ready');
  });
  it('completes all three stations with zero points when every bag misses', () => {
    const cargo = new CargoHold(180, 140);
    const mission = new RouteMission(GARBAGE_STATIONS, cargo, new RoadGraph([], []));
    let count = 0;
    for (const station of GARBAGE_STATIONS) {
      const stopped = { ...observation, vehicleX: station.stop.x, vehicleY: station.stop.y };
      for (let i = 0; i < 1500 && mission.activeCycle?.phase !== 'ready'; i++) {
        const queue = mission.activeCycle?.tossing;
        if (queue?.current && !queue.flight) queue.launch(queue.current.id, { vx: 0, vy: 0 });
        mission.update(stopped, 0, 1 / 60);
      }
      expect(mission.activeCycle?.phase).toBe('ready');
      count += mission.activeCycle!.tossing!.bags.length;
      mission.update({ ...stopped, vehicleX: station.stop.x + station.stop.exitRadius + 20 }, 0, 1 / 60);
    }
    expect(mission.complete).toBe(true);
    expect(mission.getSettlement()?.tossing).toEqual({ hits: 0, misses: count, score: 0 });
    expect(cargo.volume).toBe(0);
  });
  it('freezes in-flight throws on mission failure', () => {
    const mission = new RouteMission(GARBAGE_STATIONS, new CargoHold(180, 140), new RoadGraph([], []));
    for (let i = 0; i < 60; i++) mission.update(observation, 0, 1 / 60);
    const queue = mission.activeCycle!.tossing!;
    queue.launch(1, { vx: 0, vy: hitVelocity(queue.current!.size) });
    mission.fail('collision', '汽車');
    mission.update(observation, 0, 20);
    expect(queue.flight!.elapsed).toBe(0); expect(queue.hits).toBe(0);
  });
});
