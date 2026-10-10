import { VEHICLE, WORLD } from '../config/balance';

export type DriverInput = Readonly<{ throttle: number; steering: number; brake: boolean }>;

export type VehicleTelemetry = Readonly<{
  speed: number;
  longitudinalSpeed: number;
  lateralSpeed: number;
  acceleration: number;
  lateralAcceleration: number;
  jerk: number;
}>;

export class Vehicle {
  public x = 470;
  public y = 610;
  public rotation = -Math.PI / 2;
  public velocityX = 0;
  public velocityY = 0;
  public telemetry: VehicleTelemetry = {
    speed: 0,
    longitudinalSpeed: 0,
    lateralSpeed: 0,
    acceleration: 0,
    lateralAcceleration: 0,
    jerk: 0,
  };

  private steering = 0;
  private previousLongitudinalSpeed = 0;
  private previousAcceleration = 0;

  public get speed(): number {
    return Math.hypot(this.velocityX, this.velocityY);
  }

  public update(input: DriverInput, dt: number): void {
    const forwardX = Math.cos(this.rotation);
    const forwardY = Math.sin(this.rotation);
    const rightX = -forwardY;
    const rightY = forwardX;
    let longitudinal = this.velocityX * forwardX + this.velocityY * forwardY;
    let lateral = this.velocityX * rightX + this.velocityY * rightY;

    const reversingSteering = this.steering * input.steering < 0;
    const steeringResponse = reversingSteering ? VEHICLE.steeringReversalResponse : VEHICLE.steeringResponse;
    this.steering = this.approach(this.steering, input.steering, steeringResponse * dt);
    const speedRatio = Math.min(1, Math.abs(longitudinal) / VEHICLE.maxForwardSpeed);
    const turnRate = this.lerp(VEHICLE.lowSpeedTurnRate, VEHICLE.highSpeedTurnRate, speedRatio);
    const steeringAuthority = Math.min(1, Math.abs(longitudinal) / 24);
    const travelDirection = longitudinal < -1 ? -1 : 1;
    this.rotation += this.steering * turnRate * steeringAuthority * travelDirection * dt;

    if (input.brake) {
      longitudinal = this.approach(longitudinal, 0, VEHICLE.emergencyBraking * dt);
    } else if (input.throttle > 0) {
      const force = longitudinal < -2 ? VEHICLE.directionChangeBraking : VEHICLE.forwardAcceleration;
      longitudinal += force * dt;
    } else if (input.throttle < 0) {
      const force = longitudinal > 2 ? VEHICLE.directionChangeBraking : VEHICLE.reverseAcceleration;
      longitudinal -= force * dt;
    }

    if (input.throttle === 0 || input.brake) {
      const resistance = VEHICLE.rollingResistance + Math.abs(longitudinal) * VEHICLE.aerodynamicDrag;
      longitudinal = this.approach(longitudinal, 0, resistance * dt);
    }
    longitudinal = Math.max(-VEHICLE.maxReverseSpeed, Math.min(VEHICLE.maxForwardSpeed, longitudinal));

    const grip = input.brake ? VEHICLE.emergencyLateralGrip : VEHICLE.lateralGrip;
    const previousLateral = lateral;
    lateral *= Math.exp(-grip * dt);

    const nextForwardX = Math.cos(this.rotation);
    const nextForwardY = Math.sin(this.rotation);
    const nextRightX = -nextForwardY;
    const nextRightY = nextForwardX;
    this.velocityX = nextForwardX * longitudinal + nextRightX * lateral;
    this.velocityY = nextForwardY * longitudinal + nextRightY * lateral;
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;
    this.x = Math.max(42, Math.min(WORLD.width - 42, this.x));
    this.y = Math.max(42, Math.min(WORLD.height - 42, this.y));

    const acceleration = (longitudinal - this.previousLongitudinalSpeed) / dt;
    this.telemetry = {
      speed: this.speed,
      longitudinalSpeed: longitudinal,
      lateralSpeed: lateral,
      acceleration,
      lateralAcceleration: (lateral - previousLateral) / dt,
      jerk: (acceleration - this.previousAcceleration) / dt,
    };
    this.previousLongitudinalSpeed = longitudinal;
    this.previousAcceleration = acceleration;
  }

  private approach(value: number, target: number, amount: number): number {
    return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
  }

  private lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
  }
}
