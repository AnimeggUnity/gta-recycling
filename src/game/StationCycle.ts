import type { CargoItem } from './CargoHold';
import { CargoHold, RECYCLING_LABELS } from './CargoHold';

export type StationPhase = 'approaching' | 'stopping' | 'servicing' | 'organizing' | 'ready' | 'departed';
export type WorkerState = 'riding' | 'waiting' | 'moving-to-tail' | 'receiving' | 'carrying' | 'sorting' | 'organizing' | 'returning';

type ServiceAction = Exclude<WorkerState, 'riding' | 'waiting' | 'organizing' | 'returning'> | 'resident-arriving';

export type StationDefinition = Readonly<{
  name: string;
  stop: Readonly<{ x: number; y: number; radius: number; exitRadius: number }>;
  deliveries: readonly CargoItem[];
}>;

export type StationObservation = Readonly<{
  vehicleX: number;
  vehicleY: number;
  vehicleSpeed: number;
  attemptingToDrive: boolean;
  crewEfficiency?: number;
}>;

export type ResidentSnapshot = Readonly<{
  visible: boolean;
  completed: boolean;
  queueIndex: number;
  entranceProgress: number;
  item: CargoItem;
}>;

const ACTION_DURATION: Record<ServiceAction, number> = {
  'resident-arriving': 1.1,
  'moving-to-tail': 0.7,
  receiving: 0.9,
  carrying: 1,
  sorting: 0.8,
};

export class StationCycle {
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

  public constructor(
    public readonly definition: StationDefinition,
    public readonly cargo: CargoHold,
  ) {}

  public get departureLocked(): boolean {
    return this.phase === 'servicing' || this.phase === 'organizing';
  }

  public get currentItem(): CargoItem | undefined {
    return this.definition.deliveries[this.completedDeliveries];
  }

  public get residentDelaySeconds(): number {
    if (this.phase !== 'servicing' || this.action !== 'resident-arriving') return 0;
    return Math.max(0, this.actionElapsed - 0.45);
  }

  public update(observation: StationObservation, dt: number): void {
    this.warningTimer = Math.max(0, this.warningTimer - dt);
    const distance = Math.hypot(
      observation.vehicleX - this.definition.stop.x,
      observation.vehicleY - this.definition.stop.y,
    );
    const insideStop = distance <= this.definition.stop.radius;
    const safelyStopped = observation.vehicleSpeed <= 7;
    const workRate = this.clamp(observation.crewEfficiency ?? 1, 0.5, 1);

    if (this.departureLocked && observation.attemptingToDrive) this.warningTimer = 1.4;

    switch (this.phase) {
      case 'approaching':
        if (insideStop) this.phase = 'stopping';
        break;
      case 'stopping':
        if (!insideStop) {
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

  public getResidents(): readonly ResidentSnapshot[] {
    return this.definition.deliveries.map((item, index) => {
      const entranceProgress = this.clamp((this.serviceElapsed - index * 0.45) / 0.75, 0, 1);
      const completed = index < this.completedDeliveries;
      return {
        item,
        completed,
        visible: this.serviceElapsed > index * 0.45 && !completed && this.phase !== 'departed',
        queueIndex: Math.max(0, index - this.completedDeliveries),
        entranceProgress,
      };
    });
  }

  public getStatusText(): string {
    if (this.warningTimer > 0) return '⚠ 隨車人員尚未安全就位，禁止離站';
    switch (this.phase) {
      case 'approaching': return `前往${this.definition.name}`;
      case 'stopping': return this.stopTimer > 0 ? '保持停車，準備收運' : '請在黃色停靠區內完全停車';
      case 'servicing': {
        const item = this.currentItem;
        return item ? `收運中：${RECYCLING_LABELS[item.type]}（${this.completedDeliveries + 1}/${this.definition.deliveries.length}）` : '收運完成';
      }
      case 'organizing': return this.workerState === 'returning' ? '隨車人員正在安全就位' : '整理並固定車斗回收物';
      case 'ready': return '✓ 作業完成，可以安全離站';
      case 'departed': return '✓ 和平東路收運完成';
    }
  }

  private beginService(): void {
    this.phase = 'servicing';
    this.workerState = 'waiting';
    this.action = 'resident-arriving';
    this.actionElapsed = 0;
  }

  private updateService(dt: number, workRate: number): void {
    this.serviceElapsed += dt;
    this.actionElapsed += dt * workRate;
    this.workerProgress = this.clamp(this.actionElapsed / ACTION_DURATION[this.action], 0, 1);

    if (this.action === 'resident-arriving') this.workerState = 'waiting';
    else this.workerState = this.action;

    if (this.actionElapsed < ACTION_DURATION[this.action]) return;

    if (this.action === 'sorting') {
      const item = this.currentItem;
      if (item && !this.cargo.add(item)) {
        this.warningTimer = 1.4;
        this.actionElapsed = 0;
        return;
      }
      this.completedDeliveries += 1;
      if (this.completedDeliveries >= this.definition.deliveries.length) {
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
    if (this.organizingElapsed < 1.6) {
      this.workerState = 'organizing';
      this.workerProgress = this.organizingElapsed / 1.6;
      return;
    }
    this.workerState = 'returning';
    this.workerProgress = this.clamp((this.organizingElapsed - 1.6) / 0.8, 0, 1);
    if (this.organizingElapsed >= 2.4) {
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
