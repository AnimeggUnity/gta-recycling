import type { CargoItem } from './CargoHold';
import { CargoHold } from './CargoHold';
import type { RoadGraph, RoutePoint } from './RoadGraph';
import type { StationObservation } from './StationCycle';
import { StationCycle } from './StationCycle';

export type RouteStation = Readonly<{
  id: string;
  name: string;
  scheduledOffsetSeconds: number;
  stop: Readonly<{ x: number; y: number; radius: number; exitRadius: number }>;
  buildingExit: RoutePoint;
  queueStart: RoutePoint;
  deliveries: readonly CargoItem[];
  residentDelays?: readonly number[];
}>;

export type StationResult = Readonly<{
  stationId: string;
  name: string;
  scheduledSeconds: number;
  arrivalSeconds: number;
  departureSeconds: number;
  delaySeconds: number;
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
}>;

export class RouteMission {
  public elapsedSeconds = 0;
  public currentStationIndex = 0;
  public activeCycle: StationCycle | undefined;
  public readonly results: StationResult[] = [];
  public peakAnger = 0;

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

  public update(observation: StationObservation, crewAnger: number, dt: number): void {
    if (this.complete) return;
    this.elapsedSeconds += dt;
    this.peakAnger = Math.max(this.peakAnger, crewAnger);
    const cycle = this.activeCycle;
    const station = this.activeStation;
    if (!cycle || !station) return;

    cycle.update(observation, dt);
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
    });
    this.currentStationIndex += 1;
    this.arrivalSeconds = undefined;
    const next = this.activeStation;
    this.activeCycle = next ? new StationCycle(next, this.cargo) : undefined;
  }

  public getNavigation(position: RoutePoint): NavigationSnapshot {
    const station = this.activeStation;
    if (!station) return { path: [], remainingMeters: 0, etaSeconds: 0, scheduledTime: '—', delaySeconds: 0 };
    const path = this.roads.findPath(position, station.stop);
    const distance = this.roads.pathDistance(path);
    const arrived = this.arrivalSeconds !== undefined;
    const etaSeconds = arrived ? 0 : distance / 145;
    const predictedArrival = arrived ? this.arrivalSeconds! : this.elapsedSeconds + etaSeconds;
    return {
      path,
      remainingMeters: arrived ? 0 : Math.round(distance * 2.5),
      etaSeconds,
      scheduledTime: this.formatClock(station.scheduledOffsetSeconds),
      delaySeconds: predictedArrival - station.scheduledOffsetSeconds,
    };
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
