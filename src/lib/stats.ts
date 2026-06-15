// ============================================================
// STATISTICS UTILITIES
//
// Pearson correlation coefficient (r) measures the strength and
// direction of a LINEAR relationship between two variables.
//
//   r = +1   → perfect positive relationship (both rise together)
//   r =  0   → no linear relationship
//   r = -1   → perfect negative relationship (one rises, other falls)
//
// This is the core statistical tool for your research question:
// "does keystroke behavior correlate with self-reported state?"
// ============================================================

/**
 * Computes Pearson's r for two equal-length arrays of numbers.
 * Returns null if there isn't enough data (< 2 points) or if either
 * variable has zero variance (e.g. every value is identical — division
 * by zero would otherwise produce NaN).
 */
export function pearsonCorrelation(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 2 || y.length !== n) return null;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  const denominator = Math.sqrt(sumSqX * sumSqY);
  if (denominator === 0) return null;

  return numerator / denominator;
}

/**
 * Converts a raw r value into a plain-language description, following
 * commonly cited thresholds (Cohen, 1988) for behavioral research.
 * Returns a sentence fragment like "moderate positive correlation (r = 0.42)".
 */
export function interpretCorrelation(r: number | null): string {
  if (r === null) return "not enough data yet";

  const abs = Math.abs(r);
  let strength: string;

  if (abs < 0.1) strength = "negligible";
  else if (abs < 0.3) strength = "weak";
  else if (abs < 0.5) strength = "moderate";
  else if (abs < 0.7) strength = "strong";
  else strength = "very strong";

  const direction = r > 0 ? "positive" : r < 0 ? "negative" : "no";
  return `${strength} ${direction} correlation (r = ${r.toFixed(2)})`;
}

/**
 * Given an array of objects, extracts two numeric fields and returns
 * only the pairs where BOTH values are non-null. This is necessary
 * because keystroke_metrics rows can have null fields (e.g. wpm is
 * null if a session had zero typing — edge case but possible).
 */
export function extractPairs<T>(
  data: T[],
  xKey: keyof T,
  yKey: keyof T
): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];

  for (const row of data) {
    const xVal = row[xKey];
    const yVal = row[yKey];
    if (
      typeof xVal === "number" &&
      typeof yVal === "number" &&
      !isNaN(xVal) &&
      !isNaN(yVal)
    ) {
      x.push(xVal);
      y.push(yVal);
    }
  }

  return { x, y };
}