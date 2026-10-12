const SKIP_INTRO = 'gtaSkipIntroOnce';

/** A one-reload flag, not a permanent "don't show rules" preference. */
export function restartMission(afterFailure: boolean): void {
  window.history.replaceState({ ...window.history.state, [SKIP_INTRO]: afterFailure }, '');
  window.location.reload();
}

export function consumeFailureRestart(): boolean {
  const state = window.history.state;
  if (state?.[SKIP_INTRO] !== true) return false;
  const { [SKIP_INTRO]: _consumed, ...remaining } = state;
  window.history.replaceState(remaining, '');
  return true;
}
