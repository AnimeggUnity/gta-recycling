import { describe, expect, it } from 'vitest';
import { CargoHold } from '../src/game/CargoHold';
import { RoadGraph } from '../src/game/RoadGraph';
import { RouteMission, type RouteStation } from '../src/game/RouteMission';
import { ROAD_EDGES, ROAD_NODES } from '../src/config/roads';
import { ROUTE_STATIONS } from '../src/config/stations';
import { MISSION, NAVIGATION, VEHICLE } from '../src/config/balance';
import { SORTING_ITEMS } from '../src/config/sorting';

const station: RouteStation = {
  id: 'one',
  name: '第一站',
  scheduledOffsetSeconds: 30,
  stop: { x: 100, y: 0, radius: 20, exitRadius: 40 },
  buildingExit: { x: 100, y: -30 },
  queueStart: { x: 100, y: -10 },
  deliveries: [{ type: 'paper', volume: 5, weight: 2 }],
};

describe('RouteMission', () => {
  it.each([false, true])('warns at 15m, permits recovery, and fails after 35m in garbage=%s', garbage => {
    const mission = new RouteMission([{ ...station, garbage }], new CargoHold(), new RoadGraph([], []));
    const atMeters = (meters: number) => ({ vehicleX: station.stop.x + meters / NAVIGATION.metersPerPixel, vehicleY: 0, vehicleSpeed: 0, attemptingToDrive: false });
    mission.update(atMeters(14.99), 0, 1 / 60); expect(mission.missedStopWarning).toBeUndefined();
    mission.update(atMeters(15.01), 0, 1 / 60); expect(mission.missedStopWarning).toContain('第一站');
    for (let i = 0; i < 180; i++) mission.update(atMeters(20), 0, 1 / 60);
    expect(mission.failed).toBe(false); // Stopping in the recovery corridor is allowed.
    mission.update(atMeters(14), 0, 1 / 60); expect(mission.missedStopWarning).toBeUndefined();
    mission.update(atMeters(36), 0, 1 / 60); expect(mission.failed).toBe(false);
    mission.update(atMeters(36), 0, MISSION.missedStopWarningSeconds - 0.1); expect(mission.failed).toBe(false);
    mission.update(atMeters(36), 0, 0.2); expect(mission.failed).toBe(true);
    expect(mission.getFailure()).toMatchObject({ reason: 'missed-stop', missedStationName: '第一站', stationCount: 0 });
    expect(mission.missedStopWarning).toBeUndefined(); expect(mission.getSettlement()).toBeUndefined();
    const elapsed = mission.elapsedSeconds;
    mission.update(atMeters(0), 100, 30); mission.fail('collision', '汽車');
    expect(mission.elapsedSeconds).toBe(elapsed); expect(mission.getFailure()?.reason).toBe('missed-stop');
    expect(mission.results).toHaveLength(0);
  });
  it('does not confuse lateral distance, a stopped bay queue or backward travel with a missed stop', () => {
    const mission = new RouteMission([station], new CargoHold(), new RoadGraph([], []));
    for (const vehicleX of [station.stop.x - 1000, station.stop.x]) {
      for (let i = 0; i < 180; i++) mission.update({ vehicleX, vehicleY: 1000, vehicleSpeed: 0, attemptingToDrive: false, dockingBlocked: true }, 0, 1 / 60);
    }
    expect(mission.failed).toBe(false); expect(mission.missedStopWarning).toBeUndefined();
  });
  it('clears the warning on successful service and permits normal departure', () => {
    const mission = new RouteMission([station], new CargoHold(), new RoadGraph([], []));
    const observation = { vehicleX: station.stop.x, vehicleY: 0, vehicleSpeed: 0, attemptingToDrive: false };
    mission.update({ ...observation, vehicleX: station.stop.x + 20 / NAVIGATION.metersPerPixel }, 0, 1 / 60);
    expect(mission.missedStopWarning).toBeDefined();
    mission.update(observation, 0, 0.1); mission.update(observation, 0, 0.8);
    expect(mission.activeCycle?.phase).toBe('servicing'); expect(mission.missedStopWarning).toBeUndefined();
    for (const phase of ['organizing', 'ready'] as const) {
      mission.activeCycle!.phase = phase;
      mission.update({ ...observation, vehicleX: station.stop.x + 100 / NAVIGATION.metersPerPixel }, 0, 1 / 60);
      expect(mission.failed).toBe(false);
    }
    expect(mission.complete).toBe(true);
  });
  it.each([1 / 30, 1 / 60, 1 / 120])('keeps at least two seconds of warning with step %s', dt => {
    const mission = new RouteMission([station], new CargoHold(), new RoadGraph([], []));
    const observation = { vehicleX: station.stop.x + 50 / NAVIGATION.metersPerPixel, vehicleY: 0, vehicleSpeed: 0, attemptingToDrive: false };
    mission.update(observation, 0, dt);
    expect(mission.missedStopWarning).toBeDefined();
    for (let i = 0; i < Math.floor(MISSION.missedStopWarningSeconds / dt) - 1; i++) mission.update(observation, 0, dt);
    expect(mission.failed).toBe(false);
    for (let i = 0; i < 3; i++) mission.update(observation, 0, dt);
    expect(mission.failed).toBe(true);
  });
  it('preserves a collision failure and its cause even if anger later reaches 100', () => {
    const mission = new RouteMission([station], new CargoHold(), new RoadGraph([], []));
    mission.fail('collision', '汽車');
    mission.checkCrewAnger(100);
    mission.fail('crew-anger');
    expect(mission.getFailure()).toEqual({ reason: 'collision', collisionLabel: '汽車', totalSeconds: 0, stationCount: 0 });
    expect(mission.getSettlement()).toBeUndefined();
  });
  it('fails at exactly 100 anger, not below, and permanently freezes progress', () => {
    const mission = new RouteMission([station], new CargoHold(), new RoadGraph([{ id: 'a', x: 100, y: 0 }], []));
    const observation = { vehicleX: 100, vehicleY: 0, vehicleSpeed: 0, attemptingToDrive: false };
    mission.update(observation, 99.99, 1 / 60);
    expect(mission.ended).toBe(false);
    const elapsed = mission.elapsedSeconds;
    mission.checkCrewAnger(100);
    expect(mission.failed).toBe(true);
    expect(mission.complete).toBe(false);
    expect(mission.ended).toBe(true);
    expect(mission.getSettlement()).toBeUndefined();
    expect(mission.getFailure()).toEqual({ reason: 'crew-anger', totalSeconds: elapsed, stationCount: 0 });
    const phase = mission.activeCycle?.phase;
    mission.update(observation, 0, 60);
    expect(mission.elapsedSeconds).toBe(elapsed);
    expect(mission.activeCycle?.phase).toBe(phase);
    expect(mission.failed).toBe(true);
    expect(mission.getNavigation({ x: 0, y: 0 }).path).toEqual([]);
  });

  it('checks anger before processing station departures', () => {
    const mission = new RouteMission([station], new CargoHold(), new RoadGraph([], []));
    mission.activeCycle!.phase = 'departed';
    mission.update({ vehicleX: 150, vehicleY: 0, vehicleSpeed: 0, attemptingToDrive: true }, 101, 1 / 60);
    expect(mission.failed).toBe(true);
    expect(mission.results).toHaveLength(0);
    expect(mission.complete).toBe(false);
  });
  it('reports route distance, ETA and schedule', () => {
    const roads = new RoadGraph([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }], [{ from: 'a', to: 'b' }]);
    const mission = new RouteMission([station], new CargoHold(), roads);
    const navigation = mission.getNavigation({ x: 0, y: 0 });
    expect(navigation.remainingMeters).toBe(Math.round(100 * NAVIGATION.metersPerPixel));
    expect(navigation.etaSeconds).toBeCloseTo(100 / (NAVIGATION.cruiseSpeedKmh / VEHICLE.kmhPerSpeedUnit));
    expect(navigation.scheduledTime).toBe('18:30:30');
    expect(navigation.delaySeconds).toBeLessThan(0);
  });

  it('produces a settlement after completing every station', () => {
    const roads = new RoadGraph([{ id: 'a', x: 100, y: 0 }], []);
    const mission = new RouteMission([station], new CargoHold(), roads);
    const stopped = { vehicleX: 100, vehicleY: 0, vehicleSpeed: 0, attemptingToDrive: false, crewEfficiency: 1 };
    for (let i = 0; i < 600; i += 1) mission.update(stopped, 20, 1 / 60);
    expect(mission.activeCycle?.phase).toBe('ready');
    expect(mission.getNavigation({ x: 100, y: 0 }).path).toEqual([]);
    mission.update({ ...stopped, vehicleX: 150, attemptingToDrive: true }, 20, 1 / 60);
    expect(mission.complete).toBe(true);
    expect(mission.getSettlement()?.stationCount).toBe(1);
    expect(mission.getSettlement()?.peakAnger).toBe(20);
    const result = mission.getSettlement();
    mission.update({ ...stopped, vehicleX: 150 }, 100, 60);
    expect(mission.getSettlement()).toEqual(result);
    expect(mission.failed).toBe(false);
  });

  it('completes the configured three-stop route with shared cargo', () => {
    const cargo = new CargoHold(180, 140);
    const mission = new RouteMission(ROUTE_STATIONS, cargo, new RoadGraph(ROAD_NODES, ROAD_EDGES));

    for (const stationDefinition of ROUTE_STATIONS) {
      const stopped = {
        vehicleX: stationDefinition.stop.x,
        vehicleY: stationDefinition.stop.y,
        vehicleSpeed: 0,
        attemptingToDrive: false,
        crewEfficiency: 1,
      };
      for (let i = 0; i < 1800; i += 1) {
        mission.update(stopped, 10, 1 / 60);
        const queue = mission.activeCycle?.sorting;
        for (const entry of [...queue?.pending ?? []]) queue!.place(entry.instanceId, entry.item.target);
      }
      expect(mission.activeCycle?.phase).toBe('ready');
      mission.update({ ...stopped, vehicleX: stationDefinition.stop.x + stationDefinition.stop.exitRadius + 10 }, 10, 1 / 60);
    }

    expect(mission.complete).toBe(true);
    expect(mission.results).toHaveLength(3);
    expect(mission.getSettlement()?.stationCount).toBe(3);
    const accepted = ROUTE_STATIONS.flatMap((station) => station.sortingBatches.flat()).map((id) => SORTING_ITEMS[id]).filter((item) => item.target !== 'reject');
    expect(cargo.volume).toBe(accepted.reduce((sum, item) => sum + item.volume, 0));
    expect(cargo.weight).toBe(accepted.reduce((sum, item) => sum + item.weight, 0));
  });
});
