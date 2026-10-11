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

function mountHud() {
  const nodes: { innerHTML: string; hidden: boolean; className: string; querySelector: ReturnType<typeof vi.fn> }[] = [];
  const restart = vi.fn();
  vi.stubGlobal('document', {
    createElement: () => {
      const node = { innerHTML: '', hidden: false, className: '', querySelector: vi.fn(() => ({ addEventListener: restart })) };
      nodes.push(node);
      return node;
    },
    body: { append: vi.fn() },
  });
  return { hud: new Hud(), nodes, restart };
}

afterEach(() => vi.unstubAllGlobals());

describe('HUD presentation', () => {
  it('uses real vehicle coordinates and route points in the minimap', () => {
    const { hud } = mountHud();
    hud.update(data);
    expect(hud.element.innerHTML).toContain('translate(67 149) rotate(-90)');
    expect(hud.element.innerHTML).toContain('points="67,149 130,149"');
    expect(hud.element.innerHTML).toContain('transform:rotate(1.5707963267948966rad)');
    expect(hud.element.innerHTML).toContain('speed-warning');
    expect(hud.element.innerHTML).toContain('怒氣 <b>55</b>');
  });

  it('clamps meter widths and clears the overspeed warning at 40 km/h', () => {
    const { hud } = mountHud();
    hud.update({ ...data, speed: 40 / 0.35, crewAnger: 150, cargoVolume: 200 });
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
