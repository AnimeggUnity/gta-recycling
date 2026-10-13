import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hud } from '../src/ui/Hud';

const data = {
  speed: 130, lateralSpeed: 0, distanceMeters: 42, status: '正在收運',
  cargoVolume: 12, maxCargoVolume: 180, cargoWeight: 5, maxCargoWeight: 140,
  crewAnger: 55, crewEfficiency: 0.7, crewReaction: '正在生氣', angerReason: '超速',
  stationName: '和平東路收運站', stationNumber: 1, stationCount: 3,
  etaSeconds: 10, scheduledTime: '18:30:35', delaySeconds: 4,
  vehicleX: 400, vehicleY: 520, vehicleRotation: -Math.PI / 2,
  navigationPath: [{ x: 400, y: 520 }, { x: 780, y: 520 }],
};

function mountHud(device = 'desktop') {
  const nodes: { innerHTML: string; hidden: boolean; className: string; querySelector: ReturnType<typeof vi.fn> }[] = [];
  const restart = vi.fn();
  vi.stubGlobal('document', {
    createElement: () => {
      const node = { innerHTML: '', hidden: false, className: '', querySelector: vi.fn(() => ({ addEventListener: restart })), querySelectorAll: vi.fn(() => []) };
      nodes.push(node);
      return node;
    },
    body: { append: vi.fn(), dataset: { device } },
  });
  return { hud: new Hud(), nodes, restart };
}

afterEach(() => vi.unstubAllGlobals());

describe('HUD presentation', () => {
  it('uses the police illustration and traffic accident message for collisions', () => {
    const { hud, nodes } = mountHud();
    hud.update({ ...data, failure: { reason: 'collision', collisionLabel: '機車', totalSeconds: 5, stationCount: 0 } });
    expect(nodes[1].className).toContain('collision-failed');
    expect(nodes[1].innerHTML).toContain('police-v1.webp');
    expect(nodes[1].innerHTML).toContain('撞到機車');
    expect(nodes[1].innerHTML).not.toContain('angry-worker-v1.webp');
  });
  it.each(['desktop', 'mobile'])('shows a failure report and restart on %s without success score', (device) => {
    const { hud, nodes, restart } = mountHud(device);
    const failed = { ...data, failure: { reason: 'crew-anger' as const, totalSeconds: 50, stationCount: 1 } };
    hud.update(failed); hud.update(failed);
    expect(nodes[1].hidden).toBe(false);
    expect(nodes[1].innerHTML).toContain('任務失敗');
    expect(nodes[1].innerHTML).toContain('怒氣達到 100%');
    expect(nodes[1].innerHTML).toContain('重新出車');
    expect(nodes[1].innerHTML).not.toContain('勤務評分');
    expect(nodes[1].className).toContain('mission-failed');
    expect(nodes[1].innerHTML).toContain('angry-worker-v1.webp');
    expect(restart).toHaveBeenCalledTimes(1);
  });
  it('renders only speed while driving on a mobile device, even with keyboard controls', () => {
    const { hud } = mountHud('mobile');
    hud.update({ ...data, servicePhase: 'approaching' });
    expect(hud.element.innerHTML).toContain('mobile-speed');
    for (const removed of ['nav-panel', 'map-panel', 'crew-panel', '怒氣', '效率', 'ETA', 'controls-hint', 'mobile-service']) {
      expect(hud.element.innerHTML).not.toContain(removed);
    }
  });

  it('keeps collection and collision prompts without restoring mobile navigation', () => {
    const { hud } = mountHud('mobile');
    hud.update({ ...data, servicePhase: 'servicing' });
    expect(hud.element.innerHTML).toContain('正在收運');
    expect(hud.element.innerHTML).toContain('mobile-service');
    hud.update({ ...data, servicePhase: 'approaching', urgentWarning: true, status: '撞到機車' });
    expect(hud.element.innerHTML).toContain('撞到機車');
    hud.update({ ...data, servicePhase: 'approaching', urgentWarning: false });
    expect(hud.element.innerHTML).not.toContain('mobile-service');
  });

  it('omits anger numbers from the mobile completion report but keeps restart', () => {
    const { hud, nodes, restart } = mountHud('mobile');
    hud.update({ ...data, settlement: { score: 88, totalSeconds: 120, totalDelaySeconds: 5, peakAnger: 55, stationCount: 3 } });
    expect(nodes[1].innerHTML).not.toContain('最高怒氣');
    expect(nodes[1].innerHTML).toContain('重新出車');
    expect(restart).toHaveBeenCalledTimes(1);
  });

  it('uses real vehicle coordinates and route points in the minimap', () => {
    const { hud } = mountHud();
    hud.update(data);
    expect(hud.element.innerHTML).toContain('translate(67 149) rotate(-90)');
    expect(hud.element.innerHTML).toContain('points="67,149 130,149"');
    expect(hud.element.innerHTML).toContain('viewBox="0 0 340 1000"');
    expect(hud.element.innerHTML).toContain('由下往上，三站位於道路右側');
    expect(hud.element.innerHTML).toContain('transform:rotate(1.5707963267948966rad)');
    expect(hud.element.innerHTML).toContain('speed-warning');
    expect(hud.element.innerHTML).toContain('怒氣 <b>55</b>');
  });

  it('clamps meter widths and clears the anger warning at 35 km/h', () => {
    const { hud } = mountHud();
    hud.update({ ...data, speed: 35 / 0.35, crewAnger: 150, cargoVolume: 200 });
    expect(hud.element.innerHTML).not.toContain('speed-warning');
    expect(hud.element.innerHTML.match(/width:100%/g)).toHaveLength(2);
  });

  it('shows the completion report and only attaches restart once for unchanged results', () => {
    const { hud, nodes, restart } = mountHud();
    expect(nodes[1].hidden).toBe(true);
    const completed = { ...data, settlement: { score: 88, totalSeconds: 120, totalDelaySeconds: 5, peakAnger: 55, stationCount: 3 } };
    hud.update(completed);
    hud.update(completed);
    expect(nodes[1].hidden).toBe(false);
    expect(nodes[1].innerHTML).toContain('收運報告');
    expect(nodes[1].innerHTML).toContain('<b>88</b>');
    expect(restart).toHaveBeenCalledTimes(1);
  });
});
