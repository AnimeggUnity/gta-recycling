export type ControlMode = 'touch' | 'keyboard';
export type DeviceEnvironment = Readonly<{
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  coarsePointer: boolean;
  shortSide: number;
  mobileHint?: boolean;
}>;

export function detectDevice(environment: DeviceEnvironment): 'mobile' | 'desktop' {
  const mobileAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(environment.userAgent);
  const ipadDesktopAgent = /Mac/i.test(environment.platform) && environment.maxTouchPoints > 1;
  const smallTouchDevice = environment.coarsePointer && environment.maxTouchPoints > 0 && environment.shortSide <= 1024;
  return environment.mobileHint || mobileAgent || ipadDesktopAgent || smallTouchDevice ? 'mobile' : 'desktop';
}

export function initialDevice(): 'mobile' | 'desktop' {
  const hints = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return detectDevice({
    userAgent: navigator.userAgent, platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    shortSide: Math.min(window.innerWidth, window.innerHeight),
    mobileHint: hints.userAgentData?.mobile,
  });
}
