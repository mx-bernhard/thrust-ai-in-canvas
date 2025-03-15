import { Vector2D } from "../types";

/**
 * Calculates the cost of velocity.
 *
 * @param velocity - The current velocity
 * @param velocityWeight - The weight for velocity cost
 * @returns The velocity cost
 */
export const calculateVelocityCost = (
  velocity: Vector2D,
  velocityWeight: number,
): number => {
  return (
    Math.pow(velocity.x * velocityWeight, 2) +
    Math.pow(velocity.y * velocityWeight, 2)
  );
};
