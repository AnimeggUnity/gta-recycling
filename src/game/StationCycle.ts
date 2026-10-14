import type { CargoItem } from './CargoHold';
import { CargoHold, RECYCLING_LABELS } from './CargoHold';
import { SERVICE, TOSS } from '../config/balance';
import { SortingQueue } from './SortingQueue';
import { TossQueue } from './TossQueue';

export type StationPhase = 'approaching' | 'stopping' | 'servicing' | 'organizing' | 'ready' | 'departed';
export type WorkerState = 'riding' | 'waiting' | 'moving-to-tail' | 'receiving' | 'carrying' | 'sorting' | 'organizing' | 'returning';

type ServiceAction = Exclude<WorkerState, 'riding' | 'waiting' | 'organizing' | 'returning'> | 'resident-arriving';

export type StationDefinition = Readonly<{
  name: string;
  stop: Readonly<{ x: number; y: number; radius: number; exitRadius: number; docking?: Readonly<{ halfLength: number; halfWidth: number; heading: number; headingTolerance: number }> }>;
  deliveries: readonly CargoItem[];
  residentDelays?: readonly number[];
  sortingBatches?: readonly (readonly string[])[];
  garbage?: boolean;
}>;

export type StationObservation = Readonly<{
  vehicleX: number;
  vehicleY: number;
  vehicleSpeed: number;
  attemptingToDrive: boolean;
  crewEfficiency?: number;
  vehicleRotation?: number;
  dockingBlocked?: boolean;
}>;

export type ResidentSnapshot = Readonly<{
  visible: boolean;
  completed: boolean;
  queueIndex: number;
  entranceProgress: number;
  handoffProgress: number;
  hasItem: boolean;
  item: CargoItem;
}>;

const ACTION_DURATION: Record<ServiceAction, number> = {
  'resident-arriving': SERVICE.residentTravelSeconds,
  ...SERVICE.workerActionSeconds,
};

export class StationCycle {
  public readonly sorting: SortingQueue | undefined;
  public tossing?: TossQueue;
  public phase: StationPhase = 'approaching';
  public workerState: WorkerState = 'riding';
  public workerProgress = 0;
  public completedDeliveries = 0;

  private stopTimer = 0;
  private serviceElapsed = 0;
  private action: ServiceAction = 'resident-arriving';
  private actionElapsed = 0;
  private organizingElapsed = 0;
  private warningTimer = 0;
  private capacityBlocked = false;
  private workRate = 1;
  private consumedExplosions = 0;

  /** Consume each compression accident once, within the scene's fixed step. */
  public consumeHazardAnger(): number {
    const explosions = this.tossing?.hazardExplosions ?? 0;
    const count = explosions - this.consumedExplosions;
    this.consumedExplosions = explosions;
    return count * TOSS.hazardAngerPenalty;
  }

  public constructor(
    public readonly definition: StationDefinition,
    public readonly cargo: CargoHold,
  ) {
    if (definition.sortingBatches) {
      if (definition.sortingBatches.length !== definition.deliveries.length) throw new Error('Sorting batches must match residents');
      this.sorting = new SortingQueue(cargo);
    }
  }

  public get departureLocked(): boolean {
    return this.phase === 'servicing' || this.phase === 'organizing';
  }

  public get currentItem(): CargoItem | undefined {
    return this.definition.deliveries[this.completedDeliveries];
  }

  public get residentDelaySeconds(): number {
    if (this.definition.garbage) return 0;
    if (this.phase !== 'servicing' || this.action !== 'resident-arriving') return 0;
    return Math.max(0, this.actionElapsed - SERVICE.residentTravelSeconds - SERVICE.delayGraceSeconds) / SERVICE.deliverySpeedMultiplier;
  }

  public update(observation: StationObservation, dt: number): void {
    this.warningTimer = Math.max(0, this.warningTimer - dt);
    const distance = Math.hypot(
      observation.vehicleX - this.definition.stop.x,
      observation.vehicleY - this.definition.stop.y,
    );
    const docking = this.definition.stop.docking;
    const headingError = docking ? Math.abs(Math.atan2(Math.sin((observation.vehicleRotation ?? 0) - docking.heading), Math.cos((observation.vehicleRotation ?? 0) - docking.heading))) : 0;
    const dx = observation.vehicleX - this.definition.stop.x;
    const dy = observation.vehicleY - this.definition.stop.y;
    const insideStop = docking
      ? Math.abs(dx * Math.cos(docking.heading) + dy * Math.sin(docking.heading)) <= docking.halfLength
        && Math.abs(-dx * Math.sin(docking.heading) + dy * Math.cos(docking.heading)) <= docking.halfWidth
        && headingError <= docking.headingTolerance
      : distance <= this.definition.stop.radius;
    const safelyStopped = observation.vehicleSpeed <= 7;
    const workRate = this.clamp(observation.crewEfficiency ?? 1, 0.5, 1);
    this.workRate = workRate;

    if (this.departureLocked && observation.attemptingToDrive) this.warningTimer = 1.4;

    switch (this.phase) {
      case 'approaching':
        if (insideStop && !observation.dockingBlocked) this.phase = 'stopping';
        break;
      case 'stopping':
        if (!insideStop || observation.dockingBlocked) {
          this.phase = 'approaching';
          this.stopTimer = 0;
        } else if (safelyStopped) {
          this.stopTimer += dt;
          if (this.stopTimer >= 0.75) this.beginService();
        } else {
          this.stopTimer = 0;
        }
        break;
      case 'servicing':
        this.updateService(dt, workRate);
        break;
      case 'organizing':
        this.updateOrganizing(dt, workRate);
        break;
      case 'ready':
        if (distance > this.definition.stop.exitRadius) this.phase = 'departed';
        break;
      case 'departed':
        break;
    }
  }

  /** Tracks the current batch all the way to insertion into the sorting basket. */
  public getDeliveryProgress(): Readonly<{ completed: number; total: number; progress: number; remainingSeconds: number; nextResident?: number; finished: boolean }> {
    const total = this.definition.deliveries.length;
    const completed = Math.min(this.completedDeliveries, total);
    if (completed === total) return { completed, total, progress: 1, remainingSeconds: 0, finished: true };
    const arrivalDuration = SERVICE.residentTravelSeconds + (this.definition.residentDelays?.[completed] ?? 0);
    const actions = Object.keys(SERVICE.workerActionSeconds) as (keyof typeof SERVICE.workerActionSeconds)[];
    const workDuration = actions.reduce((sum, action) => sum + ACTION_DURATION[action], 0);
    const arriving = this.action === 'resident-arriving';
    const elapsedWork = arriving ? 0 : actions.slice(0, actions.indexOf(this.action as typeof actions[number])).reduce((sum, action) => sum + ACTION_DURATION[action], 0) + this.actionElapsed;
    const elapsedArrival = arriving ? Math.min(arrivalDuration, this.actionElapsed) : arrivalDuration;
    return {
      completed, total, nextResident: completed + 1, finished: false,
      progress: this.clamp((elapsedArrival + elapsedWork) / (arrivalDuration + workDuration), 0, 1),
      remainingSeconds: (Math.max(0, arrivalDuration - elapsedArrival) + Math.max(0, workDuration - elapsedWork) / this.workRate) / SERVICE.deliverySpeedMultiplier,
    };
  }

  public getResidents(): readonly ResidentSnapshot[] {
    if (this.definition.garbage) return [];
    return this.definition.deliveries.map((item, index) => {
      const entranceProgress = this.clamp((this.serviceElapsed - index * 0.45) / 0.75, 0, 1);
      const completed = index < this.completedDeliveries;
      const atFront = index === this.completedDeliveries;
      const handedOver = atFront && (this.action === 'carrying' || this.action === 'sorting');
      const handoffProgress = atFront
        ? this.action === 'resident-arriving'
          ? this.clamp(this.actionElapsed / SERVICE.residentTravelSeconds, 0, 1)
          : 1
        : 0;
      return {
        item,
        completed,
        visible: this.serviceElapsed > index * 0.45 && !completed && !handedOver && this.phase !== 'departed',
        queueIndex: Math.max(0, index - this.completedDeliveries),
        entranceProgress,
        handoffProgress,
        hasItem: !handedOver,
      };
    });
  }

  public getStatusText(): string {
    if (this.capacityBlocked) return '⚠ 車斗容量不足，無法接收下一件回收物';
    if (this.warningTimer > 0) return '⚠ 隨車人員尚未安全就位，禁止離站';
    switch (this.phase) {
      case 'approaching': return `前往${this.definition.name}`;
      case 'stopping': return this.stopTimer > 0 ? '保持停車，準備收運' : '靠右停入黃色區，車頭朝上並完全停車';
      case 'servicing': {
        if (this.tossing) return `投擲垃圾袋（${this.tossing.processed}/${this.tossing.bags.length}）· 成功 ${this.tossing.hits} 包`;
        if (this.sorting && this.completedDeliveries >= this.definition.deliveries.length) return `分類剩餘 ${this.sorting.pending.length} 件，完成後整理車斗`;
        const item = this.currentItem;
        return item ? `收運中：${RECYCLING_LABELS[item.type]}（${this.completedDeliveries + 1}/${this.definition.deliveries.length}）` : '收運完成';
      }
      case 'organizing': return this.workerState === 'returning' ? '隨車人員正在安全就位' : this.definition.garbage ? '壓縮垃圾中，請稍候' : '整理並固定車斗回收物';
      case 'ready': return '✓ 作業完成，可以安全離站';
      case 'departed': return `✓ ${this.definition.name}收運完成`;
    }
  }

  private beginService(): void {
    if (this.definition.garbage) this.tossing = new TossQueue(Math.random, true);
    this.phase = 'servicing';
    this.workerState = 'waiting';
    this.action = 'resident-arriving';
    this.actionElapsed = 0;
  }

  private updateService(dt: number, workRate: number): void {
    this.serviceElapsed += dt;
    if (this.tossing) {
      this.workerState = 'waiting';
      const hit = this.tossing.update(dt);
      if (hit) {
        const size = TOSS.bagSizes[hit.size];
        this.cargo.addGarbage(size.volume, size.weight);
      }
      this.completedDeliveries = this.tossing.processed;
      if (this.tossing.complete) { this.phase = 'organizing'; this.workerState = 'organizing'; this.workerProgress = 0; }
      return;
    }
    if (this.sorting && this.completedDeliveries >= this.definition.deliveries.length) {
      this.workerState = 'waiting';
      if (this.sorting.pending.length === 0) { this.phase = 'organizing'; this.workerState = 'organizing'; this.workerProgress = 0; }
      return;
    }
    // Residents have their own clock; worker efficiency must not make residents slower.
    this.actionElapsed += dt * SERVICE.deliverySpeedMultiplier * (this.action === 'resident-arriving' ? 1 : workRate);
    const duration = this.action === 'resident-arriving'
      ? SERVICE.residentTravelSeconds + (this.definition.residentDelays?.[this.completedDeliveries] ?? 0)
      : ACTION_DURATION[this.action];
    this.workerProgress = this.clamp(this.actionElapsed / duration, 0, 1);

    if (this.action === 'resident-arriving') this.workerState = 'waiting';
    else this.workerState = this.action;

    if (this.actionElapsed < duration) return;

    if (this.action === 'sorting') {
      const item = this.currentItem;
      if (this.sorting) this.sorting.deliver(this.definition.sortingBatches![this.completedDeliveries]);
      else if (item && !this.cargo.add(item)) {
        this.capacityBlocked = true;
        this.actionElapsed = 0;
        return;
      }
      this.capacityBlocked = false;
      this.completedDeliveries += 1;
      if (this.completedDeliveries >= this.definition.deliveries.length) {
        if (this.sorting) { this.workerState = 'waiting'; return; }
        this.phase = 'organizing';
        this.workerState = 'organizing';
        this.workerProgress = 0;
        return;
      }
    }

    this.action = this.nextAction(this.action);
    this.actionElapsed = 0;
    this.workerProgress = 0;
  }

  private updateOrganizing(dt: number, workRate: number): void {
    this.organizingElapsed += dt * workRate;
    const compression = this.definition.garbage ? TOSS.compressionSeconds : 1.6;
    const returning = this.definition.garbage ? TOSS.crewReturnSeconds : 0.8;
    if (this.organizingElapsed < compression) {
      this.workerState = 'organizing';
      this.workerProgress = this.organizingElapsed / compression;
      return;
    }
    this.workerState = 'returning';
    this.workerProgress = this.clamp((this.organizingElapsed - compression) / returning, 0, 1);
    if (this.organizingElapsed >= compression + returning) {
      this.workerState = 'riding';
      this.workerProgress = 1;
      this.phase = 'ready';
    }
  }

  private nextAction(action: ServiceAction): ServiceAction {
    switch (action) {
      case 'resident-arriving': return 'moving-to-tail';
      case 'moving-to-tail': return 'receiving';
      case 'receiving': return 'carrying';
      case 'carrying': return 'sorting';
      case 'sorting': return 'resident-arriving';
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
