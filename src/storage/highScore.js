const HIGH_SCORE_KEY = 'orbital-cadet-high-score';

export function getHighScore() {
  const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
  const value = Number.parseInt(stored ?? '0', 10);
  return Number.isFinite(value) ? value : 0;
}

export function saveHighScore(score) {
  const nextHighScore = Math.max(getHighScore(), Math.max(0, Math.floor(score)));
  window.localStorage.setItem(HIGH_SCORE_KEY, String(nextHighScore));
  return nextHighScore;
}