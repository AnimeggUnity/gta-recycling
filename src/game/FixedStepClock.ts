export class FixedStepClock {
  private accumulator = 0;

  public advance(elapsedSeconds: number, step: (deltaSeconds: number) => void): void {
    this.accumulator += Math.min(elapsedSeconds, 0.25);
    while (this.accumulator >= 1 / 60) {
      step(1 / 60);
      this.accumulator -= 1 / 60;
    }
  }
}
