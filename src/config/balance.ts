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
  touchLookAheadSeconds: 0.2,
  touchCameraOffsetRatio: 0.12,
  crewFaceOffset: 10,
  crewFaceRadius: 12,
} as const;

export const CARGO_ART = {
  x: -86,
  y: -21,
  columns: 4,
  rows: 3,
  pitchX: 18,
  pitchY: 14,
  itemSize: 12,
} as const;

export const TOUCH_STEERING = {
  maximumAngleDegrees: 90,
  deadAngleDegrees: 4,
  responseExponent: 1.5,
  centerRadiusRatio: 0.18,
} as const;

export const SERVICE = {
  deliverySpeedMultiplier: 2,
  residentTravelSeconds: 1.1,
  delayGraceSeconds: 0.45,
  workerActionSeconds: {
    'moving-to-tail': 0.7,
    receiving: 0.9,
    carrying: 1,
    sorting: 0.8,
  },
} as const;

export const VEHICLE = {
  kmhPerSpeedUnit: 0.35,
  maxForwardSpeed: 60 / 0.35,
  angerSpeedThresholdKmh: 35,
  maxReverseSpeed: 12 / 0.35,
  boundaryMargin: 120,
  forwardAcceleration: 205,
  reverseAcceleration: 65,
  directionChangeBraking: 330,
  emergencyBraking: 520,
  rollingResistance: 28,
  aerodynamicDrag: 0.42,
  lateralGrip: 7.5,
  emergencyLateralGrip: 1.8,
  wheelbase: 84,
  lowSpeedSteeringAngle: 38 * Math.PI / 180,
  highSpeedSteeringAngle: 14 * Math.PI / 180,
  steeringSpeedReferenceKmh: 35,
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

export const SIDEWALK = {
  minimumMovingSpeed: 4,
  impactReferenceSpeed: 120,
  minimumCurbImpact: 0.45,
  bumpSpacing: 18,
  minimumBumpImpact: 0.35,
  bumpSpeedGain: 0.5,
  maximumBumpImpact: 0.85,
  curbAnger: 8,
  angerPerSecond: 6,
  angerPerKmh: 0.1,
  shakeGain: 2.5,
  wheelOffsets: [
    { x: 21, y: -23 }, { x: 21, y: 23 },
    { x: -77, y: -31 }, { x: -77, y: 31 },
  ],
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
  initialPositionJitter: 200,
  scooterChance: 1 / 3,
  minDesiredSpeed: 72,
  maxDesiredSpeed: 103,
  vehicleColors: [0xc5c9b0, 0x688f9b, 0xbd735f, 0x7c9386],
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
export const MISSION = {
  angerFailureThreshold: 100,
  missedStopWarningMeters: 15,
  missedStopFailureMeters: 35,
  missedStopWarningSeconds: 2,
} as const;

export const ASSET_LOADING = { concurrency: 4, timeoutMs: 20000 } as const;

export const TOSS = {
  minBags: 3,
  maxBags: 5,
  pointsPerBag: 100,
  gravity: 1.4,
  liftRatio: 0.6,
  speedGain: 0.82,
  maxLaunchSpeed: 4,
  minGestureDistance: 0.035,
  sampleWindowMs: 100,
  minSampleMs: 16,
  releaseFreezeToleranceMs: 45,
  releaseFreezeDistance: 0.002,
  targetDepth: 1,
  targetHalfWidth: 0.24,
  targetMinHeight: 0.24,
  targetMaxHeight: 0.535,
  feedbackSeconds: 0.8,
  maxFlightSeconds: 2.5,
  compressionSeconds: 1.6,
  crewReturnSeconds: 0.8,
  hazardChance: 0.25,
  hazardAngerPenalty: 35,
  hazardScorePenalty: 100,
  rejectSwipeVelocityY: 0.5,
  bagSizes: {
    small: { label: '小袋', mass: 0.7, scale: 0.8, volume: 4, weight: 1 },
    medium: { label: '中袋', mass: 1.1, scale: 1, volume: 7, weight: 2 },
    large: { label: '大袋', mass: 1.7, scale: 1.2, volume: 10, weight: 4 },
  },
} as const;

// Shared collection bays for the three-stop route. Dimensions are in route/world coordinates.
export const CURVED_BAY = {
  stationXs: [1500, 3200, 5100] as readonly number[],
  halfLength: 350,
  stopHalfLength: 100,
  curbTransitionLength: 150,
  stopY: 680,
  sweptBodyMargin: 20,
  sampleSpacing: 5,
  obstacleMargin: 70,
} as const;

export const AUTOPILOT = {
  cruiseSpeedKmh: 28,
  entrySpeedKmh: 19,
  exitSpeedKmh: 8,
  curveApproach: 150,
  lookAhead: 35,
  exitClearance: 80,
  acceleration: 45,
  braking: 100,
  speedGain: 3,
  stoppingSeconds: 2,
  standstillSpeed: 2,
  signalMargin: 8,
  followingGap: 45,
  lateralMargin: 6,
  obstacleRange: 400,
  obstacleLookAhead: 120,
  entranceWaitOffset: 70,
  entranceClearance: 200,
  entranceRearGap: 450,
  entranceFrontGap: 200,
  mergeWaitOffset: 80,
  mergeRearGap: 200,
  mergeFrontGap: 180,
} as const;

export const BAY_VIOLATION = {
  hornRange: 420,
  hornCooldownSeconds: 0.4,
  reactionSeconds: 0.55,
  blinkSeconds: 0.35,
  parkedOffsetX: -18,
  acceleration: 110,
  targetSpeed: 88,
  lookAhead: 28,
  clearDistancePastStop: 420,
  color: 0xd28f56,
} as const;

export const HORN_SOUND = {
  durationSeconds: 0.38,
  attackSeconds: 0.015,
  releaseSeconds: 0.065,
  frequencies: [405, 510],
  harmonics: [0, 1, 0.62, 0.36, 0.22, 0.13, 0.08],
  lowpassHz: 2800,
  resonance: 0.65,
  volume: 0.16,
  silenceFloor: 0.0001,
  onsetPitchRatio: 0.985,
  onsetPitchSeconds: 0.025,
  retriggerSeconds: 0.12,
} as const;
