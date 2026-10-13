import type Phaser from 'phaser';
import type { CrewReaction } from '../game/CrewDynamics';
import type { RecyclingType } from '../game/CargoHold';
import { CARGO_ART, DISPLAY } from '../config/balance';

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

/** Closed compactor, with rear hopper, hydraulic arms and hazard striping. */
export function drawGarbageTruckBody(g: Phaser.GameObjects.Graphics): void {
  drawTruckBody(g);
  g.fillStyle(0x1c3436).fillRect(-98, -30, 91, 60);
  g.fillStyle(0xd1aa50).fillRoundedRect(-91, -28, 82, 56, 9);
  g.fillStyle(0xecd078).fillRoundedRect(-83, -25, 68, 50, 7);
  g.fillStyle(0xc59944).fillRect(-76, -24, 5, 48).fillRect(-36, -24, 5, 48);
  g.lineStyle(2, 0x957540).strokeRoundedRect(-91, -28, 82, 56, 9);
  g.fillStyle(0x52675a).fillRect(-98, -25, 15, 50);
  g.fillStyle(0x12292a).fillRect(-100, -18, 13, 36);
  g.fillStyle(0xa5b399).fillRect(-99, -22, 18, 4).fillRect(-99, 18, 18, 4);
  g.fillStyle(0xecc461).fillRect(-103, -26, 5, 52);
  for (let y = -25; y < 26; y += 10) g.fillStyle(0x273b3a).fillRect(-103, y, 5, 5);
  g.fillStyle(0xe66e50).fillRect(-104, -29, 4, 7).fillRect(-104, 22, 4, 7);
  g.fillStyle(0xe3bf64).fillRect(-7, -23, 49, 46);
  g.fillStyle(0xf2d782).fillRect(-4, -20, 43, 40);
  g.fillStyle(0x234951).fillRect(22, -17, 12, 34);
  g.fillStyle(0x6bafaa).fillRect(24, -15, 7, 30);
  g.fillStyle(0xf49445).fillRect(1, -20, 7, 6).fillRect(1, 14, 7, 6);
  g.fillStyle(0x476354).fillRect(-64, -11, 23, 22);
  g.lineStyle(2, 0xe6d795).lineBetween(-58, -6, -48, -6).lineBetween(-58, 0, -48, 0).lineBetween(-58, 6, -48, 6);
}

export const RECYCLING_COLORS: Readonly<Record<RecyclingType, number>> = {
  paper: 0xe8d49b, plastic: 0x67b8d6, metal: 0xaeb7bf, glass: 0x70b27c,
};

/** Bounded visual stacks represent the complete inventory without growing past the bed. */
export function drawCargoPile(g: Phaser.GameObjects.Graphics, counts: Readonly<Record<RecyclingType, number>>): void {
  g.clear();
  const types = Object.keys(RECYCLING_COLORS) as RecyclingType[];
  const total = types.reduce((sum, type) => sum + counts[type], 0);
  const maxSlots = CARGO_ART.columns * CARGO_ART.rows;
  const visible = Math.min(total, maxSlots);
  for (let slot = 0; slot < visible; slot += 1) {
    // Sample across all categories, so a large paper pile cannot hide every other material.
    let itemIndex = Math.floor(slot * total / visible);
    const type = types.find(type => {
      if (itemIndex < counts[type]) return true;
      itemIndex -= counts[type]; return false;
    })!;
    const x = CARGO_ART.x + slot % CARGO_ART.columns * CARGO_ART.pitchX;
    const y = CARGO_ART.y + Math.floor(slot / CARGO_ART.columns) * CARGO_ART.pitchY;
    const size = CARGO_ART.itemSize;
    if (total > maxSlots) g.fillStyle(0x142e2d).fillRect(x - 1, y + 1, size, size);
    g.fillStyle(RECYCLING_COLORS[type]).fillRect(x, y, size, size);
    g.lineStyle(1, 0x203c3d, 0.8).strokeRect(x, y, size, size);
    g.fillStyle(0xf0ead1, 0.6).fillRect(x + 3, y + 2, type === 'paper' ? 3 : 7, 2);
  }
}
