import { Vector2D } from "../types";

/**
 * Calculates the cost of being away from the target position.
 *
 * @param position - The current position
 * @param targetPosition - The target position to reach
 * @param positionWeight - The weight for position cost
 * @returns The position cost
 */
export const calculatePositionCost = (
  position: Vector2D,
  targetPosition: Vector2D,
  positionWeight: number,
): number => {
  // Target reaching cost - uses quadratic scaling
  // This creates a bowl-shaped cost function where:
  // 1. Cost increases with the square of distance from target
  // 2. The gradient points toward the target with increasing force as distance grows
  // 3. Weight directly scales the importance relative to other quadratic costs
  const dx = position.x - targetPosition.x;
  const dy = position.y - targetPosition.y;
  const squaredDistance = dx * dx + dy * dy;

  return positionWeight * squaredDistance;
};
