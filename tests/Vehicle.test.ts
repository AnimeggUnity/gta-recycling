import { describe, expect, it } from 'vitest';
import { Vehicle } from '../src/game/Vehicle';

const neutral = { throttle: 0, steering: 0, brake: false } as const;

describe('Vehicle', () => {
  it('accelerates toward its visual front', () => {
    const vehicle = new Vehicle();
    const initialY = vehicle.y;
    for (let i = 0; i < 60; i += 1) {
      vehicle.update({ throttle: 1, steering: 0, brake: false }, 1 / 60);
    }
    expect(vehicle.y).toBeLessThan(initialY);
    expect(vehicle.telemetry.longitudinalSpeed).toBeGreaterThan(0);
  });

  it('turns right while moving forward', () => {
    const vehicle = new Vehicle();
    for (let i = 0; i < 60; i += 1) vehicle.update({ throttle: 1, steering: 0, brake: false }, 1 / 60);
    const before = vehicle.rotation;
    for (let i = 0; i < 30; i += 1) vehicle.update({ throttle: 1, steering: 1, brake: false }, 1 / 60);
    expect(vehicle.rotation).toBeGreaterThan(before);
  });

  it('emergency braking reduces speed', () => {
    const vehicle = new Vehicle();
    for (let i = 0; i < 60; i += 1) vehicle.update({ throttle: 1, steering: 0, brake: false }, 1 / 60);
    const before = vehicle.speed;
    for (let i = 0; i < 20; i += 1) vehicle.update({ ...neutral, brake: true }, 1 / 60);
    expect(vehicle.speed).toBeLessThan(before);
  });

  it('responds quickly when steering changes direction', () => {
    const vehicle = new Vehicle();
    for (let i = 0; i < 60; i += 1) vehicle.update({ throttle: 1, steering: 0, brake: false }, 1 / 60);
    for (let i = 0; i < 20; i += 1) vehicle.update({ throttle: 1, steering: -1, brake: false }, 1 / 60);
    const afterLeft = vehicle.rotation;
    for (let i = 0; i < 20; i += 1) vehicle.update({ throttle: 1, steering: 1, brake: false }, 1 / 60);
    expect(vehicle.rotation).toBeGreaterThan(afterLeft);
  });
});
