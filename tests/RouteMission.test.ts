import { describe, expect, it } from 'vitest';
import { CargoHold } from '../src/game/CargoHold';
import { RoadGraph } from '../src/game/RoadGraph';
import { RouteMission, type RouteStation } from '../src/game/RouteMission';
import { ROAD_EDGES, ROAD_NODES } from '../src/config/roads';
import { ROUTE_STATIONS } from '../src/config/stations';

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
  it('reports route distance, ETA and schedule', () => {
    const roads = new RoadGraph([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }], [{ from: 'a', to: 'b' }]);
    const mission = new RouteMission([station], new CargoHold(), roads);
    const navigation = mission.getNavigation({ x: 0, y: 0 });
    expect(navigation.remainingMeters).toBe(250);
    expect(navigation.etaSeconds).toBeCloseTo(100 / 145);
    expect(navigation.scheduledTime).toBe('18:30:30');
    expect(navigation.delaySeconds).toBeLessThan(0);
  });

  it('produces a settlement after completing every station', () => {
    const roads = new RoadGraph([{ id: 'a', x: 100, y: 0 }], []);
    const mission = new RouteMission([station], new CargoHold(), roads);
    const stopped = { vehicleX: 100, vehicleY: 0, vehicleSpeed: 0, attemptingToDrive: false, crewEfficiency: 1 };
    for (let i = 0; i < 600; i += 1) mission.update(stopped, 20, 1 / 60);
    expect(mission.activeCycle?.phase).toBe('ready');
    mission.update({ ...stopped, vehicleX: 150, attemptingToDrive: true }, 20, 1 / 60);
    expect(mission.complete).toBe(true);
    expect(mission.getSettlement()?.stationCount).toBe(1);
    expect(mission.getSettlement()?.peakAnger).toBe(20);
    const result = mission.getSettlement();
    mission.update({ ...stopped, vehicleX: 150 }, 100, 60);
    expect(mission.getSettlement()).toEqual(result);
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
      for (let i = 0; i < 1800; i += 1) mission.update(stopped, 10, 1 / 60);
      expect(mission.activeCycle?.phase).toBe('ready');
      mission.update({ ...stopped, vehicleX: stationDefinition.stop.x + stationDefinition.stop.exitRadius + 10 }, 10, 1 / 60);
    }

    expect(mission.complete).toBe(true);
    expect(mission.results).toHaveLength(3);
    expect(mission.getSettlement()?.stationCount).toBe(3);
    expect(cargo.volume).toBe(113);
    expect(cargo.weight).toBe(52);
  });
});
