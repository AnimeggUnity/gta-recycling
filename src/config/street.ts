import { bayBounds } from '../game/CollectionBay';
import { CURVED_BAY, STREET, TRAFFIC, WORLD } from './balance';
import { ROUTE_STATIONS } from './stations';
import type { CollisionObstacle } from '../game/CollisionWorld';

export type Building = Readonly<{ id: string; x: number; y: number; w: number; h: number; roof: number; name: string; sign: number }>;
const shopNames = ['阿成機車行', '和平茶行', '新生藥局', '美而美早餐', '巷口麵店', '全家福五金', '東昇洗衣店', '台灣小吃'];
const roofs = [0xb58b71, 0x909b8b, 0x879d9a, 0xb69973];
const signs = [0x315d69, 0x865449, 0x336d5c, 0xa25848];

export const BUILDINGS: readonly Building[] = Array.from({ length: Math.floor(WORLD.width / 300) }, (_, index) => [
  { id: `north-shop-${index}`, x: index * 300 + 22, y: 100, w: 250, h: 215, roof: roofs[index % roofs.length], name: shopNames[index % shopNames.length], sign: signs[index % signs.length] },
  { id: `south-shop-${index}`, x: index * 300 + 22, y: 800, w: 250, h: 210, roof: roofs[(index + 2) % roofs.length], name: shopNames[(index + 4) % shopNames.length], sign: signs[(index + 1) % signs.length] },
]).flat();

export const TREES = Array.from({ length: Math.floor(WORLD.width / 400) }, (_, index) => [
  { id: `north-tree-${index}`, x: index * 400 + 75, y: 362 },
  { id: `south-tree-${index}`, x: index * 400 + 260, y: 758 },
]).flat().filter((tree) =>
  !ROUTE_STATIONS.some((station) => tree.y > STREET.bottom && tree.x > bayBounds(station.stop).left - CURVED_BAY.obstacleMargin && tree.x < bayBounds(station.stop).right + CURVED_BAY.obstacleMargin)
  && !TRAFFIC.signalXs.some((x) => Math.hypot(tree.x - (x + (tree.y > STREET.bottom ? 1 : -1) * TRAFFIC.stopLineOffset), tree.y - (tree.y > STREET.bottom ? 741 : 365)) < 45));

export const PARKED_SCOOTERS = Array.from({ length: 16 }, (_, index) => ({
  id: `parked-scooter-${index}`, x: 380 + index * 330, y: 362,
})).filter((scooter) => !TREES.some((tree) => Math.hypot(tree.x - scooter.x, tree.y - scooter.y) < 38));

export const SIGNAL_POLES = TRAFFIC.signalXs.flatMap((x, index) => [
  { id: `north-pole-${index}`, x: x - TRAFFIC.stopLineOffset, y: 365 },
  { id: `south-pole-${index}`, x: x + TRAFFIC.stopLineOffset, y: 741 },
]);

export const STATIC_OBSTACLES: readonly CollisionObstacle[] = [
  ...BUILDINGS.map((b) => ({ id: b.id, label: '建築物', kind: 'building' as const, x: b.x + b.w / 2, y: b.y + b.h / 2, halfLength: b.w / 2, halfWidth: b.h / 2, rotation: 0 })),
  ...TREES.map((tree) => ({ ...tree, label: '路樹', halfLength: 13, halfWidth: 13, rotation: 0 })),
  ...PARKED_SCOOTERS.map((scooter) => ({ ...scooter, label: '停放機車', kind: 'vehicle' as const, halfLength: 10, halfWidth: 18, rotation: 0 })),
  ...SIGNAL_POLES.map((pole) => ({ ...pole, label: '號誌桿', halfLength: 6, halfWidth: 6, rotation: 0 })),
];
