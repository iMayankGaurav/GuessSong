// server/src/config/scoring.js
export const STAGES = [0.1, 0.5, 2, 8, 10, 20];          // clip seconds
export const BASE_POINTS = [1000, 800, 600, 400, 250, 100];
export const ROUNDS_CLASSIC = 5;
export const ROUNDS_ENDLESS_MAX = 50;
export const TIME_BONUS_MAX = 0.1;        // up to +10%
export const TIME_BONUS_WINDOW_SEC = 15;  // bonus fades to 0 over this time
export const STREAK_STEP = 0.1;           // +10% per streak
export const STREAK_CAP = 2;              // max 2x

export function calcPoints({ stage, elapsedSec, streakBefore }) {
    const base = BASE_POINTS[stage];
    const timeFactor = Math.max(0, 1 - elapsedSec / TIME_BONUS_WINDOW_SEC);
    const withTime = base * (1 + TIME_BONUS_MAX * timeFactor);
    const mult = Math.min(STREAK_CAP, 1 + STREAK_STEP * streakBefore);
    return Math.round(withTime * mult);
}