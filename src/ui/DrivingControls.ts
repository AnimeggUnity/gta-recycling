import Phaser from 'phaser';
import type { DriverInput } from '../game/Vehicle';
import { resolvePriorityAxis } from '../game/InputResolver';
import { touchInput } from './TouchInputState';

export class DrivingControls {
  private readonly up: Phaser.Input.Keyboard.Key;
  private readonly down: Phaser.Input.Keyboard.Key;
  private readonly left: Phaser.Input.Keyboard.Key;
  private readonly right: Phaser.Input.Keyboard.Key;
  private readonly w: Phaser.Input.Keyboard.Key;
  private readonly s: Phaser.Input.Keyboard.Key;
  private readonly a: Phaser.Input.Keyboard.Key;
  private readonly d: Phaser.Input.Keyboard.Key;
  private readonly brake: Phaser.Input.Keyboard.Key;

  public constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    const keys = Phaser.Input.Keyboard.KeyCodes;
    keyboard.addCapture([keys.UP, keys.DOWN, keys.LEFT, keys.RIGHT, keys.W, keys.A, keys.S, keys.D, keys.SPACE]);
    this.up = keyboard.addKey(keys.UP);
    this.down = keyboard.addKey(keys.DOWN);
    this.left = keyboard.addKey(keys.LEFT);
    this.right = keyboard.addKey(keys.RIGHT);
    this.w = keyboard.addKey(keys.W);
    this.s = keyboard.addKey(keys.S);
    this.a = keyboard.addKey(keys.A);
    this.d = keyboard.addKey(keys.D);
    this.brake = keyboard.addKey(keys.SPACE);
  }

  public read(): DriverInput {
    return touchInput.merge({
      throttle: resolvePriorityAxis([this.down, this.s], [this.up, this.w]),
      steering: resolvePriorityAxis([this.left, this.a], [this.right, this.d]),
      brake: this.brake.isDown,
    });
  }
}
