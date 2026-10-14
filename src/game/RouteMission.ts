import { bayBounds, bayGuideY, isCurvedBay } from './CollectionBay';
import type { CargoItem } from './CargoHold';
import { CargoHold } from './CargoHold';
import type { RoadGraph, RoutePoint } from './RoadGraph';
import type { StationObservation, StationDefinition } from './StationCycle';
import { StationCycle } from './StationCycle';
import type { TossStats } from './TossQueue';
import { CURVED_BAY, MISSION, NAVIGATION, VEHICLE } from '../config/balance';

export type RouteStation = Readonly<{
  id: string;
  name: string;
  scheduledOffsetSeconds: number;
  stop: StationDefinition['stop'];
  buildingExit: RoutePoint;
  queueStart: RoutePoint;
  deliveries: readonly CargoItem[];
  residentDelays?: readonly number[];
  sortingBatches?: readonly (readonly string[])[];
  garbage?: boolean;
}>;

export type StationResult = Readonly<{
  stationId: string;
  name: string;
  scheduledSeconds: number;
  arrivalSeconds: number;
  departureSeconds: number;
  delaySeconds: number;
  tossing?: TossStats;
}>;

export type NavigationSnapshot = Readonly<{
  path: readonly RoutePoint[];
  remainingMeters: number;
  etaSeconds: number;
  scheduledTime: string;
  delaySeconds: number;
}>;

export type MissionSettlement = Readonly<{
  score: number;
  totalSeconds: number;
  totalDelaySeconds: number;
  peakAnger: number;
  stationCount: number;
  tossing?: TossStats;
}>;

export type MissionFailure = Readonly<{ reason: 'crew-anger' | 'collision' | 'missed-stop'; collisionLabel?: string; missedStationName?: string; totalSeconds: number; stationCount: number }>;

export class RouteMission {
  public elapsedSeconds = 0;
  public currentStationIndex = 0;
  public activeCycle: StationCycle | undefined;
  public readonly results: StationResult[] = [];
  public peakAnger = 0;
  public failed = false;
  private failureReason: MissionFailure['reason'] = 'crew-anger';
  private collisionLabel?: string;
  private missedStationName?: string;
  private missedStopWarningActive = false;
  private missedStopWarningElapsed = 0;

  public get missedStopWarning(): string | undefined {
    return this.missedStopWarningActive && !this.ended
      ? `⚠ 你錯過${this.activeStation?.name}！請倒回停靠，民眾正在催促！`
      : undefined;
  }

  private arrivalSeconds: number | undefined;

  public constructor(
    public readonly stations: readonly RouteStation[],
    public readonly cargo: CargoHold,
    private readonly roads: RoadGraph,
  ) {
    this.activeCycle = stations[0] ? new StationCycle(stations[0], cargo) : undefined;
  }

  public get activeStation(): RouteStation | undefined {
    return this.stations[this.currentStationIndex];
  }

  public get complete(): boolean {
    return this.currentStationIndex >= this.stations.length;
  }

  public get ended(): boolean { return this.failed || this.complete; }

  // Called both before work and immediately after this fixed step's crew dynamics.
  public checkCrewAnger(anger: number): void {
    if (this.ended) return;
    this.peakAnger = Math.max(this.peakAnger, anger);
    if (anger >= MISSION.angerFailureThreshold) this.fail('crew-anger');
  }

  public fail(reason: MissionFailure['reason'], collisionLabel?: string): void {
    if (this.ended) return;
    this.failed = true;
    this.failureReason = reason;
    this.collisionLabel = collisionLabel;
    if (reason === 'missed-stop') this.missedStationName = this.activeStation?.name;
  }

  public getFailure(): MissionFailure | undefined {
    return this.failed ? { reason: this.failureReason, ...(this.collisionLabel ? { collisionLabel: this.collisionLabel } : {}), ...(this.missedStationName ? { missedStationName: this.missedStationName } : {}), totalSeconds: this.elapsedSeconds, stationCount: this.results.length } : undefined;
  }

  public update(observation: StationObservation, crewAnger: number, dt: number): void {
    this.checkCrewAnger(crewAnger);
    if (this.ended) return;
    this.elapsedSeconds += dt;
    this.peakAnger = Math.max(this.peakAnger, crewAnger);
    const cycle = this.activeCycle;
    const station = this.activeStation;
    if (!cycle || !station) return;

    cycle.update(observation, dt);
    this.checkMissedStop(observation.vehicleX, dt);
    if (this.ended) return;
    if (this.arrivalSeconds === undefined && cycle.phase === 'servicing') this.arrivalSeconds = this.elapsedSeconds;
    if (cycle.phase !== 'departed') return;

    const arrival = this.arrivalSeconds ?? this.elapsedSeconds;
    this.results.push({
      stationId: station.id,
      name: station.name,
      scheduledSeconds: station.scheduledOffsetSeconds,
      arrivalSeconds: arrival,
      departureSeconds: this.elapsedSeconds,
      delaySeconds: arrival - station.scheduledOffsetSeconds,
      ...(cycle.tossing ? { tossing: cycle.tossing.stats } : {}),
    });
    this.currentStationIndex += 1;
    this.missedStopWarningActive = false;
    this.missedStopWarningElapsed = 0;
    this.arrivalSeconds = undefined;
    const next = this.activeStation;
    this.activeCycle = next ? new StationCycle(next, this.cargo) : undefined;
  }

  public getNavigation(position: RoutePoint): NavigationSnapshot {
    const station = this.activeStation;
    if (this.ended || !station) return { path: [], remainingMeters: 0, etaSeconds: 0, scheduledTime: '—', delaySeconds: 0 };
    let path = [...this.roads.findPath(position, station.stop)];
    if (isCurvedBay(station.stop) && position.x <= station.stop.x) {
      const entryX = bayBounds(station.stop).left;
      const guideStart = Math.max(entryX, position.x);
      path = position.x < entryX
        ? [...this.roads.findPath(position, { x: entryX, y: bayGuideY(station.stop, entryX) })]
        : [position];
      for (let x = guideStart; x < station.stop.x; x += CURVED_BAY.sampleSpacing) path.push({ x, y: bayGuideY(station.stop, x) });
      path.push(station.stop);
    }
    const distance = this.roads.pathDistance(path);
    const arrived = this.arrivalSeconds !== undefined;
    const etaSeconds = arrived ? 0 : distance / (NAVIGATION.cruiseSpeedKmh / VEHICLE.kmhPerSpeedUnit);
    const predictedArrival = arrived ? this.arrivalSeconds! : this.elapsedSeconds + etaSeconds;
    return {
      path: arrived ? [] : path,
      remainingMeters: arrived ? 0 : Math.round(distance * NAVIGATION.metersPerPixel),
      etaSeconds,
      scheduledTime: this.formatClock(station.scheduledOffsetSeconds),
      delaySeconds: predictedArrival - station.scheduledOffsetSeconds,
    };
  }

  public getTossStats(): TossStats {
    const completed = this.results.reduce((sum, result) => ({ hits: sum.hits + (result.tossing?.hits ?? 0), misses: sum.misses + (result.tossing?.misses ?? 0), score: sum.score + (result.tossing?.score ?? 0) }), { hits: 0, misses: 0, score: 0 });
    const active = this.activeCycle?.tossing?.stats;
    return { hits: completed.hits + (active?.hits ?? 0), misses: completed.misses + (active?.misses ?? 0), score: completed.score + (active?.score ?? 0) };
  }

  /** Route-space x is forward even though the displayed road points upward. */
  private checkMissedStop(vehicleX: number, dt: number): void {
    const cycle = this.activeCycle;
    const station = this.activeStation;
    const approaching = cycle?.phase === 'approaching' || cycle?.phase === 'stopping';
    const beyondMeters = station ? (vehicleX - station.stop.x) * NAVIGATION.metersPerPixel : 0;
    if (!approaching || beyondMeters < MISSION.missedStopWarningMeters) {
      this.missedStopWarningActive = false; this.missedStopWarningElapsed = 0;
      return;
    }
    // First publish a warning, even if a frame starts beyond the failure threshold.
    if (!this.missedStopWarningActive) {
      this.missedStopWarningActive = true; this.missedStopWarningElapsed = 0;
      return;
    }
    this.missedStopWarningElapsed += dt;
    if (beyondMeters >= MISSION.missedStopFailureMeters && this.missedStopWarningElapsed >= MISSION.missedStopWarningSeconds) this.fail('missed-stop');
  }

  public getSettlement(): MissionSettlement | undefined {
    if (!this.complete) return undefined;
    const totalDelaySeconds = this.results.reduce((sum, result) => sum + Math.max(0, result.delaySeconds), 0);
    const score = Math.max(0, Math.round(3000 - totalDelaySeconds * 4 - this.peakAnger * 8));
    return {
      score,
      totalSeconds: this.elapsedSeconds,
      totalDelaySeconds,
      peakAnger: this.peakAnger,
      stationCount: this.results.length,
      ...(this.stations.some(station => station.garbage) ? { tossing: this.getTossStats() } : {}),
    };
  }

  private formatClock(offsetSeconds: number): string {
    const totalSeconds = 18 * 3600 + 30 * 60 + Math.floor(offsetSeconds);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
