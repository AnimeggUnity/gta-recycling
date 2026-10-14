import { BAY_VIOLATION, CURVED_BAY, TRAFFIC } from '../config/balance';
import { bayGuideY, type BayStop } from './CollectionBay';
import { intersectBodies, type CollisionObstacle } from './CollisionWorld';

export type ViolatorPhase = 'parked' | 'reacting' | 'departing' | 'cleared';
export type BayViolator = {
  id: string; stationId: string; stop: BayStop; x: number; y: number;
  rotation: number; speed: number; phase: ViolatorPhase; reactionTimer: number; elapsed: number;
};

/** Exactly one random bay per run. No rerolls, spawning or timers in rendering. */
export class BayViolationSystem {
  public readonly violators: BayViolator[];
  private hornCooldown = 0;

  public constructor(stations: readonly { id: string; stop: BayStop }[], random: () => number = Math.random) {
    if (!stations.length) { this.violators = []; return; }
    const index = Math.floor(Math.max(0, Math.min(1 - Number.EPSILON, random())) * stations.length);
    const station = stations[index];
    this.violators = [{ id: `bay-violator-${station.id}`, stationId: station.id, stop: station.stop,
      x: station.stop.x + BAY_VIOLATION.parkedOffsetX, y: station.stop.y,
      rotation: 0, speed: 0, phase: 'parked', reactionTimer: 0, elapsed: 0 }];
  }

  public nearbyParkedViolator(x: number, y: number): BayViolator | undefined {
    return this.violators.find(v => v.phase === 'parked' && Math.hypot(v.x - x, v.y - y) <= BAY_VIOLATION.hornRange);
  }

  public triggerHorn(x: number, y: number): boolean {
    if (this.hornCooldown > 0) return false;
    this.hornCooldown = BAY_VIOLATION.hornCooldownSeconds;
    const v = this.nearbyParkedViolator(x, y);
    if (!v) return false;
    v.phase = 'reacting'; v.reactionTimer = BAY_VIOLATION.reactionSeconds;
    return true;
  }

  public blocksStation(stationId?: string): boolean {
    return this.violators.some(v => v.stationId === stationId && v.phase !== 'cleared'
      && v.x - TRAFFIC.sedanHalfLength <= v.stop.x + CURVED_BAY.stopHalfLength);
  }

  public update(dt: number, obstacles: readonly CollisionObstacle[] = []): void {
    if (dt <= 0) return;
    this.hornCooldown = Math.max(0, this.hornCooldown - dt);
    for (const v of this.violators) {
      if (v.phase === 'cleared') continue;
      v.elapsed += dt;
      let moveSeconds = dt;
      if (v.phase === 'reacting') {
        moveSeconds = Math.max(0, dt - v.reactionTimer);
        v.reactionTimer = Math.max(0, v.reactionTimer - dt);
        if (v.reactionTimer === 0) v.phase = 'departing';
      }
      if (v.phase !== 'departing' || moveSeconds === 0) continue;
      const accelerationSeconds = Math.min(moveSeconds, (BAY_VIOLATION.targetSpeed - v.speed) / BAY_VIOLATION.acceleration);
      const travel = v.speed * moveSeconds + BAY_VIOLATION.acceleration * accelerationSeconds * (moveSeconds - accelerationSeconds / 2);
      const slope = (bayGuideY(v.stop, v.x + BAY_VIOLATION.lookAhead) - bayGuideY(v.stop, v.x)) / BAY_VIOLATION.lookAhead;
      const rotation = Math.atan(slope);
      const x = v.x + Math.cos(rotation) * travel;
      const y = bayGuideY(v.stop, x);
      const candidate = { ...this.obstacle(v), x, y, rotation, halfLength: TRAFFIC.sedanHalfLength + TRAFFIC.followingGap };
      // Wait for a safe opening when the departure curve joins ordinary traffic.
      if (obstacles.some(other => intersectBodies(candidate, other))) { v.speed = 0; continue; }
      v.x = x; v.y = y; v.rotation = rotation;
      v.speed = Math.min(BAY_VIOLATION.targetSpeed, v.speed + BAY_VIOLATION.acceleration * moveSeconds);
      if (v.x > v.stop.x + BAY_VIOLATION.clearDistancePastStop) v.phase = 'cleared';
    }
  }

  public getObstacles(): readonly CollisionObstacle[] {
    return this.violators.filter(v => v.phase !== 'cleared').map(v => this.obstacle(v));
  }

  private obstacle(v: BayViolator): CollisionObstacle {
    return { id: v.id, label: '收運灣違停車輛', kind: 'vehicle', x: v.x, y: v.y, rotation: v.rotation,
      halfLength: TRAFFIC.sedanHalfLength, halfWidth: TRAFFIC.sedanHalfWidth,
      velocityX: Math.cos(v.rotation) * v.speed, velocityY: Math.sin(v.rotation) * v.speed };
  }
}
