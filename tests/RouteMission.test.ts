import { describe, expect, it } from 'vitest';
import { CargoHold } from '../src/game/CargoHold';
import { RoadGraph } from '../src/game/RoadGraph';
import { RouteMission, type RouteStation } from '../src/game/RouteMission';
import { ROAD_EDGES, ROAD_NODES } from '../src/config/roads';
import { ROUTE_STATIONS } from '../src/config/stations';
import { NAVIGATION, VEHICLE } from '../src/config/balance';
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
