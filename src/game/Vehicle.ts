import { VEHICLE, WORLD } from '../config/balance';

export type DriverInput = Readonly<{ throttle: number; steering: number; brake: boolean }>;

export class Vehicle {
  public x = 470;
  public y = 610;
  public rotation = -Math.PI / 2;
  public speed = 0;

  public update(input: DriverInput, dt: number): void {
    const direction = this.speed >= 0 ? 1 : -1;
    if (input.brake) this.speed -= direction * VEHICLE.braking * dt;
    else this.speed += input.throttle * VEHICLE.acceleration * dt;
    this.speed = Math.abs(this.speed) < 1 ? 0 : Math.max(-80, Math.min(VEHICLE.maxSpeed, this.speed));
    if (!input.throttle && !input.brake) this.speed = this.approach(this.speed, 0, VEHICLE.drag * dt);

    const steeringScale = Math.min(1, Math.abs(this.speed) / 70);
    this.rotation += input.steering * VEHICLE.turnRateRadians * steeringScale * dt * direction;
    this.x += Math.cos(this.rotation) * this.speed * dt;
    this.y += Math.sin(this.rotation) * this.speed * dt;
    this.x = Math.max(42, Math.min(WORLD.width - 42, this.x));
    this.y = Math.max(42, Math.min(WORLD.height - 42, this.y));
  }

  private approach(value: number, target: number, amount: number): number {
    return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
  }
}
