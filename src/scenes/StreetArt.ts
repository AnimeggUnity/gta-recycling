import Phaser from 'phaser';
import { STREET, TRAFFIC, WORLD } from '../config/balance';
import { POTHOLES } from '../config/hazards';
import { ROUTE_STATIONS } from '../config/stations';
import { BUILDINGS, PARKED_SCOOTERS, TREES, type Building } from '../config/street';

/** Geometry is shared with collision data; no invisible buildings or legacy junctions. */
export function drawStreetArt(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(0x8b9989).fillRect(0, 0, WORLD.width, WORLD.height);
  g.fillStyle(0xb0ac98).fillRect(0, STREET.sidewalkTop, WORLD.width, STREET.sidewalkBottom - STREET.sidewalkTop);
  for (let x = 0; x < WORLD.width; x += 24) {
    g.lineStyle(1, 0x858d81, 0.4).lineBetween(x, STREET.sidewalkTop, x, STREET.top);
    g.lineBetween(x, STREET.bottom, x, STREET.sidewalkBottom);
  }
  g.fillStyle(0x303c40).fillRect(0, STREET.top, WORLD.width, STREET.bottom - STREET.top);
  for (let i = 0; i < 3500; i += 1) {
    const x = (i * 173 + 41) % WORLD.width;
    const y = STREET.top + (i * 127 + 19) % (STREET.bottom - STREET.top);
    g.fillStyle(i % 2 ? 0x758285 : 0x1c2b31, 0.18).fillRect(x, y, 2, 2);
  }
  g.lineStyle(3, 0xc16854).lineBetween(0, STREET.top - 1, WORLD.width, STREET.top - 1);
  // Break the curb at collection bays so trucks can actually pull off the traffic lane.
  let curbStart = 0;
  for (const station of ROUTE_STATIONS) {
    const left = station.stop.x - STREET.bayHalfLength;
    const right = station.stop.x + STREET.bayHalfLength;
    g.lineStyle(3, 0xc16854).lineBetween(curbStart, STREET.bottom + 1, left, STREET.bottom + 1);
    g.fillStyle(0x3d4847).fillRect(left, STREET.bottom, right - left, STREET.bayY + STREET.bayHalfWidth - STREET.bottom);
    g.lineStyle(2, 0xd0b875).lineBetween(left, STREET.bottom, left, STREET.bayY + STREET.bayHalfWidth);
    g.lineBetween(left, STREET.bayY + STREET.bayHalfWidth, right, STREET.bayY + STREET.bayHalfWidth);
    g.lineBetween(right, STREET.bayY + STREET.bayHalfWidth, right, STREET.bottom);
    scene.add.text(station.stop.x, STREET.bayY + 28, '資 源 回 收 ・ 臨 停 區', { fontFamily: 'monospace', fontSize: '11px', color: '#b5ad80' }).setOrigin(0.5);
    curbStart = right;
  }
  g.lineStyle(3, 0xc16854).lineBetween(curbStart, STREET.bottom + 1, WORLD.width, STREET.bottom + 1);
  for (const y of [STREET.centerY - 4, STREET.centerY + 4]) g.lineStyle(2, 0xd9be72).lineBetween(0, y, WORLD.width, y);
  for (let x = 30; x < WORLD.width; x += 74) {
    g.fillStyle(0xa9b2ad, 0.55).fillRect(x, 460, 28, 2).fillRect(x, 580, 28, 2);
  }
  for (let x = 450; x < WORLD.width; x += 600) {
    for (const y of [...STREET.eastboundLanes, ...STREET.westboundLanes]) {
      const east = y > STREET.centerY;
      const sign = east ? 1 : -1;
      g.lineStyle(3, 0xbdc3af, 0.65).lineBetween(x - 17 * sign, y, x + 17 * sign, y);
      g.lineBetween(x + 17 * sign, y, x + 5 * sign, y - 8).lineBetween(x + 17 * sign, y, x + 5 * sign, y + 8);
    }
  }
  for (const x of TRAFFIC.signalXs) {
    for (let y = STREET.top + 8; y < STREET.bottom - 8; y += 23) g.fillStyle(0xd5d8c9, 0.85).fillRect(x, y, TRAFFIC.crossingWidth, 12);
    g.fillStyle(0xd5d8c9).fillRect(x - TRAFFIC.stopLineOffset - 3, STREET.centerY + 7, 5, STREET.bottom - STREET.centerY - 12);
    g.fillRect(x + TRAFFIC.stopLineOffset, STREET.top + 5, 5, STREET.centerY - STREET.top - 12);
    scene.add.text(x + TRAFFIC.crossingWidth / 2, 336, '行人穿越道', { fontFamily: 'monospace', fontSize: '11px', color: '#263e3c' }).setOrigin(0.5);
  }
  for (const building of BUILDINGS) drawBuilding(scene, g, building);
  for (const tree of TREES) {
    const { x, y } = tree;
    g.fillStyle(0x102d2c, 0.2).fillCircle(x + 6, y + 7, 24);
    g.fillStyle(0x375f4b).fillRect(x - 20, y - 16, 38, 31).fillRect(x - 14, y - 23, 27, 44);
    g.fillStyle(0x608264).fillRect(x - 12, y - 18, 21, 17);
    g.fillStyle(0x90a178, 0.6).fillRect(x - 10, y - 15, 9, 5);
  }
  for (const { x, y } of PARKED_SCOOTERS) {
    g.fillStyle(0x1a2c31).fillRect(x - 4, y - 16, 8, 32);
    g.fillStyle(0xb6c1b8).fillRect(x - 8, y - 10, 16, 16);
    g.fillStyle(0x455b63).fillRect(x - 6, y + 1, 12, 10);
    g.lineStyle(2, 0xc6cbbb).lineBetween(x - 10, y - 13, x + 10, y - 13);
  }
  for (const p of POTHOLES) {
    g.fillStyle(0x17272c).fillCircle(p.x, p.y, p.radius);
    g.lineStyle(2, 0x6d7c78, 0.65).strokeCircle(p.x, p.y, p.radius + 2);
    g.fillStyle(0x3e565a).fillEllipse(p.x + 2, p.y + 2, p.radius, p.radius * 0.6);
  }
  for (const [index, station] of ROUTE_STATIONS.entries()) {
    const { x, y } = station.buildingExit;
    g.fillStyle(0x203b37).fillRect(x - 17, y - 10, 34, 20);
    g.fillStyle(0x91b6a1).fillRect(x - 12, y - 7, 8, 14);
    scene.add.text(station.stop.x, STREET.sidewalkBottom + 9, `${String(index + 1).padStart(2, '0')}  ${station.name}`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#e9dfb8', backgroundColor: '#263c3e', padding: { x: 9, y: 5 },
    }).setOrigin(0.5);
  }
}

function drawBuilding(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, b: Building): void {
  g.fillStyle(0x192e30, 0.25).fillRect(b.x + 9, b.y + 12, b.w + 5, b.h + 4);
  g.fillStyle(0x596c65).fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
  g.fillStyle(b.roof).fillRect(b.x, b.y, b.w, b.h);
  g.lineStyle(3, 0xe0dcc0, 0.35).strokeRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
  for (let x = b.x + 22; x < b.x + b.w - 20; x += 28) g.lineStyle(1, 0x273b3e, 0.14).lineBetween(x, b.y + 20, x, b.y + b.h - 45);
  g.fillStyle(0x456065).fillRect(b.x + 27, b.y + 28, 45, 32);
  g.fillStyle(0x9fb8ae).fillRect(b.x + 30, b.y + 31, 18, 26).fillRect(b.x + 51, b.y + 31, 18, 26);
  for (const x of [b.x + b.w - 76, b.x + b.w - 42]) {
    g.fillStyle(0xd4d5c2).fillRect(x, b.y + 26, 25, 33);
    g.fillStyle(0x76888a).fillCircle(x + 12, b.y + 41, 8);
    g.lineStyle(1, 0x394b51).strokeCircle(x + 12, b.y + 41, 6);
  }
  g.fillStyle(0x4d6464).fillRect(b.x + 32, b.y + 84, 43, 40);
  g.fillStyle(0xbed0c6).fillCircle(b.x + 52, b.y + 99, 19);
  g.fillStyle(0x8baba6).fillCircle(b.x + 52, b.y + 97, 13);
  g.fillStyle(b.sign).fillRect(b.x + 8, b.y + b.h - 36, b.w - 16, 31);
  scene.add.text(b.x + b.w / 2, b.y + b.h - 22, b.name, { fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold', color: '#f0ead5' }).setOrigin(0.5);
  const awningY = b.y > STREET.bottom ? b.y - 18 : b.y + b.h + 5;
  for (let x = b.x; x < b.x + b.w; x += 20) g.fillStyle(Math.floor((x - b.x) / 20) % 2 ? 0xd7cfac : b.sign).fillRect(x, awningY, 18, 14);
}
