import { WORLD } from '../config/balance';

export class FixedStepClock {
  private accumulator = 0;

  public advance(elapsedSeconds: number, step: (deltaSeconds: number) => void): void {
    this.accumulator += Math.max(0, Math.min(elapsedSeconds, WORLD.maxFrameSeconds));
    while (this.accumulator >= WORLD.fixedStepSeconds) {
      step(WORLD.fixedStepSeconds);
      this.accumulator -= WORLD.fixedStepSeconds;
    }
  }
}
