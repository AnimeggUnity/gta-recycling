import { STREET, VEHICLE, WORLD } from '../config/balance';

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
  public x: number = STREET.startX;
  public y: number = STREET.startY;
  public rotation = 0;
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
  private previousAcceleration = 0;

  public get speed(): number {
    return Math.hypot(this.velocityX, this.velocityY);
  }

  public update(input: DriverInput, dt: number): void {
    if (dt <= 0) return;
    const previousVelocityX = this.velocityX;
    const previousVelocityY = this.velocityY;
    const forwardX = Math.cos(this.rotation);
    const forwardY = Math.sin(this.rotation);
    const rightX = -forwardY;
    const rightY = forwardX;
    let longitudinal = this.velocityX * forwardX + this.velocityY * forwardY;
    let lateral = this.velocityX * rightX + this.velocityY * rightY;

    const reversingSteering = this.steering * input.steering < 0;
    const steeringResponse = reversingSteering ? VEHICLE.steeringReversalResponse : VEHICLE.steeringResponse;
    this.steering = this.approach(this.steering, input.steering, steeringResponse * dt);
    const speedRatio = Math.min(1, Math.abs(longitudinal) * VEHICLE.kmhPerSpeedUnit / VEHICLE.steeringSpeedReferenceKmh);
    const wheelAngle = this.steering * this.lerp(VEHICLE.lowSpeedSteeringAngle, VEHICLE.highSpeedSteeringAngle, speedRatio);
    // Bicycle steering: heading changes with distance traveled, never as an in-place spin.
    // Low-speed wheel lock gives a smaller radius; reversing flips the yaw naturally.
    this.rotation += longitudinal / VEHICLE.wheelbase * Math.tan(wheelAngle) * dt;

    // Preserve world momentum when the body rotates; tire forces then remove side slip.
    const nextForwardX = Math.cos(this.rotation);
    const nextForwardY = Math.sin(this.rotation);
    const nextRightX = -nextForwardY;
    const nextRightY = nextForwardX;
    longitudinal = previousVelocityX * nextForwardX + previousVelocityY * nextForwardY;
    lateral = previousVelocityX * nextRightX + previousVelocityY * nextRightY;

    if (input.brake) {
      longitudinal = this.approach(longitudinal, 0, VEHICLE.emergencyBraking * dt);
    } else if (input.throttle > 0) {
      const force = longitudinal < -2 ? VEHICLE.directionChangeBraking : VEHICLE.forwardAcceleration;
      longitudinal += force * Math.min(1, input.throttle) * dt;
    } else if (input.throttle < 0) {
      const force = longitudinal > 2 ? VEHICLE.directionChangeBraking : VEHICLE.reverseAcceleration;
      longitudinal -= force * Math.min(1, -input.throttle) * dt;
    }

    if (input.throttle === 0 || input.brake) {
      const resistance = VEHICLE.rollingResistance + Math.abs(longitudinal) * VEHICLE.aerodynamicDrag;
      longitudinal = this.approach(longitudinal, 0, resistance * dt);
    }
    longitudinal = Math.max(-VEHICLE.maxReverseSpeed, Math.min(VEHICLE.maxForwardSpeed, longitudinal));

    const grip = input.brake ? VEHICLE.emergencyLateralGrip : VEHICLE.lateralGrip;
    lateral *= Math.exp(-grip * dt);
    this.velocityX = nextForwardX * longitudinal + nextRightX * lateral;
    this.velocityY = nextForwardY * longitudinal + nextRightY * lateral;
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;
    const boundedX = Math.max(VEHICLE.boundaryMargin, Math.min(WORLD.width - VEHICLE.boundaryMargin, this.x));
    const boundedY = Math.max(VEHICLE.boundaryMargin, Math.min(WORLD.height - VEHICLE.boundaryMargin, this.y));
    if (boundedX !== this.x) this.velocityX = 0;
    if (boundedY !== this.y) this.velocityY = 0;
    this.x = boundedX;
    this.y = boundedY;

    const accelerationX = (this.velocityX - previousVelocityX) / dt;
    const accelerationY = (this.velocityY - previousVelocityY) / dt;
    const acceleration = accelerationX * nextForwardX + accelerationY * nextForwardY;
    this.telemetry = {
      speed: this.speed,
      longitudinalSpeed: this.velocityX * nextForwardX + this.velocityY * nextForwardY,
      lateralSpeed: this.velocityX * nextRightX + this.velocityY * nextRightY,
      acceleration,
      lateralAcceleration: accelerationX * nextRightX + accelerationY * nextRightY,
      jerk: (acceleration - this.previousAcceleration) / dt,
    };
    this.previousAcceleration = acceleration;
  }

  public park(): void {
    this.velocityX = 0;
    this.velocityY = 0;
    this.telemetry = { speed: 0, longitudinalSpeed: 0, lateralSpeed: 0, acceleration: 0, lateralAcceleration: 0, jerk: 0 };
    this.previousAcceleration = 0;
  }

  private approach(value: number, target: number, amount: number): number {
    return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
  }

  private lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
  }
}
