import Phaser from 'phaser';
import './style.css';
import { GameScene } from './scenes/GameScene';
import { initialDevice } from './ui/DeviceMode';
import { TouchControls } from './ui/TouchControls';

new TouchControls(initialDevice());

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#15272a',
  pixelArt: true,
  scene: [GameScene],
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
});
