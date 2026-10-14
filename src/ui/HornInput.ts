/** One-shot input, separate from held pedals and steering fingers. */
export class HornInput {
  private pending = false;
  public request(): void { this.pending = true; }
  public take(): boolean { const result = this.pending; this.pending = false; return result; }
  public reset(): void { this.pending = false; }
}
export const hornInput = new HornInput();
