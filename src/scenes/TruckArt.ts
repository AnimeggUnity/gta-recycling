import Phaser from 'phaser';

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
