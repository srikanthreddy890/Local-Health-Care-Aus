/** Number of loyalty points equal to $1 AUD */
export const POINTS_PER_DOLLAR = 5

/** Convert points to AUD string (e.g. "4.00") */
export const pointsToAud = (pts: number) =>
  (Math.abs(pts) / POINTS_PER_DOLLAR).toFixed(2)
