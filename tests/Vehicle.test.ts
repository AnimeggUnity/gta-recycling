import { describe, expect, it } from 'vitest';
import { Vehicle } from '../src/game/Vehicle';

const neutral = { throttle: 0, steering: 0, brake: false } as const;

describe('Vehicle', () => {
  it('generates side slip and real lateral acceleration in a corner', () => {
    const vehicle = new Vehicle();
    for (let i = 0; i < 60; i += 1) vehicle.update({ throttle: 1, steering: 0, brake: false }, 1 / 60);
    for (let i = 0; i < 12; i += 1) vehicle.update({ throttle: 1, steering: 1, brake: false }, 1 / 60);
    expect(Math.abs(vehicle.telemetry.lateralSpeed)).toBeGreaterThan(5);
    expect(Math.abs(vehicle.telemetry.lateralAcceleration)).toBeGreaterThan(20);
  });

  it('holds the truck still during service even after a drifting stop', () => {
    const vehicle = new Vehicle();
    vehicle.velocityX = 3;
    vehicle.velocityY = 4;
    const position = { x: vehicle.x, y: vehicle.y };
    vehicle.park();
    expect(vehicle.speed).toBe(0);
    expect({ x: vehicle.x, y: vehicle.y }).toEqual(position);
    expect(vehicle.telemetry.lateralSpeed).toBe(0);
  });
  it('accelerates toward its visual front', () => {
    const vehicle = new Vehicle();
    const initialX = vehicle.x;
    for (let i = 0; i < 60; i += 1) {
      vehicle.update({ throttle: 1, steering: 0, brake: false }, 1 / 60);
    }
    expect(vehicle.x).toBeGreaterThan(initialX);
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
