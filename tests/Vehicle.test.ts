import { describe, expect, it } from 'vitest';
import { Vehicle } from '../src/game/Vehicle';
import { VEHICLE } from '../src/config/balance';

const neutral = { throttle: 0, steering: 0, brake: false } as const;

describe('Vehicle', () => {
  it('caps the truck at 60 km/h', () => {
    expect(VEHICLE.maxForwardSpeed * VEHICLE.kmhPerSpeedUnit).toBe(60);
  });

  it('limits reverse speed to 12 km/h', () => {
    const vehicle = new Vehicle(); vehicle.x = 3000; vehicle.y = 520;
    for (let i = 0; i < 600; i++) vehicle.update({ throttle: -1, steering: 0, brake: false }, 1 / 60);
    expect(-vehicle.telemetry.longitudinalSpeed * VEHICLE.kmhPerSpeedUnit).toBeCloseTo(12);
  });
  it('never rotates at rest even with full steering', () => {
    const vehicle = new Vehicle(); const position = { x: vehicle.x, y: vehicle.y };
    for (let i = 0; i < 180; i++) vehicle.update({ ...neutral, steering: 1 }, 1 / 60);
    expect(vehicle.rotation).toBe(0); expect({ x: vehicle.x, y: vehicle.y }).toEqual(position);
  });
  it('turns only slightly when creeping instead of spinning around', () => {
    const vehicle = new Vehicle();
    for (let i = 0; i < 120; i++) {
      vehicle.velocityX = 2 * Math.cos(vehicle.rotation); vehicle.velocityY = 2 * Math.sin(vehicle.rotation);
      vehicle.update({ ...neutral, steering: 1 }, 1 / 60);
    }
    expect(vehicle.rotation).toBeGreaterThan(0); expect(vehicle.rotation).toBeLessThan(0.04);
  });
  it('makes a tighter low-speed curve for the same distance traveled', () => {
    function turn(kmh: number) {
      const vehicle = new Vehicle(); vehicle.x = 3000; vehicle.y = 520;
      const input = { ...neutral, steering: 1 };
      for (let i = 0; i < 20; i++) vehicle.update(input, 1 / 60); // Set wheel lock without moving.
      let distance = 0;
      while (distance < 80) {
        const speed = kmh / VEHICLE.kmhPerSpeedUnit;
        vehicle.velocityX = speed * Math.cos(vehicle.rotation); vehicle.velocityY = speed * Math.sin(vehicle.rotation);
        const x = vehicle.x, y = vehicle.y; vehicle.update(input, 1 / 60);
        distance += Math.hypot(vehicle.x - x, vehicle.y - y);
      }
      return vehicle.rotation / distance;
    }
    expect(turn(5)).toBeGreaterThan(turn(50) * 2);
  });
  it('reverses turn direction when backing up with the same wheel input', () => {
    const vehicle = new Vehicle();
    for (let i = 0; i < 60; i++) vehicle.update({ throttle: -1, steering: 1, brake: false }, 1 / 60);
    expect(vehicle.rotation).toBeLessThan(0);
    expect(vehicle.telemetry.longitudinalSpeed).toBeLessThan(0);
  });

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
