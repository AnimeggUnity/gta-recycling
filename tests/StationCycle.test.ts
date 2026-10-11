import { describe, expect, it } from 'vitest';
import { CargoHold } from '../src/game/CargoHold';
import { StationCycle } from '../src/game/StationCycle';
import { ROUTE_STATIONS } from '../src/config/stations';
import { STREET } from '../src/config/balance';

const definition = {
  name: '測試站',
  stop: { x: 100, y: 100, radius: 20, exitRadius: 40 },
  deliveries: [
    { type: 'paper' as const, volume: 12, weight: 5 },
    { type: 'metal' as const, volume: 9, weight: 8 },
  ],
};

describe('StationCycle', () => {
  it('collects multiple resident batches but never leaves before player sorting and crew return', () => {
    const cargo = new CargoHold();
    const station = new StationCycle({ ...definition, sortingBatches: [['pet-bottle-tall-ribbed', 'used-tissue-soft-wad'], ['metal-can-standard-soda']] }, cargo);
    const stopped = { vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: true };
    for (let i = 0; i < 1800; i++) station.update(stopped, 1 / 60);
    expect(station.completedDeliveries).toBe(2);
    expect(station.sorting?.pending).toHaveLength(3);
    expect(station.phase).toBe('servicing');
    expect(station.departureLocked).toBe(true);
    expect(cargo.volume).toBe(0);
    for (const entry of [...station.sorting!.pending]) station.sorting!.place(entry.instanceId, entry.item.target);
    station.update({ ...stopped, attemptingToDrive: false }, 1 / 60);
    expect(station.phase).toBe('organizing');
    expect(station.departureLocked).toBe(true);
    for (let i = 0; i < 150; i++) station.update({ ...stopped, attemptingToDrive: false }, 1 / 60);
    expect(station.phase).toBe('ready');
    expect(cargo.volume).toBe(6);
    expect(station.sorting!.returned).toBe(1);
  });

  it('requires the right-side bay and east-facing heading for every configured stop', () => {
    for (const definition of ROUTE_STATIONS) {
      const station = new StationCycle(definition, new CargoHold());
      const stopped = { vehicleX: definition.stop.x, vehicleY: STREET.startY, vehicleRotation: 0, vehicleSpeed: 0, attemptingToDrive: false };
      station.update(stopped, 1);
      expect(station.phase).toBe('approaching');
      station.update({ ...stopped, vehicleY: definition.stop.y, vehicleRotation: Math.PI }, 1);
      expect(station.phase).toBe('approaching');
      station.update({ ...stopped, vehicleY: definition.stop.y }, 0.1);
      station.update({ ...stopped, vehicleY: definition.stop.y }, 0.8);
      expect(station.phase).toBe('servicing');
    }
    expect(ROUTE_STATIONS.every((s) => s.stop.y > STREET.bottom && s.buildingExit.y > s.stop.y)).toBe(true);
    expect(ROUTE_STATIONS.map((s) => s.stop.x)).toEqual([...ROUTE_STATIONS.map((s) => s.stop.x)].sort((a, b) => a - b));
  });
  it('does not blame resident walking time or worker anger for resident delays', () => {
    const station = new StationCycle({ ...definition, residentDelays: [2, 0] }, new CargoHold());
    const stopped = { vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false, crewEfficiency: 0.55 };
    station.update(stopped, 0.1);
    station.update(stopped, 0.8);
    station.update(stopped, 1.2);
    expect(station.residentDelaySeconds).toBe(0);
    station.update(stopped, 0.6);
    expect(station.residentDelaySeconds).toBeCloseTo(0.25);
    expect(station.getResidents()[0].handoffProgress).toBe(1);
  });
  it('requires a complete stop before starting service', () => {
    const station = new StationCycle(definition, new CargoHold());
    station.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 30, attemptingToDrive: false }, 1);
    expect(station.phase).toBe('stopping');
    station.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 30, attemptingToDrive: false }, 1);
    expect(station.phase).toBe('stopping');
    station.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false }, 0.8);
    expect(station.phase).toBe('servicing');
  });

  it('loads every delivery and unlocks departure only after the worker returns', () => {
    const cargo = new CargoHold();
    const station = new StationCycle(definition, cargo);
    station.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false }, 0.1);
    station.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false }, 0.8);
    expect(station.departureLocked).toBe(true);

    for (let i = 0; i < 900; i += 1) {
      station.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false }, 1 / 60);
    }

    expect(station.phase).toBe('ready');
    expect(station.workerState).toBe('riding');
    expect(station.departureLocked).toBe(false);
    expect(cargo.volume).toBe(21);
    expect(cargo.weight).toBe(13);

    station.update({ vehicleX: 150, vehicleY: 100, vehicleSpeed: 20, attemptingToDrive: true }, 1 / 60);
    expect(station.phase).toBe('departed');
  });

  it('slows collection work when the crew is angry', () => {
    const normal = new StationCycle(definition, new CargoHold());
    const angry = new StationCycle(definition, new CargoHold());
    for (const station of [normal, angry]) {
      station.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false }, 0.1);
      station.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false }, 0.8);
    }

    for (let i = 0; i < 600; i += 1) {
      normal.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false, crewEfficiency: 1 }, 1 / 60);
      angry.update({ vehicleX: 100, vehicleY: 100, vehicleSpeed: 0, attemptingToDrive: false, crewEfficiency: 0.55 }, 1 / 60);
    }

    expect(normal.completedDeliveries).toBeGreaterThan(angry.completedDeliveries);
  });
});
