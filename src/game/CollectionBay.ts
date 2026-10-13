import { CURVED_BAY, STREET } from '../config/balance';

export type BayStop = Readonly<{ x: number; y: number }>;
export type BayPoint = Readonly<{ x: number; y: number }>;

export function isCurvedBay(stop: BayStop): boolean {
  return CURVED_BAY.stationXs.includes(stop.x);
}

export function bayBounds(stop: BayStop): { left: number; right: number } {
  const halfLength = isCurvedBay(stop) ? CURVED_BAY.halfLength : STREET.bayHalfLength;
  return { left: stop.x - halfLength, right: stop.x + halfLength };
}

// Quintic easing gives horizontal tangents and zero curvature at both joins.
function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * u * (10 + u * (-15 + 6 * u));
}

export function bayOuterY(stop: BayStop, x: number): number {
  const { left, right } = bayBounds(stop);
  if (x < left || x > right) return STREET.bottom;
  const depth = stop.y + STREET.bayHalfWidth - STREET.bottom + (isCurvedBay(stop) ? CURVED_BAY.sweptBodyMargin : 0);
  if (!isCurvedBay(stop)) return STREET.bottom + depth;
  const ramp = Math.min(x - left, right - x) / CURVED_BAY.curbTransitionLength;
  return STREET.bottom + depth * smooth(ramp);
}

export function isBayPaved(stop: BayStop, x: number, y: number): boolean {
  const { left, right } = bayBounds(stop);
  return x >= left && x <= right && y >= STREET.bottom && y <= bayOuterY(stop, x);
}

/** Entrance and exit guide; this is geometry, not an automatic driving command. */
export function bayGuideY(stop: BayStop, x: number): number {
  const { left, right } = bayBounds(stop);
  const ramp = Math.min(x - left, right - x) / (CURVED_BAY.halfLength - CURVED_BAY.stopHalfLength);
  return STREET.startY + (stop.y - STREET.startY) * smooth(ramp);
}

export function bayBoundary(stop: BayStop): BayPoint[] {
  const { left, right } = bayBounds(stop);
  if (!isCurvedBay(stop)) return [{ x: left, y: STREET.bottom }, { x: left, y: bayOuterY(stop, left) }, { x: right, y: bayOuterY(stop, right) }, { x: right, y: STREET.bottom }];
  const points: BayPoint[] = [];
  for (let x = left; x <= right; x += CURVED_BAY.sampleSpacing) points.push({ x, y: bayOuterY(stop, x) });
  return points;
}
