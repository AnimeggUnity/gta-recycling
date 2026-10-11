import type { DriverInput } from '../game/Vehicle';

export type TouchAction = 'forward' | 'reverse' | 'brake' | 'steering';
type HeldPointer = { action: TouchAction; sequence: number; steering: number };

/** Each finger owns its action; releasing steering must never release the gas. */
export class TouchInputState {
  private readonly pointers = new Map<number, HeldPointer>();
  private sequence = 0;

  public press(pointerId: number, action: TouchAction): void {
    this.pointers.set(pointerId, { action, sequence: ++this.sequence, steering: 0 });
  }
  public steer(pointerId: number, value: number): void {
    const pointer = this.pointers.get(pointerId);
    if (pointer?.action === 'steering') pointer.steering = Math.max(-1, Math.min(1, value));
  }
  public release(pointerId: number): void { this.pointers.delete(pointerId); }
  public reset(): void { this.pointers.clear(); }
  public isHeld(action: TouchAction): boolean { return [...this.pointers.values()].some((pointer) => pointer.action === action); }

  public read(): DriverInput {
    const values = [...this.pointers.values()];
    const throttle = values.filter((pointer) => pointer.action === 'forward' || pointer.action === 'reverse').sort((a, b) => b.sequence - a.sequence)[0];
    const wheel = values.filter((pointer) => pointer.action === 'steering').sort((a, b) => b.sequence - a.sequence)[0];
    return { throttle: throttle ? throttle.action === 'forward' ? 1 : -1 : 0, steering: wheel?.steering ?? 0, brake: this.isHeld('brake') };
  }

  public merge(keyboard: DriverInput): DriverInput {
    const touch = this.read();
    return {
      throttle: this.isHeld('forward') || this.isHeld('reverse') ? touch.throttle : keyboard.throttle,
      steering: this.isHeld('steering') ? touch.steering : keyboard.steering,
      brake: touch.brake || keyboard.brake,
    };
  }
}

export const touchInput = new TouchInputState();
