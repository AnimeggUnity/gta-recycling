import type Phaser from 'phaser';
import type { CrewReaction } from '../game/CrewDynamics';
import { DISPLAY } from '../config/balance';

// A code-drawn face stays legible on the worker without a separate HUD panel.
export function drawCrewExpression(g: Phaser.GameObjects.Graphics, reaction: CrewReaction): void {
  g.clear();
  const color = { calm: 0xf0d38e, annoyed: 0xefb55c, angry: 0xf08355, furious: 0xed5551 }[reaction];
  g.fillStyle(0x183033).fillCircle(0, 0, DISPLAY.crewFaceRadius + 2);
  g.fillStyle(color).fillCircle(0, 0, DISPLAY.crewFaceRadius);
  g.lineStyle(2, 0x382a29);
  if (reaction === 'calm') {
    g.fillStyle(0x382a29).fillCircle(-4, -2, 1.5).fillCircle(4, -2, 1.5);
    g.lineBetween(-5, 4, 0, 7).lineBetween(0, 7, 5, 4);
  } else if (reaction === 'annoyed') {
    g.lineBetween(-7, -3, -2, -3).lineBetween(2, -3, 7, -3).lineBetween(-4, 5, 4, 5);
  } else {
    g.lineBetween(-8, -6, -2, -2).lineBetween(2, -2, 8, -6);
    g.fillStyle(0x382a29).fillCircle(-4, 0, 1.5).fillCircle(4, 0, 1.5);
    if (reaction === 'angry') g.lineBetween(-5, 7, 0, 4).lineBetween(0, 4, 5, 7);
    else {
      g.fillStyle(0x382a29).fillEllipse(0, 6, 9, 7);
      g.fillStyle(0xffe4b1).fillRect(-3, 3, 6, 2);
      g.lineStyle(2, 0xffe4b1).lineBetween(15, -9, 19, -9).lineBetween(17, -11, 17, -7);
      g.lineBetween(-15, -5, -18, -9).lineBetween(-15, -10, -18, -14);
    }
  }
}

export function drawTruckBody(g: Phaser.GameObjects.Graphics): void {
  // Cabin points along local +X, matching driving physics.
  g.fillStyle(0x14282d, 0.4).fillRect(-93, -25, 141, 65);
  g.fillStyle(0x15282d).fillRect(-86, -36, 19, 9).fillRect(-86, 27, 19, 9);
  g.fillRect(11, -28, 19, 10).fillRect(11, 18, 19, 10);
  g.fillStyle(0x66837b).fillRect(-96, -31, 89, 62);
  g.fillStyle(0x254b4b).fillRect(-92, -27, 82, 54);
  g.fillStyle(0x315b56).fillRect(-88, -23, 74, 46);
  for (let x = -85; x < -13; x += 10) g.lineStyle(1, 0x83a48b, 0.22).lineBetween(x, -22, x, 22);
  g.fillStyle(0xb8c8a5).fillRect(-97, -31, 89, 4).fillRect(-97, 27, 89, 4);
  g.fillStyle(0x9dae91).fillRect(-99, -31, 5, 62);
  g.fillStyle(0xd7b75e).fillRect(-99, -27, 5, 9).fillRect(-99, 18, 5, 9);
  g.fillStyle(0xd96751).fillRect(-102, -22, 3, 8).fillRect(-102, 14, 3, 8);
  g.fillStyle(0xb8c4ae).fillRect(-7, -23, 49, 46);
  g.fillStyle(0xe6e5c9).fillRect(-4, -20, 43, 40);
  g.fillStyle(0x234951).fillRect(22, -17, 12, 34);
  g.fillStyle(0x6bafaa).fillRect(24, -15, 7, 30);
  g.fillStyle(0xc9e4cb, 0.7).fillRect(25, -13, 2, 11);
  g.fillStyle(0x3f665c).fillRect(2, -14, 13, 28);
  g.fillStyle(0xe8ead3).fillRect(4, -12, 9, 24);
  g.fillStyle(0xe5ac49).fillRect(3, -5, 12, 10);
  g.fillStyle(0xffd477).fillRect(5, -4, 7, 3);
  g.fillStyle(0x36595b).fillRect(19, -29, 7, 6).fillRect(19, 23, 7, 6);
  g.fillStyle(0xf5d990).fillRect(39, -16, 5, 9).fillRect(39, 7, 5, 9);
  g.fillStyle(0x354d4c).fillRect(42, -20, 4, 40);
  g.fillStyle(0x233e3d).fillRect(44, -8, 2, 16);
}

export function drawPerson(g: Phaser.GameObjects.Graphics, shirt: number, worker = false): void {
  g.fillStyle(0x142b2c, 0.25).fillEllipse(2, 4, 19, 16);
  g.fillStyle(0x18363d).fillRect(-6, 8, 5, 5).fillRect(2, 8, 5, 5);
  g.fillStyle(shirt).fillRect(-8, -1, 16, 12);
  if (worker) {
    g.fillStyle(0xe2d787).fillRect(-6, 0, 3, 8).fillRect(3, 0, 3, 8);
    g.fillStyle(0xcee3ad).fillRect(-8, 6, 16, 2);
  }
  g.fillStyle(0xce9f7c).fillRect(-5, -7, 10, 10).fillRect(-11, 3, 3, 5).fillRect(8, 3, 3, 5);
  g.fillStyle(worker ? 0xd8bb6c : 0x343c36).fillRect(-6, -8, 12, 5);
  g.fillStyle(worker ? 0xf0d48b : 0x556048).fillRect(-4, -8, 7, 2);
}
