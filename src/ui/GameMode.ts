export type GameMode = 'recycling' | 'garbage';

export function readGameMode(): GameMode {
  return new URL(window.location.href).searchParams.get('mode') === 'garbage' ? 'garbage' : 'recycling';
}

export function selectGameMode(mode: GameMode): void {
  if (mode === readGameMode()) return;
  const url = new URL(window.location.href);
  url.searchParams.set('mode', mode);
  window.location.assign(url.href);
}
