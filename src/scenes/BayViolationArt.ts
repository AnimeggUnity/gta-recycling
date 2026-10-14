import Phaser from 'phaser';
import { BAY_VIOLATION, DISPLAY, TRAFFIC } from '../config/balance';
import type { BayViolationSystem } from '../game/BayViolationSystem';
import { drawVehicle } from './TrafficArt';

export class BayViolationArt {
  private readonly cars: { body: Phaser.GameObjects.Container; lamps: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }[];
  public constructor(scene: Phaser.Scene, system: BayViolationSystem) {
    this.cars = system.violators.map(v => {
      const art = scene.add.graphics();
      drawVehicle(art, { kind: 'car', halfLength: TRAFFIC.sedanHalfLength, halfWidth: TRAFFIC.sedanHalfWidth, color: BAY_VIOLATION.color });
      const lamps = scene.add.graphics();
      const body = scene.add.container(v.x, v.y, [art, lamps]);
      const label = scene.add.text(v.x, v.y, '', { fontFamily: 'system-ui', fontSize: '13px', color: '#ffdf96', backgroundColor: '#172d31', padding: { x: 6, y: 4 } })
        .setOrigin(0.5).setRotation(-DISPLAY.roadRotation).setDepth(5);
      return { body, lamps, label };
    });
    this.update(system);
  }
  public update(system: BayViolationSystem): void {
    system.violators.forEach((v, index) => {
      const { body, lamps, label } = this.cars[index];
      const visible = v.phase !== 'cleared';
      body.setVisible(visible).setPosition(v.x, v.y).setRotation(v.rotation);
      label.setVisible(visible).setPosition(v.x + 65, v.y);
      label.setText(v.phase === 'parked' ? '⚠ 違停 · 按 H／喇叭' : v.phase === 'reacting' ? '拍謝！馬上開走！' : '駛離中，請稍候');
      lamps.clear();
      if (visible && v.phase !== 'departing' && Math.floor(v.elapsed / BAY_VIOLATION.blinkSeconds) % 2 === 0) {
        lamps.fillStyle(0xffc45a);
        for (const x of [-TRAFFIC.sedanHalfLength, TRAFFIC.sedanHalfLength - 4]) {
          for (const y of [-TRAFFIC.sedanHalfWidth, TRAFFIC.sedanHalfWidth - 5]) lamps.fillRect(x, y, 4, 5);
        }
      }
    });
  }
}
