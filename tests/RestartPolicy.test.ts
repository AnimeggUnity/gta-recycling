import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeFailureRestart, restartMission } from '../src/ui/RestartPolicy';

function mount(state: Record<string, unknown> | null = null) {
  const history = { state, replaceState: vi.fn((next: Record<string, unknown>) => { history.state = next; }) };
  const reload = vi.fn();
  vi.stubGlobal('window', { history, location: { reload } });
  return { history, reload };
}
afterEach(() => vi.unstubAllGlobals());
describe('failure restart rules', () => {
  it('skips rules for only the reload triggered by a failure restart', () => {
    const { history, reload } = mount({ unrelated: 7 });
    restartMission(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(consumeFailureRestart()).toBe(true);
    expect(history.state).toEqual({ unrelated: 7 });
    expect(consumeFailureRestart()).toBe(false);
  });
  it('does not skip rules for an ordinary load or successful mission restart', () => {
    mount();
    expect(consumeFailureRestart()).toBe(false);
    restartMission(false);
    expect(consumeFailureRestart()).toBe(false);
  });
});
