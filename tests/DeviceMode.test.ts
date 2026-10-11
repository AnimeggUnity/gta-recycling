import { describe, expect, it } from 'vitest';
import { detectDevice, type DeviceEnvironment } from '../src/ui/DeviceMode';

const desktop: DeviceEnvironment = {
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64',
  maxTouchPoints: 0, coarsePointer: false, shortSide: 800,
};

describe('initial device detection', () => {
  it('keeps desktop keyboards even when the browser window is narrow', () => {
    expect(detectDevice({ ...desktop, shortSide: 320 })).toBe('desktop');
  });
  it.each(['iPhone', 'Android', 'iPad'])('detects a %s mobile user agent', (agent) => {
    expect(detectDevice({ ...desktop, userAgent: agent })).toBe('mobile');
  });
  it('detects an iPad requesting desktop pages', () => {
    expect(detectDevice({ ...desktop, platform: 'MacIntel', maxTouchPoints: 5 })).toBe('mobile');
  });
  it('uses touch capability and pointer features as a fallback, not width alone', () => {
    expect(detectDevice({ ...desktop, maxTouchPoints: 5, coarsePointer: true, shortSide: 390 })).toBe('mobile');
    expect(detectDevice({ ...desktop, maxTouchPoints: 5, coarsePointer: false })).toBe('desktop');
  });
  it('honors a browser mobile hint', () => {
    expect(detectDevice({ ...desktop, mobileHint: true })).toBe('mobile');
  });
});
