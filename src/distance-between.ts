import { Vector2D } from "./types";

/**
 * Calculate the distance between two points
 * @param point1 First point
 * @param point2 Second point
 * @returns The Euclidean distance between the points
 */

export function distanceBetween(point1: Vector2D, point2: Vector2D): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
