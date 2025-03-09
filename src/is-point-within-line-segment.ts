import { distanceBetween } from "./distance-between";
import { Vector2D } from "./types";

/** Helper function to check if a point is on a line segment **/
export const isPointWithinLineSegment = (
  point: Vector2D,
  lineStart: Vector2D,
  lineEnd: Vector2D,
): boolean => {
  const d1 = distanceBetween(point, lineStart);
  const d2 = distanceBetween(point, lineEnd);
  const lineLength = distanceBetween(lineStart, lineEnd);
  // Allow for small floating-point errors
  return Math.abs(d1 + d2 - lineLength) < 0.1;
};
