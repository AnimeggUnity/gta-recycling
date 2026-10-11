export const WORLD = {
  width: 6000,
  height: 1100,
  fixedStepSeconds: 1 / 60,
  maxFrameSeconds: 0.25,
} as const;

export const DISPLAY = {
  roadRotation: -Math.PI / 2,
  uprightRotation: Math.PI / 2,
  maxZoom: 1.1,
  visibleStreetWidth: 460,
  wheelDeadZone: 0.08,
  wheelTravelRatio: 0.35,
  touchLookAheadSeconds: 0.2,
  touchCameraOffsetRatio: 0.12,
  crewFaceOffset: 10,
  crewFaceRadius: 12,
} as const;

export const SERVICE = {
  residentTravelSeconds: 1.1,
  delayGraceSeconds: 0.45,
} as const;

export const VEHICLE = {
  kmhPerSpeedUnit: 0.35,
  maxForwardSpeed: 285,
  maxReverseSpeed: 95,
  boundaryMargin: 120,
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

export const NAVIGATION = {
  metersPerPixel: VEHICLE.kmhPerSpeedUnit / 3.6,
  cruiseSpeedKmh: 35,
} as const;

export const STREET = {
  top: 390,
  bottom: 650,
  centerY: 520,
  sidewalkTop: 340,
  sidewalkBottom: 770,
  eastboundLanes: [550, 610],
  westboundLanes: [430, 490],
  bayY: 695,
  bayHalfLength: 150,
  bayHalfWidth: 45,
  dockingHalfLength: 65,
  dockingHalfWidth: 15,
  dockingHeadingTolerance: 0.35,
  startX: 400,
  startY: 610,
} as const;

export const TRAFFIC = {
  greenSeconds: 18,
  yellowSeconds: 3,
  redSeconds: 12,
  signalXs: [2200, 4200],
  stopLineOffset: 60,
  crossingWidth: 36,
  acceleration: 65,
  braking: 180,
  followingGap: 36,
  reactionSeconds: 0.7,
  spawnSpacing: 700,
  initialSpawnX: 600,
  vehiclesPerLane: 8,
  collisionYieldSeconds: 1.2,
  sedanHalfLength: 36,
  sedanHalfWidth: 17,
  scooterHalfLength: 18,
  scooterHalfWidth: 9,
  truckHalfLength: 74,
  truckHalfWidth: 36,
  truckCenterOffset: -28,
  collisionSkin: 0.1,
  restitution: 0.05,
  collisionIterations: 6,
  collisionWarningSeconds: 1.8,
  minimumImpactSpeed: 12,
  impactReferenceSpeed: 220,
  collisionAnger: 25,
} as const;
