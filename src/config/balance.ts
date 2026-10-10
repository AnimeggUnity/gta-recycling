export const WORLD = {
  width: 1600,
  height: 960,
  fixedStepSeconds: 1 / 60,
  maxFrameSeconds: 0.25,
} as const;

export const VEHICLE = {
  maxForwardSpeed: 285,
  maxReverseSpeed: 95,
  forwardAcceleration: 205,
  reverseAcceleration: 130,
  directionChangeBraking: 330,
  emergencyBraking: 520,
  rollingResistance: 28,
  aerodynamicDrag: 0.42,
  lateralGrip: 7.5,
  emergencyLateralGrip: 1.8,
  lowSpeedTurnRate: 2.7,
  highSpeedTurnRate: 1.25,
  steeringResponse: 6.5,
  steeringReversalResponse: 12,
} as const;
