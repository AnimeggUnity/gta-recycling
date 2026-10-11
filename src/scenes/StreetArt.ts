import Phaser from 'phaser';
import { WORLD } from '../config/balance';
import { POTHOLES } from '../config/hazards';
import { ROUTE_STATIONS } from '../config/stations';

/** Static, code-drawn pixel scenery. Coordinates follow the existing road layout. */
export function drawStreetArt(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(0x8b9989).fillRect(0, 0, WORLD.width, WORLD.height);
  // Sidewalks and red curb paint frame the playable streets.
  g.fillStyle(0xb0ac98).fillRect(0, 342, 1600, 354).fillRect(602, 0, 356, 960);
  for (let x = 0; x < 1600; x += 24) {
    g.lineStyle(1, 0x858d81, 0.45).lineBetween(x, 342, x, 390).lineBetween(x, 650, x, 696);
  }
  for (let y = 0; y < 960; y += 24) {
    g.lineStyle(1, 0x858d81, 0.45).lineBetween(602, y, 650, y).lineBetween(910, y, 958, y);
  }
  g.fillStyle(0x303c40).fillRect(0, 390, 1600, 260).fillRect(650, 0, 260, 960);
  // Seeded texture has no moving noise or external assets.
  for (let i = 0; i < 1100; i += 1) {
    const x = (i * 173 + 41) % 1600;
    const y = (i * 127 + 19) % 960;
    if ((y >= 390 && y < 650) || (x >= 650 && x < 910)) {
      g.fillStyle(i % 2 ? 0x758285 : 0x1c2b31, 0.18).fillRect(x, y, 2, 2);
    }
  }
  g.lineStyle(3, 0xc16854).lineBetween(0, 389, 645, 389).lineBetween(916, 389, 1600, 389);
  g.lineBetween(0, 651, 645, 651).lineBetween(916, 651, 1600, 651);
  g.lineBetween(649, 0, 649, 385).lineBetween(911, 0, 911, 385);
  g.lineBetween(649, 656, 649, 960).lineBetween(911, 656, 911, 960);
  for (const y of [516, 524]) {
    g.lineStyle(2, 0xd9be72, 0.9).lineBetween(0, y, 610, y).lineBetween(950, y, 1600, y);
  }
  for (const x of [776, 784]) {
    g.lineStyle(2, 0xd9be72, 0.9).lineBetween(x, 0, x, 350).lineBetween(x, 690, x, 960);
  }
  for (let x = 30; x < 1600; x += 74) {
    if (x > 575 && x < 960) continue;
    g.fillStyle(0xa9b2ad, 0.55).fillRect(x, 454, 28, 2).fillRect(x, 588, 28, 2);
  }
  for (let y = 18; y < 960; y += 74) {
    if (y > 320 && y < 710) continue;
    g.fillStyle(0xa9b2ad, 0.55).fillRect(715, y, 2, 28).fillRect(844, y, 2, 28);
  }
  // Zebra crossings remain clear of stop bays.
  for (let y = 402; y < 640; y += 23) {
    g.fillStyle(0xd5d8c9, 0.85).fillRect(610, y, 24, 12).fillRect(926, y, 24, 12);
  }
  for (let x = 665; x < 905; x += 23) {
    g.fillStyle(0xd5d8c9, 0.85).fillRect(x, 352, 12, 24).fillRect(x, 665, 12, 24);
  }
  // Rooftops, awnings, air conditioners and water tanks.
  const buildings = [
    { x: 60, y: 75, w: 240, h: 245, roof: 0xb58b71, name: '阿成機車行', sign: 0x315d69 },
    { x: 318, y: 90, w: 248, h: 230, roof: 0x909b8b, name: '和平茶行', sign: 0x865449 },
    { x: 998, y: 70, w: 265, h: 250, roof: 0x879d9a, name: '新生藥局', sign: 0x336d5c },
    { x: 1280, y: 80, w: 250, h: 240, roof: 0xb69973, name: '美而美早餐', sign: 0xa25848 },
    { x: 70, y: 726, w: 225, h: 180, roof: 0x8b9fa0, name: '巷口麵店', sign: 0x9b5643 },
    { x: 313, y: 726, w: 255, h: 180, roof: 0xb3a284, name: '全家福五金', sign: 0x496950 },
    { x: 994, y: 728, w: 255, h: 180, roof: 0x9ba58b, name: '東昇洗衣店', sign: 0x3d6673 },
    { x: 1267, y: 728, w: 260, h: 180, roof: 0xb48d7b, name: '台灣小吃', sign: 0x9b6242 },
  ];
  for (const b of buildings) {
    g.fillStyle(0x192e30, 0.25).fillRect(b.x + 9, b.y + 12, b.w + 5, b.h + 4);
    g.fillStyle(0x596c65).fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
    g.fillStyle(b.roof).fillRect(b.x, b.y, b.w, b.h);
    g.lineStyle(3, 0xe0dcc0, 0.35).strokeRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    for (let x = b.x + 22; x < b.x + b.w - 20; x += 28) {
      g.lineStyle(1, 0x273b3e, 0.14).lineBetween(x, b.y + 20, x, b.y + b.h - 45);
    }
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
    scene.add.text(b.x + b.w / 2, b.y + b.h - 22, b.name, {
      fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold', color: '#f0ead5',
    }).setOrigin(0.5);
    const awningY = b.y > 650 ? b.y - 18 : b.y + b.h + 5;
    for (let x = b.x; x < b.x + b.w; x += 20) {
      g.fillStyle(Math.floor((x - b.x) / 20) % 2 ? 0xd7cfac : b.sign).fillRect(x, awningY, 18, 14);
    }
  }
  for (const [x, y] of [[45, 356], [540, 365], [1000, 361], [1525, 360], [40, 680], [580, 680], [970, 680], [1550, 679]]) {
    g.fillStyle(0x102d2c, 0.2).fillCircle(x + 6, y + 7, 24);
    g.fillStyle(0x375f4b).fillRect(x - 20, y - 16, 38, 31).fillRect(x - 14, y - 23, 27, 44);
    g.fillStyle(0x608264).fillRect(x - 12, y - 18, 21, 17);
    g.fillStyle(0x90a178, 0.6).fillRect(x - 10, y - 15, 9, 5);
  }
  // Parked scooters, storm drains and signal poles.
  for (let x = 370; x < 505; x += 26) {
    g.fillStyle(0x1a2c31).fillRect(x + 3, 353, 8, 27);
    g.fillStyle(0xb6c1b8).fillRect(x, 358, 15, 13);
    g.fillStyle(0x455b63).fillRect(x + 2, 365, 11, 8);
    g.lineStyle(2, 0xc6cbbb).lineBetween(x - 3, 356, x + 18, 356);
  }
  for (const [x, y] of [[170, 395], [1370, 638], [647, 285], [899, 765]]) {
    g.fillStyle(0x19292d).fillRect(x, y, 18, 8);
    for (let i = 2; i < 17; i += 4) g.fillStyle(0x687779).fillRect(x + i, y + 1, 1, 6);
  }
  for (const [x, y] of [[638, 378], [922, 663]]) {
    g.fillStyle(0x152b2f).fillRect(x - 4, y - 14, 10, 29);
    g.fillStyle(0xe1ad70).fillRect(x - 1, y - 10, 4, 5);
    g.fillStyle(0x72bc97).fillRect(x - 1, y + 3, 4, 5);
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
    scene.add.text(station.stop.x, station.stop.y - (index === 1 ? 98 : 63), `${String(index + 1).padStart(2, '0')}  ${station.name}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#e9dfb8', backgroundColor: '#263c3e', padding: { x: 9, y: 5 },
    }).setOrigin(0.5);
  }
}
