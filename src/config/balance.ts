export const WORLD = {
  width: 1600,
  height: 960,
  fixedStepSeconds: 1 / 60,
  maxFrameSeconds: 0.25,
} as const;

export const VEHICLE = {
  maxSpeed: 250,
  acceleration: 180,
  braking: 440,
  turnRateRadians: 2.8,
  drag: 120,
} as const;
