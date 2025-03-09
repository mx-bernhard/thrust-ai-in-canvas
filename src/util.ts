export const normalizeAngle = (angle: number) =>
  ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
