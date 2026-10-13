import Phaser from 'phaser';
import { Autopilot } from '../game/Autopilot';
import { readDifficulty } from '../ui/Difficulty';
import { AutoDrivePanel } from '../ui/AutoDrivePanel';
import { isCurvedBay } from '../game/CollectionBay';
import { CURVED_BAY, DISPLAY, NAVIGATION, SIDEWALK, STREET, TRAFFIC, WORLD } from '../config/balance';
import { POTHOLES } from '../config/hazards';
import { ROAD_EDGES, ROAD_NODES } from '../config/roads';
import { GARBAGE_STATIONS, ROUTE_STATIONS } from '../config/stations';
import { STATIC_OBSTACLES } from '../config/street';
import { CollisionWorld, truckBody } from '../game/CollisionWorld';
import { signalColor, TrafficSystem } from '../game/TrafficSystem';
import { CargoHold, type RecyclingType } from '../game/CargoHold';
import { CrewDynamics, type CrewReaction } from '../game/CrewDynamics';
import { FixedStepClock } from '../game/FixedStepClock';
import { PotholeSystem } from '../game/PotholeSystem';
import { SurfaceSystem } from '../game/SurfaceSystem';
import { RoadGraph, type RoutePoint } from '../game/RoadGraph';
import { RouteMission } from '../game/RouteMission';
import { Vehicle } from '../game/Vehicle';
import { DrivingControls } from '../ui/DrivingControls';
import { Hud } from '../ui/Hud';
import { SortingPanel } from '../ui/SortingPanel';
import { IntroPanel } from '../ui/IntroPanel';
import { TossPanel } from '../ui/TossPanel';
import { readGameMode } from '../ui/GameMode';
import { consumeFailureRestart } from '../ui/RestartPolicy';
import { gameAssets } from '../ui/GameAssets';
import { drawStreetArt } from './StreetArt';
import { drawCrewExpression, drawPerson, drawTruckBody, drawGarbageTruckBody, drawCargoPile, RECYCLING_COLORS } from './TruckArt';
import { TrafficArt } from './TrafficArt';

export class GameScene extends Phaser.Scene {
  private readonly mode = readGameMode();
  private readonly difficulty = readDifficulty();
  private readonly autopilot = new Autopilot();
  private autoDrivePanel?: AutoDrivePanel;
  private readonly stations = this.mode === 'garbage' ? GARBAGE_STATIONS : ROUTE_STATIONS;
  private readonly vehicle = new Vehicle();
  private readonly clock = new FixedStepClock();
  private readonly cargo = new CargoHold(180, 140);
  private readonly crew = new CrewDynamics();
  private readonly surface = new SurfaceSystem(this.stations);
  private sidewalkActive = false;
  private sidewalkMoving = false;
  private readonly potholes = new PotholeSystem(POTHOLES);
  private readonly roads = new RoadGraph(ROAD_NODES, ROAD_EDGES);
  private readonly mission = new RouteMission(this.stations, this.cargo, this.roads);
  private readonly traffic = new TrafficSystem();
  private readonly collisions = new CollisionWorld(STATIC_OBSTACLES);
  private trafficArt!: TrafficArt;
  private collisionWarningSeconds = 0;
  private collisionLabel = '';
  private truck!: Phaser.GameObjects.Container;
  private attendantA!: Phaser.GameObjects.Container;
  private attendantB!: Phaser.GameObjects.Container;
  private cargoLayer!: Phaser.GameObjects.Graphics;
  private carriedItem!: Phaser.GameObjects.Graphics;
  private reactionText!: Phaser.GameObjects.Text;
  private crewFace!: Phaser.GameObjects.Graphics;
  private cameraTarget!: Phaser.GameObjects.Zone;
  private stopMarker!: Phaser.GameObjects.Graphics;
  private navigationLayer!: Phaser.GameObjects.Graphics;
  private residents: Phaser.GameObjects.Container[] = [];
  private residentItems: Phaser.GameObjects.Graphics[] = [];
  private controls!: DrivingControls;
  private pendingImpact = 0;
  private hud = new Hud();
  private sortingPanel = new SortingPanel();
  private tossingPanel = new TossPanel();
  private hudElapsedMs = 100;
  private intro!: IntroPanel;

  public constructor() { super('GameScene'); }

  public create(): void {
    document.body.dataset.gameMode = this.mode;
    document.body.dataset.difficulty = this.difficulty;
    document.title = this.mode === 'garbage' ? '街頭垃圾車｜甩袋收運' : '街頭回收隊｜台灣資源回收車';
    document.querySelector('#game')?.setAttribute('aria-label', this.mode === 'garbage' ? '垃圾壓縮車遊戲' : '資源回收車遊戲');
    // Keep route-space rules intact; rotate the entire world into a north-up display.
    this.cameras.main.setRotation(DISPLAY.roadRotation);
    const resizeCamera = () => this.cameras.main.setZoom(Math.min(DISPLAY.maxZoom, this.scale.width / DISPLAY.visibleStreetWidth));
    resizeCamera();
    this.scale.on('resize', resizeCamera);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', resizeCamera));
    drawStreetArt(this);
    this.navigationLayer = this.add.graphics();
    this.stopMarker = this.add.graphics();
    this.trafficArt = new TrafficArt(this, this.traffic);
    this.createResidents();
    this.truck = this.createTruck();
    this.cameraTarget = this.add.zone(this.vehicle.x, this.vehicle.y, 1, 1);
    this.controls = new DrivingControls(this.input.keyboard!);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
    this.updateStationVisuals();
    this.updateAttendants();
    this.updateCargoVisuals();
    this.trafficArt.update(this.traffic);
    this.intro = new IntroPanel(() => {
      this.controls.reset();
      window.dispatchEvent(new Event('gta-input-reset'));
    }, consumeFailureRestart(), gameAssets, this.mode, this.difficulty);
    if (this.difficulty === 'easy') {
      this.autoDrivePanel = new AutoDrivePanel(this.autopilot, () => this.intro.started && !this.mission.ended && !this.mission.activeCycle?.departureLocked);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.autoDrivePanel?.destroy());
    }
  }

  public update(_time: number, deltaMs: number): void {
    if (!this.intro.started) return;
    const wasEnded = this.mission.ended;
    const sortingActive = !this.mission.ended && Boolean((this.mission.activeCycle?.sorting || this.mission.activeCycle?.tossing) && this.mission.activeCycle.departureLocked);
    const input = sortingActive || this.mission.ended ? { throttle: 0, steering: 0, brake: false } : this.controls.read();
    this.clock.advance(deltaMs / 1000, (dt) => {
      this.mission.checkCrewAnger(this.crew.anger);
      if (this.mission.ended) { this.vehicle.park(); return; }
      for (const command of this.sortingPanel.takeCommands()) {
        if (command.queue === this.mission.activeCycle?.sorting && this.mission.activeCycle.departureLocked) {
          this.sortingPanel.feedback(command.queue.place(command.instanceId, command.target));
        }
      }
      for (const command of this.tossingPanel.takeCommands()) {
        if (command.queue === this.mission.activeCycle?.tossing && this.mission.activeCycle.phase === 'servicing') {
          command.queue.launch(command.bagId, command.gesture);
        }
      }
      const stepInput = this.difficulty === 'easy' ? this.autopilot.read({
        vehicle: this.vehicle, cycle: this.mission.activeCycle,
        obstacles: [...this.traffic.getObstacles(), ...STATIC_OBSTACLES],
        trafficSeconds: this.traffic.elapsedSeconds, ended: this.mission.ended,
      }) : input;
      const { throttle, steering } = stepInput;
      const servicingCycle = this.mission.activeCycle;
      const wasOrganizing = servicingCycle?.phase === 'organizing';
      this.mission.update({
        vehicleX: this.vehicle.x,
        vehicleY: this.vehicle.y,
        vehicleSpeed: this.vehicle.speed,
        vehicleRotation: this.vehicle.rotation,
        attemptingToDrive: throttle !== 0,
        crewEfficiency: this.crew.efficiency,
      }, this.crew.anger, dt);
      const stationJustCompleted = wasOrganizing && servicingCycle?.phase === 'ready';
      const parked = Boolean(this.mission.activeCycle?.departureLocked) || this.mission.ended;
      if (parked) this.vehicle.park();
      else this.vehicle.update({ throttle, steering, brake: stepInput.brake }, dt);
      this.collisionWarningSeconds = Math.max(0, this.collisionWarningSeconds - dt);
      let collisionImpact = 0;
      if (!this.mission.ended) this.traffic.update(dt, truckBody(this.vehicle), this.difficulty === 'easy' ? this.autopilot.merging : undefined);
      if (!this.mission.ended) {
        const collision = this.collisions.resolve(this.vehicle, this.traffic.getObstacles());
        this.traffic.stopContacts(collision.contacts);
        if (collision.fatalContact) {
          this.mission.fail('collision', collision.fatalContact.label);
          this.vehicle.park();
        }
        if (collision.impactSpeed > TRAFFIC.minimumImpactSpeed) {
          collisionImpact = Math.min(1, collision.impactSpeed / TRAFFIC.impactReferenceSpeed);
          this.collisionLabel = `碰撞：${collision.label}，請減速並保持車距`;
          this.collisionWarningSeconds = TRAFFIC.collisionWarningSeconds;
          this.pendingImpact = Math.max(this.pendingImpact, collisionImpact);
        }
      }
      const surface = this.mission.ended ? undefined : this.surface.update(this.vehicle, dt);
      this.sidewalkActive = Boolean(surface?.onSidewalk);
      this.sidewalkMoving = Boolean(surface?.moving);
      if (surface) this.pendingImpact = Math.max(this.pendingImpact, Math.max(surface.curbImpact, surface.bumpImpact) * SIDEWALK.shakeGain);
      const impact = this.potholes.update(this.vehicle.x, this.vehicle.y, this.vehicle.speed);
      this.pendingImpact = Math.max(this.pendingImpact, impact);
      if (!this.mission.ended) this.crew.update(this.vehicle.telemetry, impact, dt, {
        steeringInput: steering,
        residentDelaySeconds: this.mission.activeCycle?.residentDelaySeconds ?? 0,
        collisionImpact,
        surface,
      });
      this.mission.checkCrewAnger(this.crew.anger);
      if (!this.mission.ended && stationJustCompleted) this.crew.finishStation();
      if (this.mission.ended) this.vehicle.park();
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
    this.trafficArt.update(this.traffic);
    const touchMode = document.body.dataset.controls === 'touch';
    const lookAheadSeconds = touchMode ? DISPLAY.touchLookAheadSeconds : 0.42;
    const touchCameraOffset = touchMode ? this.scale.height * DISPLAY.touchCameraOffsetRatio / this.cameras.main.zoom : 0;
    const targetX = this.vehicle.x + this.vehicle.velocityX * lookAheadSeconds - touchCameraOffset;
    const targetY = this.vehicle.y + this.vehicle.velocityY * lookAheadSeconds;
    const cameraBlend = 1 - Math.exp(-6 * Math.min(deltaMs / 1000, WORLD.maxFrameSeconds));
    this.cameraTarget.setPosition(
      Phaser.Math.Linear(this.cameraTarget.x, targetX, cameraBlend),
      Phaser.Math.Linear(this.cameraTarget.y, targetY, cameraBlend),
    );
    const activeStation = this.mission.activeStation;
    const activeCycle = this.mission.activeCycle;
    if (sortingActive !== (!this.mission.ended && Boolean((activeCycle?.sorting || activeCycle?.tossing) && activeCycle.departureLocked)) || wasEnded !== this.mission.ended) this.controls.reset();
    document.body.dataset.missionEnded = String(this.mission.ended);
    this.sortingPanel.update(this.mission.ended ? undefined : activeCycle);
    this.tossingPanel.update(this.mission.ended ? undefined : activeCycle, this.mission.getTossStats());
    // DOM panels refresh at 10Hz; world rendering and fixed-step rules stay unchanged.
    this.hudElapsedMs += deltaMs;
    if (wasEnded !== this.mission.ended) this.hudElapsedMs = 100;
    if (this.hudElapsedMs < 100) return;
    this.hudElapsedMs %= 100;
    const nextSignal = this.traffic.nextSignal(this.vehicle.x);
    const color = nextSignal ? signalColor(nextSignal, this.traffic.elapsedSeconds) : undefined;
    const signalDistance = nextSignal ? Math.round(Math.max(0, nextSignal.x - TRAFFIC.stopLineOffset - this.vehicle.x) * NAVIGATION.metersPerPixel) : 0;
    this.autoDrivePanel?.update();
    this.hud.update({
      mode: this.mode,
      difficulty: this.difficulty,
      tossing: this.mode === 'garbage' ? this.mission.getTossStats() : undefined,
      speed: this.vehicle.speed,
      lateralSpeed: this.vehicle.telemetry.lateralSpeed,
      distanceMeters: navigation.remainingMeters,
      status: this.mission.failed ? '任務失敗，收運中止' : this.collisionWarningSeconds > 0 ? this.collisionLabel : this.sidewalkActive ? this.sidewalkMoving ? '⚠ 人行道顛簸，怒氣快速累積！請駛回道路' : '⚠ 車輪在人行道上，請駛回道路' : this.difficulty === 'easy' && !activeCycle?.departureLocked ? this.autopilot.status : activeCycle?.getStatusText() ?? '✓ 三站路線全部完成',
      servicePhase: activeCycle?.phase,
      urgentWarning: this.collisionWarningSeconds > 0 || this.sidewalkActive,
      cargoVolume: this.cargo.volume,
      maxCargoVolume: this.cargo.maxVolume,
      cargoWeight: this.cargo.weight,
      maxCargoWeight: this.cargo.maxWeight,
      crewAnger: this.crew.anger,
      crewEfficiency: this.crew.efficiency,
      crewReaction: this.reactionLabel(this.crew.reaction),
      angerReason: this.crew.irritationCause,
      stationName: activeStation?.name ?? '任務完成',
      stationNumber: this.mission.currentStationIndex + 1,
      stationCount: this.stations.length,
      etaSeconds: navigation.etaSeconds,
      scheduledTime: navigation.scheduledTime,
      delaySeconds: navigation.delaySeconds,
      settlement: this.mission.getSettlement(),
      failure: this.mission.getFailure(),
      vehicleX: this.vehicle.x,
      vehicleY: this.vehicle.y,
      vehicleRotation: this.vehicle.rotation,
      navigationPath: navigation.path,
      signalColor: color,
      signalDistance,
    });
  }

  private createTruck(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    if (this.mode === 'garbage') drawGarbageTruckBody(g);
    else drawTruckBody(g);
    this.cargoLayer = this.add.graphics();
    this.attendantA = this.createAttendant(-42, -14, 0x315b78);
    this.carriedItem = this.add.graphics();
    this.attendantA.add(this.carriedItem);
    this.attendantB = this.createAttendant(-67, 13, 0x476e3d);
    this.reactionText = this.add.text(-57, -52, '', {
      fontFamily: 'monospace',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#ffef8a',
      backgroundColor: '#1b2229dd',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    this.crewFace = this.add.graphics();
    return this.add.container(this.vehicle.x, this.vehicle.y, [g, this.cargoLayer, this.attendantA, this.attendantB, this.reactionText, this.crewFace]);
  }

  private createAttendant(x: number, y: number, shirtColor: number): Phaser.GameObjects.Container {
    const person = this.add.graphics();
    drawPerson(person, shirtColor, true);
    return this.add.container(x, y, [person]);
  }

  private createResidents(): void {
    const colors = [0xa84c45, 0x6e55a4, 0x3c7d63, 0xb57435];
    const maxResidents = Math.max(0, ...this.stations.map((station) => station.deliveries.length));
    this.residents = Array.from({ length: maxResidents }, (_, index) => {
      const person = this.add.graphics();
      drawPerson(person, colors[index]);
      const item = this.add.graphics();
      this.residentItems.push(item);
      return this.add.container(0, 0, [person, item]).setRotation(DISPLAY.uprightRotation).setVisible(false);
    });
  }

  private updateNavigation(path: readonly RoutePoint[]): void {
    this.navigationLayer.clear();
    if (path.length < 2) return;
    this.navigationLayer.lineStyle(6, 0x56d8e8, 0.55).beginPath().moveTo(path[0].x, path[0].y);
    for (let index = 1; index < path.length; index += 1) this.navigationLayer.lineTo(path[index].x, path[index].y);
    this.navigationLayer.strokePath();
    for (let index = 1; index < path.length; index += 1) {
      if (index !== path.length - 1 && Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y) <= CURVED_BAY.sampleSpacing * 2) continue;
      this.navigationLayer.fillStyle(index === path.length - 1 ? 0xf1c84c : 0x56d8e8, 0.9).fillCircle(path[index].x, path[index].y, index === path.length - 1 ? 9 : 5);
    }
  }

  private updateStationVisuals(): void {
    this.stopMarker.clear();
    this.stations.forEach((station, index) => {
      const completed = index < this.mission.currentStationIndex;
      const active = index === this.mission.currentStationIndex;
      const ready = active && (this.mission.activeCycle?.phase === 'ready' || this.mission.activeCycle?.phase === 'departed');
      const color = completed || ready ? 0x5ec76f : active ? 0xf1c84c : 0x70818d;
      const width = (isCurvedBay(station.stop) ? CURVED_BAY.stopHalfLength : STREET.bayHalfLength) * 2;
      const height = STREET.bayHalfWidth * 2;
      this.stopMarker.fillStyle(color, active || completed ? 0.15 : 0.07).fillRect(station.stop.x - width / 2, station.stop.y - height / 2, width, height);
      this.stopMarker.lineStyle(active ? 4 : 2, color, active || completed ? 0.95 : 0.45).strokeRoundedRect(station.stop.x - width / 2, station.stop.y - height / 2, width, height, isCurvedBay(station.stop) ? 12 : 0);
      this.stopMarker.lineStyle(2, color, 0.5).strokeRect(station.stop.x - STREET.dockingHalfLength, station.stop.y - STREET.dockingHalfWidth, STREET.dockingHalfLength * 2, STREET.dockingHalfWidth * 2);
      this.stopMarker.fillStyle(color).fillTriangle(station.stop.x + 40, station.stop.y - 6, station.stop.x + 40, station.stop.y + 6, station.stop.x + 53, station.stop.y);
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
      if (snapshot.queueIndex === 0) {
        const cos = Math.cos(this.vehicle.rotation);
        const sin = Math.sin(this.vehicle.rotation);
        const tailX = this.vehicle.x - 117 * cos + 14 * sin;
        const tailY = this.vehicle.y - 117 * sin - 14 * cos;
        resident.setPosition(
          Phaser.Math.Linear(resident.x, tailX, snapshot.handoffProgress),
          Phaser.Math.Linear(resident.y, tailY, snapshot.handoffProgress),
        );
      }
      this.residentItems[index].clear().fillStyle(this.recyclingColor(snapshot.item.type)).fillRect(10, 7, 12, 12);
      this.residentItems[index].setVisible(snapshot.hasItem);
    });
  }

  private updateAttendants(): void {
    const state = this.mission.activeCycle?.workerState ?? 'riding';
    const p = this.smoothStep(this.mission.activeCycle?.workerProgress ?? 0);
    const riding = { x: -42, y: -14 };
    const tail = { x: -103, y: -14 };
    const sorting = { x: -62, y: 8 };
    const waitingPosition = (this.mission.activeCycle?.completedDeliveries ?? 0) > 0 ? sorting : riding;
    let target = state === 'waiting' ? waitingPosition : riding;

    if (state === 'moving-to-tail') target = this.mixPoint(waitingPosition, tail, p);
    else if (state === 'receiving') target = tail;
    else if (state === 'carrying') target = this.mixPoint(tail, sorting, p);
    else if (state === 'sorting' || state === 'organizing') target = sorting;
    else if (state === 'returning') target = this.mixPoint(sorting, riding, p);

    const ridingSway = state === 'riding' || state === 'waiting' ? 1 : 0.25;
    const swayX = this.crew.swayForward * 8 * ridingSway;
    const swayY = this.crew.swayLateral * 10 * ridingSway;
    this.attendantA.setPosition(target.x + swayX, target.y + swayY);
    if (this.mode === 'garbage') {
      const atTail = state === 'waiting' || state === 'organizing';
      const boarding = state === 'returning' ? p : atTail ? 0 : 1;
      this.attendantA.setPosition(Phaser.Math.Linear(-117, -94, boarding) + swayX, Phaser.Math.Linear(-41, -30, boarding) + swayY);
    }
    const item = this.mission.activeCycle?.currentItem;
    this.carriedItem.clear();
    if (item && (state === 'carrying' || state === 'sorting')) {
      this.carriedItem.fillStyle(this.recyclingColor(item.type)).fillRect(-6, -12, 12, 12);
    }
    const helperMoving = state === 'organizing';
    this.attendantB.setPosition(
      (helperMoving ? -68 + Math.sin(p * Math.PI * 2) * 18 : -67) + swayX,
      (helperMoving ? 13 - p * 12 : 13) + swayY,
    );
    if (this.mode === 'garbage') {
      const atTail = state === 'waiting' || state === 'organizing';
      const boarding = state === 'returning' ? p : atTail ? 0 : 1;
      this.attendantB.setPosition(Phaser.Math.Linear(-117, -94, boarding) + swayX, Phaser.Math.Linear(41, 30, boarding) + swayY);
    }
    const reaction = { calm: '', annoyed: '…', angry: '!', furious: '怒' }[this.crew.reaction];
    const mobile = document.body.dataset.device === 'mobile';
    this.reactionText.setText(reaction).setVisible(!mobile && reaction !== '');
    this.reactionText.setRotation(DISPLAY.uprightRotation - this.vehicle.rotation);
    this.crewFace.setVisible(mobile);
    if (mobile) {
      this.crewFace.setPosition(this.attendantA.x + DISPLAY.crewFaceOffset, this.attendantA.y);
      this.crewFace.setRotation(DISPLAY.uprightRotation - this.vehicle.rotation);
      drawCrewExpression(this.crewFace, this.crew.reaction);
    }
  }

  private updateCargoVisuals(): void {
    if (this.mode === 'garbage') { this.cargoLayer.clear(); return; }
    drawCargoPile(this.cargoLayer, this.cargo.counts);
  }

  private recyclingColor(type: RecyclingType): number {
    return RECYCLING_COLORS[type];
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
