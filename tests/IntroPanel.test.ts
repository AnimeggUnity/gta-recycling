import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntroPanel } from '../src/ui/IntroPanel';

function mount(device = 'desktop') {
  const listeners = new Map<string, (event: any) => void>();
  const element = { className: '', innerHTML: '', hidden: false, tabIndex: -1, setAttribute: vi.fn(), focus: vi.fn(), blur: vi.fn(), addEventListener: (name: string, fn: (event: any) => void) => listeners.set(name, fn) };
  const body = { dataset: { device, intro: '' }, append: vi.fn() };
  vi.stubGlobal('document', { createElement: () => element, body });
  const onStart = vi.fn(); const panel = new IntroPanel(onStart);
  const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
  return { panel, element, body, onStart, listeners, event };
}
afterEach(() => vi.unstubAllGlobals());
describe('opening rules', () => {
  it('waits for a click and starts exactly once, consuming the start gesture', () => {
    const { panel, element, body, onStart, listeners, event } = mount();
    expect(panel.started).toBe(false);
    expect(body.dataset.intro).toBe('true');
    expect(element.innerHTML).toContain('怒氣到 100%');
    expect(element.innerHTML).toContain('撞到汽機車、建築物');
    expect(listeners.has('pointerdown')).toBe(false);
    listeners.get('click')!(event); listeners.get('click')!(event);
    expect(panel.started).toBe(true);
    expect(element.hidden).toBe(true);
    expect(body.dataset.intro).toBe('false');
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalled();
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
    expect(element.innerHTML).toContain('方向盤轉向');
    expect(element.innerHTML).toContain('點畫面任意位置開始');
  });
});
