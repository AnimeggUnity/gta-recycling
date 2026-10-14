import Phaser from 'phaser';
import { SIGNAL_POLES } from '../config/street';
import { signalColor, TRAFFIC_SIGNALS, type TrafficSystem, type TrafficVehicle } from '../game/TrafficSystem';

export class TrafficArt {
  private readonly vehicles = new Map<string, Phaser.GameObjects.Container>();
  private readonly signals: Phaser.GameObjects.Graphics;
  public constructor(scene: Phaser.Scene, traffic: TrafficSystem) {
    for (const vehicle of traffic.vehicles) {
      const g = scene.add.graphics();
      drawVehicle(g, vehicle);
      this.vehicles.set(vehicle.id, scene.add.container(vehicle.x, vehicle.y, [g]));
    }
    this.signals = scene.add.graphics();
  }

  public update(traffic: TrafficSystem): void {
    for (const vehicle of traffic.vehicles) this.vehicles.get(vehicle.id)?.setPosition(vehicle.x, vehicle.y).setRotation(vehicle.direction > 0 ? 0 : Math.PI);
    this.signals.clear();
    for (const [index, signal] of TRAFFIC_SIGNALS.entries()) {
      const active = signalColor(signal, traffic.elapsedSeconds);
      for (const pole of SIGNAL_POLES.slice(index * 2, index * 2 + 2)) {
        const { x, y } = pole;
        this.signals.fillStyle(0x172d31).fillRect(x - 9, y - 22, 18, 45);
        this.signals.lineStyle(2, 0x7d9687).strokeRect(x - 9, y - 22, 18, 45);
        for (const [light, offset, color] of [['red', -13, 0xee795e], ['yellow', 0, 0xf1cb73], ['green', 13, 0x86d0a0]] as const) {
          this.signals.fillStyle(light === active ? color : 0x354645).fillCircle(x, y + offset, 4);
        }
      }
    }
  }
}

export function drawVehicle(g: Phaser.GameObjects.Graphics, v: Pick<TrafficVehicle, 'kind' | 'halfLength' | 'halfWidth' | 'color'>): void {
  const l = v.halfLength, w = v.halfWidth;
  g.fillStyle(0x14282d, 0.3).fillRect(-l + 3, -w + 5, l * 2, w * 2);
  if (v.kind === 'scooter') {
    g.fillStyle(0x173035).fillRect(-l, -4, l * 2, 8);
    g.fillStyle(v.color).fillRect(-13, -8, 26, 16);
    g.fillStyle(0x1d3739).fillRect(-11, -5, 15, 10);
    g.fillStyle(0xb7c6a7).fillRect(-1, -6, 9, 12);
    g.fillStyle(0xe5e0bd).fillCircle(5, 0, 5);
    g.lineStyle(2, 0x8ba59b).lineBetween(12, -10, 12, 10);
    g.fillStyle(0xf5d58b).fillRect(16, -3, 3, 6);
  } else {
    g.fillStyle(0x173035).fillRect(-26, -w - 2, 12, 4).fillRect(-26, w - 2, 12, 4).fillRect(17, -w - 2, 12, 4).fillRect(17, w - 2, 12, 4);
    g.fillStyle(v.color).fillRect(-l, -w, l * 2, w * 2);
    g.fillStyle(0x294f55).fillRect(10, -w + 3, 10, w * 2 - 6).fillRect(-23, -w + 3, 8, w * 2 - 6);
    g.fillStyle(0xc7deca, 0.5).fillRect(12, -w + 4, 3, 10);
    g.lineStyle(1, 0xe4e0bc, 0.5).strokeRect(-12, -w + 4, 19, w * 2 - 8);
    g.fillStyle(0xf5d990).fillRect(l - 3, -w + 2, 3, 6).fillRect(l - 3, w - 8, 3, 6);
    g.fillStyle(0xc66e5d).fillRect(-l, -w + 2, 3, 6).fillRect(-l, w - 8, 3, 6);
  }
}
