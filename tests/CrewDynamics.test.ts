import { describe, expect, it } from 'vitest';
import { CrewDynamics } from '../src/game/CrewDynamics';
import type { VehicleTelemetry } from '../src/game/Vehicle';

const smooth: VehicleTelemetry = {
  speed: 60,
  longitudinalSpeed: 60,
  lateralSpeed: 0,
  acceleration: 0,
  lateralAcceleration: 0,
  jerk: 0,
};

describe('CrewDynamics', () => {
  it('stays calm during smooth driving', () => {
    const crew = new CrewDynamics();
    for (let i = 0; i < 600; i += 1) crew.update(smooth, 0, 1 / 60);
    expect(crew.anger).toBe(0);
    expect(crew.efficiency).toBe(1);
  });

  it('reacts to harsh motion and pothole impacts', () => {
    const crew = new CrewDynamics();
    const harsh: VehicleTelemetry = {
      ...smooth,
      speed: 180,
      acceleration: -520,
      lateralAcceleration: 310,
      jerk: 18000,
    };
    crew.update(harsh, 0.8, 1 / 60);
    for (let i = 0; i < 120; i += 1) crew.update(harsh, 0, 1 / 60);
    expect(crew.anger).toBeGreaterThan(15);
    expect(crew.efficiency).toBeLessThan(1);
    expect(Math.abs(crew.swayForward)).toBeGreaterThan(0.5);
  });

  it('clamps anger to one hundred', () => {
    const crew = new CrewDynamics();
    for (let i = 0; i < 20; i += 1) crew.update(smooth, 1, 1 / 60);
    expect(crew.anger).toBe(100);
    expect(crew.reaction).toBe('furious');
  });

  it('increases anger whenever speed exceeds 40 km/h', () => {
    const crew = new CrewDynamics();
    const speeding = { ...smooth, speed: 41 / 0.35, longitudinalSpeed: 41 / 0.35 };
    for (let i = 0; i < 60; i += 1) crew.update(speeding, 0, 1 / 60);
    expect(crew.anger).toBeGreaterThan(2);
    expect(crew.irritationCause).toBe('車速超過 40 km/h');
  });

  it('increases anger when turning above 20 km/h', () => {
    const crew = new CrewDynamics();
    const fastCorner = { ...smooth, speed: 25 / 0.35, longitudinalSpeed: 25 / 0.35 };
    for (let i = 0; i < 60; i += 1) crew.update(fastCorner, 0, 1 / 60, { steeringInput: 1 });
    expect(crew.anger).toBeGreaterThan(3);
    expect(crew.irritationCause).toBe('過彎未降至 20 km/h');
  });

  it('increases anger while residents delay their handoff', () => {
    const crew = new CrewDynamics();
    for (let i = 0; i < 60; i += 1) crew.update({ ...smooth, speed: 0 }, 0, 1 / 60, { residentDelaySeconds: 1 });
    expect(crew.anger).toBeGreaterThan(2);
    expect(crew.irritationCause).toBe('居民拖延交付');
  });
});
