import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntroPanel } from '../src/ui/IntroPanel';
import { selectDifficulty } from '../src/ui/Difficulty';
import { selectGameMode } from '../src/ui/GameMode';
vi.mock('../src/ui/Difficulty', () => ({ selectDifficulty: vi.fn() }));
vi.mock('../src/ui/GameMode', () => ({ selectGameMode: vi.fn() }));

function mount(device = 'desktop', skip = false, difficulty: 'easy' | 'normal' = 'normal') {
  const listeners = new Map<string, (event: any) => void>();
  const element = { className: '', innerHTML: '', hidden: false, tabIndex: -1, setAttribute: vi.fn(), focus: vi.fn(), blur: vi.fn(), addEventListener: (name: string, fn: (event: any) => void) => listeners.set(name, fn) };
  const body = { dataset: { device, intro: '' }, append: vi.fn() };
  vi.stubGlobal('document', { createElement: () => element, body });
  const onStart = vi.fn(); const panel = new IntroPanel(onStart, skip, undefined, 'recycling', difficulty);
  const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
  return { panel, element, body, onStart, listeners, event };
}
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('opening rules', () => {
  it('starts a failure retry immediately without mounting or focusing the rules card', () => {
    const { panel, element, body, onStart } = mount('mobile', true);
    expect(panel.started).toBe(true);
    expect(element.hidden).toBe(true);
    expect(body.append).not.toHaveBeenCalled();
    expect(element.focus).not.toHaveBeenCalled();
    expect(body.dataset.intro).toBe('false');
    expect(onStart).toHaveBeenCalledTimes(1);
  });
  it('waits for the explicit start button and consumes its gesture exactly once', () => {
    const { panel, element, body, onStart, listeners, event } = mount();
    expect(panel.started).toBe(false);
    expect(body.dataset.intro).toBe('true');
    expect(element.innerHTML).toContain('怒氣到 100%');
    expect(element.innerHTML).toContain('撞到汽機車、建築物');
    expect(listeners.has('pointerdown')).toBe(false);
    const startEvent = { ...event, target: { closest: (selector: string) => selector === '[data-intro-start]' ? {} : null } };
    listeners.get('click')!(startEvent); listeners.get('click')!(startEvent);
    expect(panel.started).toBe(true);
    expect(element.hidden).toBe(true);
    expect(body.dataset.intro).toBe('false');
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalled();
  });
  it('ignores background and rules taps and keeps the clock stopped', () => {
    const { panel, listeners, onStart, event } = mount('mobile');
    listeners.get('click')!(event);
    listeners.get('click')!({ ...event, target: { closest: () => null } });
    expect(panel.started).toBe(false); expect(onStart).not.toHaveBeenCalled();
  });
  it('difficulty selection keeps the mission stopped, including keyboard focus', () => {
    const { panel, listeners, onStart, event } = mount();
    const target = { closest: (selector: string) => selector === 'button[data-difficulty]' ? { dataset: { difficulty: 'easy' } } : null };
    listeners.get('click')!({ ...event, target });
    expect(selectDifficulty).toHaveBeenCalledWith('easy');
    listeners.get('keydown')!({ ...event, target, key: 'Enter', code: 'Enter' });
    expect(panel.started).toBe(false);expect(onStart).not.toHaveBeenCalled();
  });
  it('explains automatic driving while leaving collection work to the player', () => {
    const {element} = mount('mobile', false, 'easy');
    expect(element.innerHTML).toContain('分類與甩袋由你操作');
    expect(element.innerHTML).toContain('暫停行駛／繼續行駛');
    expect(element.innerHTML).not.toContain('沿圓周旋轉');
  });
  it('vehicle selection never starts a mission', () => {
    const { panel, listeners, onStart, event } = mount('mobile');
    const choice = { dataset: { mode: 'garbage' } };
    const target = { closest: (selector: string) => selector === '[data-mode]' ? choice : null };
    listeners.get('click')!({ ...event, target });
    expect(selectGameMode).toHaveBeenCalledWith('garbage');
    expect(panel.started).toBe(false); expect(onStart).not.toHaveBeenCalled();
    listeners.get('keydown')!({ ...event, target, key: 'Enter', code: 'Enter' });
    expect(onStart).not.toHaveBeenCalled();
  });
  it.each([{key:'Enter',code:'Enter'}, {key:' ',code:'Space'}])('supports the explicit keyboard start key $code', (key) => {
    const { listeners, onStart, event } = mount();
    listeners.get('keydown')!({ ...event, key:'w', code:'KeyW' });
    expect(onStart).not.toHaveBeenCalled();
    listeners.get('keydown')!({ ...event, ...key });
    expect(onStart).toHaveBeenCalledTimes(1);
  });
  it('uses touch instructions for mobile devices', () => {
    const { element } = mount('mobile');
    expect(element.innerHTML).toContain('沿方向盤圓周旋轉');
    expect(element.innerHTML).toContain('開始回收車收運');
    expect(element.innerHTML).not.toContain('點畫面任意位置開始');
  });
});
