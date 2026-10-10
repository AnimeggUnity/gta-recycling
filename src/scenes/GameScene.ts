import Phaser from 'phaser';
import { WORLD } from '../config/balance';
import { FixedStepClock } from '../game/FixedStepClock';
import { Vehicle } from '../game/Vehicle';
import { Hud } from '../ui/Hud';

export class GameScene extends Phaser.Scene {
  private readonly vehicle = new Vehicle();
  private readonly clock = new FixedStepClock();
  private truck!: Phaser.GameObjects.Container;
  private cameraTarget!: Phaser.GameObjects.Zone;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private brakeKey!: Phaser.Input.Keyboard.Key;
  private hud = new Hud();

  public constructor() { super('GameScene'); }

  public create(): void {
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setZoom(1.1);
    this.drawStreet();
    this.truck = this.createTruck();
    this.cameraTarget = this.add.zone(this.vehicle.x, this.vehicle.y, 1, 1);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.brakeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
  }

  public update(_time: number, deltaMs: number): void {
    this.clock.advance(deltaMs / 1000, (dt) => {
      this.vehicle.update({
        throttle: Number(this.cursors.up.isDown) - Number(this.cursors.down.isDown),
        steering: Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown),
        brake: this.brakeKey.isDown,
      }, dt);
    });
    this.truck.setPosition(this.vehicle.x, this.vehicle.y).setRotation(this.vehicle.rotation);
    const lookAheadSeconds = 0.42;
    const targetX = this.vehicle.x + this.vehicle.velocityX * lookAheadSeconds;
    const targetY = this.vehicle.y + this.vehicle.velocityY * lookAheadSeconds;
    this.cameraTarget.setPosition(
      Phaser.Math.Linear(this.cameraTarget.x, targetX, 0.1),
      Phaser.Math.Linear(this.cameraTarget.y, targetY, 0.1),
    );
    this.hud.update(this.vehicle.speed, this.vehicle.telemetry.lateralSpeed);
  }

  private drawStreet(): void {
    const g = this.add.graphics();
    g.fillStyle(0x87958b).fillRect(0, 0, WORLD.width, WORLD.height);
    g.fillStyle(0x3e454c).fillRect(0, 390, WORLD.width, 260);
    g.fillStyle(0x3e454c).fillRect(650, 0, 260, WORLD.height);
    g.lineStyle(4, 0xf7df76, 0.8).lineBetween(0, 520, WORLD.width, 520).lineBetween(780, 0, 780, WORLD.height);
    for (const [x, y, w, h, color] of [[80, 80, 400, 230, 0xd97a5d], [1030, 90, 360, 250, 0x6a96b5], [120, 710, 390, 160, 0xf2c768], [1050, 710, 370, 150, 0xa97cba]] as const) {
      g.fillStyle(color).fillRect(x, y, w, h);
      g.fillStyle(0x252f38).fillRect(x + 18, y + 25, w - 36, 22);
    }
    g.fillStyle(0xf8f2da).fillRect(1080, 365, 200, 50);
    this.add.text(1100, 377, '和平東路收運站', { fontFamily: 'monospace', fontSize: '18px', color: '#26313a' });
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
    // Two AI attendants are visible in the open bed.
    g.fillStyle(0xf1b281).fillCircle(-67, -14, 8).fillCircle(-37, 13, 8);
    g.fillStyle(0x315b78).fillRect(-74, -6, 14, 15).fillRect(-44, 21, 14, 15);
    return this.add.container(this.vehicle.x, this.vehicle.y, [g]);
  }
}
