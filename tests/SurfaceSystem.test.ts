import { describe, expect, it } from 'vitest';
import { SurfaceSystem } from '../src/game/SurfaceSystem';
import { ROUTE_STATIONS } from '../src/config/stations';
import { STREET } from '../src/config/balance';
import { CrewDynamics } from '../src/game/CrewDynamics';

const road = { x: 2000, y: STREET.startY, rotation: 0, speed: 60 };
const sidewalk = { ...road, y: 700 };
const telemetry = { speed: 60, longitudinalSpeed: 60, lateralSpeed: 0, acceleration: 0, lateralAcceleration: 0, jerk: 0 };

describe('sidewalk roughness', () => {
  it('keeps both carriageways smooth', () => {
    const surface = new SurfaceSystem(ROUTE_STATIONS);
    for (const y of [...STREET.eastboundLanes, ...STREET.westboundLanes]) {
      expect(surface.update({ ...road, y }, 1 / 60)).toEqual({ onSidewalk: false, moving: false, curbImpact: 0, bumpImpact: 0, angerRate: 0 });
    }
  });
  it.each([380, 700])('detects wheel contact on either sidewalk at y=%i', y => {
    const surface = new SurfaceSystem(ROUTE_STATIONS);
    expect(surface.update({ ...road, y }, 1 / 60)).toMatchObject({ onSidewalk: true, moving: true });
  });
  it('detects a wheel crossing before the truck center leaves the road', () => {
    const surface = new SurfaceSystem(ROUTE_STATIONS);
    expect(surface.update({ ...road, y: 630 }, 1 / 60).onSidewalk).toBe(true);
    expect(surface.update({ ...road, y: 600, rotation: Math.PI / 2 }, 1 / 60).onSidewalk).toBe(false);
  });
  it('exempts each paved collection bay and its entrance in both travel directions', () => {
    const surface = new SurfaceSystem(ROUTE_STATIONS);
    for (const station of ROUTE_STATIONS) for (const y of [STREET.bottom, 665, station.stop.y]) for (const rotation of [0, Math.PI]) {
      const feedback = surface.update({ ...road, x: station.stop.x, y, rotation }, 1 / 60);
      expect(feedback.onSidewalk).toBe(false); expect(feedback.angerRate).toBe(0);
    }
    expect(surface.update({ ...road, x: 1500, y: 745 }, 1 / 60).onSidewalk).toBe(true);
  });
  it('produces one curb strike and repeated bumps while traveling, then stops shaking at rest', () => {
    const surface = new SurfaceSystem(ROUTE_STATIONS);
    expect(surface.update(sidewalk, 1 / 60).curbImpact).toBeGreaterThan(0);
    let bumps = 0;
    for (let i = 0; i < 120; i++) {
      const feedback = surface.update(sidewalk, 1 / 60);
      expect(feedback.curbImpact).toBe(0);
      if (feedback.bumpImpact > 0) bumps++;
    }
    expect(bumps).toBeGreaterThan(3);
    for (let i = 0; i < 60; i++) expect(surface.update({ ...sidewalk, speed: 0 }, 1 / 60)).toEqual({ onSidewalk: true, moving: false, curbImpact: 0, bumpImpact: 0, angerRate: 0 });
    surface.update(road, 1 / 60);
    expect(surface.update(sidewalk, 1 / 60).curbImpact).toBeGreaterThan(0);
  });
  it('increases sidewalk anger and impact at higher speeds', () => {
    const low = new SurfaceSystem(ROUTE_STATIONS).update({ ...sidewalk, speed: 20 }, 1 / 60);
    const high = new SurfaceSystem(ROUTE_STATIONS).update({ ...sidewalk, speed: 150 }, 1 / 60);
    expect(high.curbImpact).toBeGreaterThan(low.curbImpact); expect(high.angerRate).toBeGreaterThan(low.angerRate);
  });
  it('adds continuous anger independently of bump frequency and update rate', () => {
    function simulate(dt: number) {
      const surface = new SurfaceSystem(ROUTE_STATIONS), crew = new CrewDynamics();
      for (let i = 0; i < Math.round(3 / dt); i++) crew.update(telemetry, 0, dt, { surface: surface.update(sidewalk, dt) });
      return crew;
    }
    const slow = simulate(1 / 30), fast = simulate(1 / 120);
    expect(slow.anger).toBeGreaterThan(25); expect(slow.anger).toBeCloseTo(fast.anger, 6);
    expect(slow.irritationCause).toBe('人行道顛簸');
    const ordinary = new CrewDynamics();
    for (let i = 0; i < 180; i++) ordinary.update(telemetry, 0, 1 / 60);
    expect(ordinary.anger).toBe(0);
  });
  it('keeps collision as the primary cause when a sidewalk strike happens at the same time', () => {
    const crew = new CrewDynamics();
    crew.update(telemetry, 0, 1 / 60, { collisionImpact: 0.8, surface: new SurfaceSystem(ROUTE_STATIONS).update(sidewalk, 1 / 60) });
    expect(crew.irritationCause).toBe('車輛碰撞');
  });
});
