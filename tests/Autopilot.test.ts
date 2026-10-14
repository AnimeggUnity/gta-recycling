import { describe, expect, it } from 'vitest';
import { Autopilot } from '../src/game/Autopilot';
import { Vehicle } from '../src/game/Vehicle';
import { RouteMission } from '../src/game/RouteMission';
import { RoadGraph } from '../src/game/RoadGraph';
import { CargoHold } from '../src/game/CargoHold';
import { CrewDynamics } from '../src/game/CrewDynamics';
import { SurfaceSystem } from '../src/game/SurfaceSystem';
import { PotholeSystem } from '../src/game/PotholeSystem';
import { CollisionWorld, intersectBodies, truckBody } from '../src/game/CollisionWorld';
import { TrafficSystem, trafficBody } from '../src/game/TrafficSystem';
import { ROAD_EDGES, ROAD_NODES } from '../src/config/roads';
import { ROUTE_STATIONS, GARBAGE_STATIONS } from '../src/config/stations';
import { STATIC_OBSTACLES } from '../src/config/street';
import { POTHOLES } from '../src/config/hazards';
import { STREET, VEHICLE } from '../src/config/balance';
import { seededRandom } from './helpers/seededRandom';
import { BayViolationSystem } from '../src/game/BayViolationSystem';

function simulate(garbage: boolean, trafficOffset: number, dt = 1 / 60, workDelay = 0, trafficSeed = 42, bayDraw?: number) {
  const stations = garbage ? GARBAGE_STATIONS : ROUTE_STATIONS;
  const vehicle = new Vehicle(), pilot = new Autopilot(), cargo = new CargoHold(180, 140);
  const mission = new RouteMission(stations, cargo, new RoadGraph(ROAD_NODES, ROAD_EDGES));
  const traffic = new TrafficSystem(undefined, seededRandom(trafficSeed)), collisions = new CollisionWorld(STATIC_OBSTACLES);
  const bays = bayDraw === undefined ? undefined : new BayViolationSystem(stations, () => bayDraw);
  const surface = new SurfaceSystem(stations), crew = new CrewDynamics(), potholes = new PotholeSystem(POTHOLES);
  traffic.elapsedSeconds = trafficOffset;
  let serviceSeconds = 0; let maxEntrySpeed = 0;
  const seen = new Set<string>();let maxSpeed = 0;let sidewalkSteps = 0;
  for (let i = 0; i < 360 / dt && !mission.ended; i++) {
    const cycle = mission.activeCycle!;
    if (bays?.nearbyParkedViolator(vehicle.x, vehicle.y)) bays.triggerHorn(vehicle.x, vehicle.y);
    bays?.update(dt, [...traffic.getObstacles(), { ...truckBody(vehicle), id: 'player', label: '收運車' }]);
    serviceSeconds = cycle.phase === 'servicing' ? serviceSeconds + dt : 0;
    if (cycle.phase === 'approaching' && vehicle.x > cycle.definition.stop.x - 350) maxEntrySpeed = Math.max(maxEntrySpeed, vehicle.speed * VEHICLE.kmhPerSpeedUnit);
    // Simulated player work only: production autopilot never sorts or tosses.
    if (serviceSeconds > workDelay && cycle.sorting) for (const item of [...cycle.sorting.pending]) cycle.sorting.place(item.instanceId, item.item.target);
    if (serviceSeconds > workDelay && cycle.tossing?.current && !cycle.tossing.flight) cycle.tossing.launch(cycle.tossing.current.id, { vx: 0, vy: -0.5 });
    const input = pilot.read({ vehicle, cycle, obstacles: [...traffic.getObstacles(), ...(bays?.getObstacles() ?? []), ...STATIC_OBSTACLES], trafficSeconds: traffic.elapsedSeconds, ended: mission.ended });
    seen.add(pilot.status);
    const wasOrganizing = cycle.phase === 'organizing';
    mission.update({vehicleX:vehicle.x,vehicleY:vehicle.y,vehicleRotation:vehicle.rotation,vehicleSpeed:vehicle.speed,attemptingToDrive:input.throttle!==0,crewEfficiency:crew.efficiency,dockingBlocked:bays?.blocksStation(mission.activeStation?.id)},crew.anger,dt);
    if (mission.activeCycle?.departureLocked || mission.ended) vehicle.park();else vehicle.update(input, dt);
    traffic.update(dt, truckBody(vehicle), pilot.merging, bays?.getObstacles());
    if (bays && i % 30 === 0) for (const violator of bays.getObstacles()) {
      for (const car of traffic.vehicles) expect(intersectBodies(trafficBody(car), violator)).toBeUndefined();
    }
    const collision = collisions.resolve(vehicle, [...traffic.getObstacles(), ...(bays?.getObstacles() ?? [])]);
    expect(collision.fatalContact, `collision t=${i*dt} x=${vehicle.x} y=${vehicle.y} heading=${vehicle.rotation} status=${pilot.status}`).toBeUndefined();
    const feedback = surface.update(vehicle, dt);
    if (feedback.onSidewalk) sidewalkSteps++;
    crew.update(vehicle.telemetry, potholes.update(vehicle.x,vehicle.y,vehicle.speed),dt,{surface:feedback,steeringInput:input.steering,residentDelaySeconds:mission.activeCycle?.residentDelaySeconds});
    mission.checkCrewAnger(crew.anger);
    if(wasOrganizing && cycle.phase==='ready')crew.finishStation();
    maxSpeed = Math.max(maxSpeed, vehicle.speed * VEHICLE.kmhPerSpeedUnit);
  }
  expect(mission.failed, `failed ${JSON.stringify(mission.getFailure())}`).toBe(false);
  expect(mission.complete, `stuck ${vehicle.x},${vehicle.y} phase=${mission.activeCycle?.phase} status=${pilot.status}`).toBe(true);
  expect(sidewalkSteps).toBe(0);
  expect(maxSpeed).toBeLessThanOrEqual(29);
  expect(maxEntrySpeed).toBeGreaterThan(18.5);
  expect(maxEntrySpeed).toBeLessThan(20);
  expect(mission.results).toHaveLength(3);
  if (bays) expect(bays.violators[0].phase).toBe('cleared');
  return { seen, mission, vehicle };
}

describe('automatic driving', () => {
  it.each([0, 0.5, 0.999])('automatically horns and completes a recycling route with bay draw %s', draw => { simulate(false, 0, 1 / 60, 0, 42, draw); });
  it.each([0, 0.5, 0.999])('automatically horns and completes a garbage route with bay draw %s', draw => { simulate(true, 0, 1 / 60, 0, 1234, draw); });
  it.each([1, 1234, 9999])('completes a randomized traffic layout with seed %i', seed => { simulate(false, 0, 1 / 60, 0, seed); });
  it.each([0, 5, 10, 17, 23, 31])('completes the actual recycling route with traffic phase %i', offset => { simulate(false, offset); });
  it('completes at a lower frame cadence without changing the route', () => { simulate(false, 0, 1 / 30); });
  it('completes the garbage route and keeps tossing as player work', () => { simulate(true, 0); });
  it('handles delayed recycling work before rejoining traffic', () => { simulate(false, 23, 1 / 60, 12); });
  it('handles delayed garbage tossing before rejoining traffic', () => { simulate(true, 5, 1 / 60, 6); });
  it('stops before a red signal and resumes on green', () => {
    const vehicle = new Vehicle(), pilot = new Autopilot();
    const mission=new RouteMission([ROUTE_STATIONS[1]],new CargoHold(),new RoadGraph(ROAD_NODES,ROAD_EDGES));
    Object.assign(vehicle,{x:1900,y:610,velocityX:80});
    for(let i=0;i<600;i++)vehicle.update(pilot.read({vehicle,cycle:mission.activeCycle,obstacles:[],trafficSeconds:25,ended:false}),1/60);
    expect(truckBody(vehicle).x+truckBody(vehicle).halfLength).toBeLessThan(2140);
    expect(vehicle.speed).toBeLessThan(0.5);
    expect(pilot.status).toBe('等候紅綠燈');
    expect(pilot.read({vehicle,cycle:mission.activeCycle,obstacles:[],trafficSeconds:0,ended:false}).throttle).toBeGreaterThan(0);
  });
  it('waits for a stationary obstacle and resumes when it clears', () => {
    const vehicle = new Vehicle(), pilot = new Autopilot();
    const mission=new RouteMission(ROUTE_STATIONS,new CargoHold(),new RoadGraph(ROAD_NODES,ROAD_EDGES));
    const obstacle={id:'blocked',label:'汽車',kind:'vehicle' as const,x:650,y:610,rotation:0,halfLength:36,halfWidth:17};
    for(let i=0;i<600;i++)vehicle.update(pilot.read({vehicle,cycle:mission.activeCycle,obstacles:[obstacle],trafficSeconds:0,ended:false}),1/60);
    expect(truckBody(vehicle).x+truckBody(vehicle).halfLength).toBeLessThan(obstacle.x-obstacle.halfLength);
    expect(vehicle.speed).toBeLessThan(0.5);
    expect(pilot.read({vehicle,cycle:mission.activeCycle,obstacles:[],trafficSeconds:0,ended:false}).throttle).toBeGreaterThan(0);
  });
  it('holds an unfinished station and stops safely when paused', () => {
    const vehicle = new Vehicle(),pilot = new Autopilot();
    const mission=new RouteMission(ROUTE_STATIONS,new CargoHold(),new RoadGraph(ROAD_NODES,ROAD_EDGES));
    mission.activeCycle!.phase='servicing';Object.assign(vehicle,{x:1500,y:680});
    for(let i=0;i<60;i++)vehicle.update(pilot.read({vehicle,cycle:mission.activeCycle,obstacles:[],trafficSeconds:0,ended:false}),1/60);
    expect(vehicle.x).toBe(1500);
    mission.activeCycle!.phase='approaching';Object.assign(vehicle,{x:STREET.startX,y:STREET.startY,velocityX:60});pilot.togglePause();
    for(let i=0;i<180;i++)vehicle.update(pilot.read({vehicle,cycle:mission.activeCycle,obstacles:[],trafficSeconds:0,ended:false}),1/60);
    expect(vehicle.speed).toBeLessThan(0.5);const x=vehicle.x;
    for(let i=0;i<60;i++)vehicle.update(pilot.read({vehicle,cycle:mission.activeCycle,obstacles:[],trafficSeconds:0,ended:false}),1/60);
    expect(vehicle.x).toBeCloseTo(x,4);pilot.togglePause();
    expect(pilot.read({vehicle,cycle:mission.activeCycle,obstacles:[],trafficSeconds:0,ended:false}).throttle).toBeGreaterThan(0);
  });
});
