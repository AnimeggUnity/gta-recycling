import { TOSS } from '../config/balance';

export type BagSize = keyof typeof TOSS.bagSizes;
export type BagHazard = 'gas-canister' | 'lithium-battery';
export type GarbageBag = Readonly<{ id: number; size: BagSize; hazard?: BagHazard }>;
export const HAZARD_LABELS: Record<BagHazard, string> = { 'gas-canister': '高壓氣瓶', 'lithium-battery': '行動電源／鋰電池' };
export type TossGesture = Readonly<{ vx: number; vy: number }>;
export type TossOutcome = 'hit' | 'short' | 'strong' | 'left' | 'right' | 'returned' | 'hazard-exploded';
export type TossStats = Readonly<{ hits: number; misses: number; score: number }>;
export type TossFlight = {
  bag: GarbageBag; elapsed: number; x: number; depth: number; height: number;
  vx: number; speed: number; outcome?: TossOutcome; feedbackElapsed: number;
};

/** Each station draws its bags once, on arrival. No classification or replacement throws. */
export class TossQueue {
  public readonly bags: readonly GarbageBag[];
  public flight?: TossFlight;
  public processed = 0;
  public hits = 0;
  public misses = 0;
  public returnedHazards = 0;
  public hazardExplosions = 0;
  public lastOutcome?: TossOutcome;

  public constructor(random: () => number = Math.random, enableHazards = false) {
    const draw = () => Math.max(0, Math.min(0.999999, random()));
    const count = TOSS.minBags + Math.floor(draw() * (TOSS.maxBags - TOSS.minBags + 1));
    const sizes: BagSize[] = ['small', 'medium', 'large'];
    const baseBags = Array.from({ length: count }, (_, i) => ({ id: i + 1, size: sizes[Math.floor(draw() * sizes.length)] }));
    this.bags = enableHazards ? baseBags.map((bag, index) => {
      if (index === 0 || draw() >= TOSS.hazardChance) return bag;
      const hazard: BagHazard = draw() < 0.5 ? 'gas-canister' : 'lithium-battery';
      return { ...bag, hazard };
    }) : baseBags;
  }
  public get current(): GarbageBag | undefined { return this.bags[this.processed]; }
  public get complete(): boolean { return this.processed === this.bags.length && !this.flight; }
  public get stats(): TossStats { return { hits: this.hits, misses: this.misses, score: Math.max(0, this.hits * TOSS.pointsPerBag - this.hazardExplosions * TOSS.hazardScorePenalty) }; }

  public rejectCurrent(id: number): boolean {
    const bag = this.current;
    if (!bag || bag.id !== id || this.flight) return false;
    if (bag.hazard) { this.hits++; this.returnedHazards++; this.lastOutcome = 'returned'; }
    else { this.misses++; this.lastOutcome = 'short'; }
    this.processed++;
    return true;
  }

  public launch(id: number, gesture: TossGesture): boolean {
    const bag = this.current;
    if (!bag || bag.id !== id || this.flight || !Number.isFinite(gesture.vx) || !Number.isFinite(gesture.vy)) return false;
    if (bag.hazard && gesture.vy >= TOSS.rejectSwipeVelocityY) return this.rejectCurrent(id);
    // Viewport-relative velocity; larger mass needs a faster flick for the same distance.
    const gain = TOSS.speedGain / Math.sqrt(TOSS.bagSizes[bag.size].mass);
    const speed = Math.max(0, Math.min(TOSS.maxLaunchSpeed, -gesture.vy * gain));
    this.flight = { bag, elapsed: 0, x: 0, depth: 0, height: 0, vx: Math.max(-TOSS.maxLaunchSpeed, Math.min(TOSS.maxLaunchSpeed, gesture.vx * gain)), speed, feedbackElapsed: 0 };
    this.lastOutcome = undefined;
    return true;
  }

  /** Called only by StationCycle's fixed step; returns a newly scored bag once. */
  public update(dt: number): GarbageBag | undefined {
    const flight = this.flight;
    if (!flight) return;
    if (flight.outcome) {
      flight.feedbackElapsed += dt;
      if (flight.feedbackElapsed >= TOSS.feedbackSeconds) { this.processed += 1; this.flight = undefined; }
      return;
    }
    flight.elapsed += dt;
    // Solve continuously at the target plane, preventing frame-sized jumps past the mouth.
    const planeTime = flight.speed > 0 ? TOSS.targetDepth / flight.speed : Infinity;
    const groundTime = flight.speed * TOSS.liftRatio * 2 / TOSS.gravity;
    const endTime = Math.min(planeTime, groundTime, TOSS.maxFlightSeconds);
    const t = Math.min(flight.elapsed, endTime);
    flight.x = flight.vx * t;
    flight.depth = flight.speed * t;
    flight.height = Math.max(0, flight.speed * TOSS.liftRatio * t - TOSS.gravity * t * t / 2);
    if (flight.elapsed < endTime) return;
    const outcome: TossOutcome = planeTime > groundTime || planeTime > TOSS.maxFlightSeconds || flight.height < TOSS.targetMinHeight
      ? 'short' : flight.height > TOSS.targetMaxHeight ? 'strong'
      : flight.x < -TOSS.targetHalfWidth ? 'left' : flight.x > TOSS.targetHalfWidth ? 'right' : 'hit';
    flight.outcome = outcome === 'hit' && flight.bag.hazard ? 'hazard-exploded' : outcome;
    this.lastOutcome = flight.outcome;
    if (flight.outcome === 'hazard-exploded') { this.hazardExplosions++; this.misses++; return; }
    if (outcome === 'hit') { this.hits += 1; return flight.bag; }
    this.misses += 1;
  }
}
