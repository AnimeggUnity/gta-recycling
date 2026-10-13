export type Difficulty = 'normal' | 'easy';

export function readDifficulty(): Difficulty {
  return new URL(window.location.href).searchParams.get('difficulty') === 'easy' ? 'easy' : 'normal';
}

export function selectDifficulty(difficulty: Difficulty): void {
  if (difficulty === readDifficulty()) return;
  const url = new URL(window.location.href);
  url.searchParams.set('difficulty', difficulty);
  window.location.assign(url.href);
}
