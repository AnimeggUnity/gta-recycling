import Phaser from 'phaser';
import { WORLD } from '../config/balance';
import { POTHOLES } from '../config/hazards';
import { ROAD_EDGES, ROAD_NODES } from '../config/roads';
import { ROUTE_STATIONS } from '../config/stations';
import { CargoHold, type RecyclingType } from '../game/CargoHold';
import { CrewDynamics, type CrewReaction } from '../game/CrewDynamics';
import { FixedStepClock } from '../game/FixedStepClock';
import { PotholeSystem } from '../game/PotholeSystem';
import { RoadGraph, type RoutePoint } from '../game/RoadGraph';
import { RouteMission } from '../game/RouteMission';
import { Vehicle } from '../game/Vehicle';
import { DrivingControls } from '../ui/DrivingControls';
import { Hud } from '../ui/Hud';

export class GameScene extends Phaser.Scene {
  private readonly vehicle = new Vehicle();
  private readonly clock = new FixedStepClock();
  private readonly cargo = new CargoHold(180, 140);
  private readonly crew = new CrewDynamics();
  private readonly potholes = new PotholeSystem(POTHOLES);
  private readonly roads = new RoadGraph(ROAD_NODES, ROAD_EDGES);
  private readonly mission = new RouteMission(ROUTE_STATIONS, this.cargo, this.roads);
  private truck!: Phaser.GameObjects.Container;
  private attendantA!: Phaser.GameObjects.Container;
  private attendantB!: Phaser.GameObjects.Container;
  private cargoLayer!: Phaser.GameObjects.Graphics;
  private reactionText!: Phaser.GameObjects.Text;
  private cameraTarget!: Phaser.GameObjects.Zone;
  private stopMarker!: Phaser.GameObjects.Graphics;
  private navigationLayer!: Phaser.GameObjects.Graphics;
  private residents: Phaser.GameObjects.Container[] = [];
  private residentItems: Phaser.GameObjects.Graphics[] = [];
  private controls!: DrivingControls;
  private pendingImpact = 0;
  private hud = new Hud();

  public constructor() { super('GameScene'); }

  public create(): void {
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setZoom(1.1);
    this.drawStreet();
    this.navigationLayer = this.add.graphics();
    this.stopMarker = this.add.graphics();
    this.createResidents();
    this.truck = this.createTruck();
    this.cameraTarget = this.add.zone(this.vehicle.x, this.vehicle.y, 1, 1);
    this.controls = new DrivingControls(this.input.keyboard!);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
  }

  public update(_time: number, deltaMs: number): void {
    const input = this.controls.read();
    const { throttle, steering } = input;
    this.clock.advance(deltaMs / 1000, (dt) => {
      this.mission.update({
        vehicleX: this.vehicle.x,
        vehicleY: this.vehicle.y,
        vehicleSpeed: this.vehicle.speed,
        attemptingToDrive: throttle !== 0,
        crewEfficiency: this.crew.efficiency,
      }, this.crew.anger, dt);
      const safetyBrake = Boolean(this.mission.activeCycle?.departureLocked && throttle !== 0);
      this.vehicle.update({
        throttle: safetyBrake ? 0 : throttle,
        steering,
        brake: input.brake || safetyBrake,
      }, dt);
      const impact = this.potholes.update(this.vehicle.x, this.vehicle.y, this.vehicle.speed);
      this.pendingImpact = Math.max(this.pendingImpact, impact);
      this.crew.update(this.vehicle.telemetry, impact, dt);
    });
    const bounceScale = 1 + this.crew.bounce * 0.025;
    this.truck.setPosition(this.vehicle.x, this.vehicle.y).setRotation(this.vehicle.rotation).setScale(bounceScale);
    if (this.pendingImpact > 0) {
      this.cameras.main.shake(110, 0.0025 + this.pendingImpact * 0.004);
      this.pendingImpact = 0;
    }
    const navigation = this.mission.getNavigation({ x: this.vehicle.x, y: this.vehicle.y });
    this.updateNavigation(navigation.path);
    this.updateStationVisuals();
    this.updateAttendants();
    this.updateCargoVisuals();
    const lookAheadSeconds = 0.42;
    const targetX = this.vehicle.x + this.vehicle.velocityX * lookAheadSeconds;
    const targetY = this.vehicle.y + this.vehicle.velocityY * lookAheadSeconds;
    this.cameraTarget.setPosition(
      Phaser.Math.Linear(this.cameraTarget.x, targetX, 0.1),
      Phaser.Math.Linear(this.cameraTarget.y, targetY, 0.1),
    );
    const activeStation = this.mission.activeStation;
    const activeCycle = this.mission.activeCycle;
    this.hud.update({
      speed: this.vehicle.speed,
      lateralSpeed: this.vehicle.telemetry.lateralSpeed,
      distanceMeters: navigation.remainingMeters,
      status: activeCycle?.getStatusText() ?? '✓ 三站路線全部完成',
      cargoVolume: this.cargo.volume,
      maxCargoVolume: this.cargo.maxVolume,
      cargoWeight: this.cargo.weight,
      maxCargoWeight: this.cargo.maxWeight,
      crewAnger: this.crew.anger,
      crewEfficiency: this.crew.efficiency,
      crewReaction: this.reactionLabel(this.crew.reaction),
      stationName: activeStation?.name ?? '任務完成',
      stationNumber: this.mission.currentStationIndex + 1,
      stationCount: ROUTE_STATIONS.length,
      etaSeconds: navigation.etaSeconds,
      scheduledTime: navigation.scheduledTime,
      delaySeconds: navigation.delaySeconds,
      settlement: this.mission.getSettlement(),
    });
  }

  private drawStreet(): void {
    const g = this.add.graphics();
    g.fillStyle(0x87958b).fillRect(0, 0, WORLD.width, WORLD.height);
    g.fillStyle(0x3e454c).fillRect(0, 390, WORLD.width, 260);
    g.fillStyle(0x3e454c).fillRect(650, 0, 260, WORLD.height);
    g.lineStyle(4, 0xf7df76, 0.8).lineBetween(0, 520, WORLD.width, 520).lineBetween(780, 0, 780, WORLD.height);
    for (const pothole of POTHOLES) {
      g.fillStyle(0x20262b, 0.9).fillCircle(pothole.x, pothole.y, pothole.radius);
      g.lineStyle(2, 0x151a1d, 0.8).strokeCircle(pothole.x, pothole.y, pothole.radius + 3);
      g.fillStyle(0x343b40, 0.7).fillCircle(pothole.x - 4, pothole.y - 3, pothole.radius * 0.35);
    }
    for (const [x, y, w, h, color] of [[80, 80, 400, 230, 0xd97a5d], [1030, 90, 360, 250, 0x6a96b5], [120, 710, 390, 160, 0xf2c768], [1050, 710, 370, 150, 0xa97cba]] as const) {
      g.fillStyle(color).fillRect(x, y, w, h);
      g.fillStyle(0x252f38).fillRect(x + 18, y + 25, w - 36, 22);
    }
    const signs = [
      { x: 1080, y: 365, w: 220, name: ROUTE_STATIONS[0].name },
      { x: 1080, y: 285, w: 250, name: ROUTE_STATIONS[1].name },
      { x: 130, y: 260, w: 250, name: ROUTE_STATIONS[2].name },
    ];
    for (const sign of signs) {
      g.fillStyle(0xf8f2da).fillRect(sign.x, sign.y, sign.w, 42);
      this.add.text(sign.x + 12, sign.y + 11, sign.name, { fontFamily: 'monospace', fontSize: '16px', color: '#26313a' });
    }
    for (const station of ROUTE_STATIONS) {
      g.fillStyle(0x27323a).fillCircle(station.buildingExit.x, station.buildingExit.y, 13);
      this.add.text(station.buildingExit.x - 12, station.buildingExit.y - 7, '出口', { fontFamily: 'monospace', fontSize: '10px', color: '#f8f2da' });
    }
  }

  private createTruck(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    // Local +X is the forward direction. Cab and windshield therefore sit on the right.
    g.fillStyle(0x3c86a1).fillRect(-96, -30, 88, 60);
    g.lineStyle(3, 0xdde2d7).strokeRect(-96, -30, 88, 60);
    g.fillStyle(0xf2f2e9).fillRect(-8, -22, 50, 44);
    g.fillStyle(0x75b7cf).fillRect(20, -17, 13, 34);
    g.fillStyle(0xe7cb64).fillRect(38, -15, 5, 9).fillRect(38, 6, 5, 9);
    g.fillStyle(0x222a30).fillRect(11, -26, 14, 8).fillRect(11, 18, 14, 8).fillRect(-84, -35, 14, 8).fillRect(-84, 27, 14, 8);
    this.cargoLayer = this.add.graphics();
    this.attendantA = this.createAttendant(-42, -14, 0x315b78);
    this.attendantB = this.createAttendant(-67, 13, 0x476e3d);
    this.reactionText = this.add.text(-57, -52, '', {
      fontFamily: 'monospace',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#ffef8a',
      backgroundColor: '#1b2229dd',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    return this.add.container(this.vehicle.x, this.vehicle.y, [g, this.cargoLayer, this.attendantA, this.attendantB, this.reactionText]);
  }

  private createAttendant(x: number, y: number, shirtColor: number): Phaser.GameObjects.Container {
    const person = this.add.graphics();
    person.fillStyle(shirtColor).fillRect(-7, 4, 14, 15);
    person.fillStyle(0xf1b281).fillCircle(0, 0, 8);
    return this.add.container(x, y, [person]);
  }

  private createResidents(): void {
    const colors = [0xa84c45, 0x6e55a4, 0x3c7d63, 0xb57435];
    const maxResidents = Math.max(...ROUTE_STATIONS.map((station) => station.deliveries.length));
    this.residents = Array.from({ length: maxResidents }, (_, index) => {
      const person = this.add.graphics();
      person.fillStyle(colors[index]).fillRect(-8, 5, 16, 20);
      person.fillStyle(0xf1b281).fillCircle(0, 0, 8);
      const item = this.add.graphics();
      this.residentItems.push(item);
      return this.add.container(0, 0, [person, item]).setVisible(false);
    });
  }

  private updateNavigation(path: readonly RoutePoint[]): void {
    this.navigationLayer.clear();
    if (path.length < 2) return;
    this.navigationLayer.lineStyle(6, 0x56d8e8, 0.55).beginPath().moveTo(path[0].x, path[0].y);
    for (let index = 1; index < path.length; index += 1) this.navigationLayer.lineTo(path[index].x, path[index].y);
    this.navigationLayer.strokePath();
    for (let index = 1; index < path.length; index += 1) {
      this.navigationLayer.fillStyle(index === path.length - 1 ? 0xf1c84c : 0x56d8e8, 0.9).fillCircle(path[index].x, path[index].y, index === path.length - 1 ? 9 : 5);
    }
  }

  private updateStationVisuals(): void {
    this.stopMarker.clear();
    ROUTE_STATIONS.forEach((station, index) => {
      const completed = index < this.mission.currentStationIndex;
      const active = index === this.mission.currentStationIndex;
      const ready = active && (this.mission.activeCycle?.phase === 'ready' || this.mission.activeCycle?.phase === 'departed');
      const color = completed || ready ? 0x5ec76f : active ? 0xf1c84c : 0x70818d;
      const vertical = station.id === 'xinsheng-south-road';
      const width = vertical ? 80 : 156;
      const height = vertical ? 156 : 80;
      this.stopMarker.fillStyle(color, active || completed ? 0.15 : 0.07).fillRect(station.stop.x - width / 2, station.stop.y - height / 2, width, height);
      this.stopMarker.lineStyle(active ? 4 : 2, color, active || completed ? 0.95 : 0.45).strokeRect(station.stop.x - width / 2, station.stop.y - height / 2, width, height);
      this.stopMarker.fillStyle(color).fillCircle(station.stop.x, station.stop.y, active ? 7 : 4);
    });

    this.residents.forEach((resident) => resident.setVisible(false));
    const cycle = this.mission.activeCycle;
    const station = this.mission.activeStation;
    if (!cycle || !station) return;
    const snapshots = cycle.getResidents();
    snapshots.forEach((snapshot, index) => {
      const resident = this.residents[index];
      resident.setVisible(snapshot.visible);
      if (!snapshot.visible) return;
      const exitsHorizontally = Math.abs(station.buildingExit.x - station.queueStart.x) > Math.abs(station.buildingExit.y - station.queueStart.y);
      const queueX = station.queueStart.x + (exitsHorizontally ? 0 : snapshot.queueIndex * 30);
      const queueY = station.queueStart.y + (exitsHorizontally ? snapshot.queueIndex * 30 : 0);
      resident.setPosition(
        Phaser.Math.Linear(station.buildingExit.x, queueX, snapshot.entranceProgress),
        Phaser.Math.Linear(station.buildingExit.y, queueY, snapshot.entranceProgress),
      );
      this.residentItems[index].clear().fillStyle(this.recyclingColor(snapshot.item.type)).fillRect(10, 7, 12, 12);
    });
  }

  private updateAttendants(): void {
    const state = this.mission.activeCycle?.workerState ?? 'riding';
    const p = this.smoothStep(this.mission.activeCycle?.workerProgress ?? 0);
    const riding = { x: -42, y: -14 };
    const tail = { x: -103, y: -14 };
    const sorting = { x: -62, y: 8 };
    let target = riding;

    if (state === 'moving-to-tail') target = this.mixPoint(riding, tail, p);
    else if (state === 'receiving') target = tail;
    else if (state === 'carrying') target = this.mixPoint(tail, sorting, p);
    else if (state === 'sorting' || state === 'organizing') target = sorting;
    else if (state === 'returning') target = this.mixPoint(sorting, riding, p);

    const ridingSway = state === 'riding' || state === 'waiting' ? 1 : 0.25;
    const swayX = this.crew.swayForward * 8 * ridingSway;
    const swayY = this.crew.swayLateral * 10 * ridingSway;
    this.attendantA.setPosition(target.x + swayX, target.y + swayY);
    const helperMoving = state === 'organizing';
    this.attendantB.setPosition(
      (helperMoving ? -68 + Math.sin(p * Math.PI * 2) * 18 : -67) + swayX,
      (helperMoving ? 13 - p * 12 : 13) + swayY,
    );
    const reaction = { calm: '', annoyed: '…', angry: '!', furious: '怒' }[this.crew.reaction];
    this.reactionText.setText(reaction).setVisible(reaction !== '');
  }

  private updateCargoVisuals(): void {
    this.cargoLayer.clear();
    const types: RecyclingType[] = ['paper', 'plastic', 'metal', 'glass'];
    let slot = 0;
    for (const type of types) {
      for (let i = 0; i < this.cargo.counts[type]; i += 1) {
        const x = -87 + (slot % 4) * 17;
        const y = -23 + Math.floor(slot / 4) * 18;
        this.cargoLayer.fillStyle(this.recyclingColor(type)).fillRect(x, y, 13, 13);
        slot += 1;
      }
    }
  }

  private recyclingColor(type: RecyclingType): number {
    return { paper: 0xe8d49b, plastic: 0x67b8d6, metal: 0xaeb7bf, glass: 0x70b27c }[type];
  }

  private mixPoint(from: Readonly<{ x: number; y: number }>, to: Readonly<{ x: number; y: number }>, t: number): { x: number; y: number } {
    return { x: Phaser.Math.Linear(from.x, to.x, t), y: Phaser.Math.Linear(from.y, to.y, t) };
  }

  private smoothStep(value: number): number {
    return value * value * (3 - 2 * value);
  }

  private reactionLabel(reaction: CrewReaction): string {
    return { calm: '心情平穩', annoyed: '開始不耐煩', angry: '正在生氣', furious: '非常火大' }[reaction];
  }
}
