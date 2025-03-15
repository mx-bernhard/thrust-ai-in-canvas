import { Vector2D } from "../types";

/**
 * Calculates the cost of being close to canvas boundaries.
 *
 * @param position - The current position
 * @param canvasWidth - The width of the canvas
 * @param canvasHeight - The height of the canvas
 * @param boundaryWeight - The weight for boundary avoidance cost
 * @param boundaryMargin - The margin from boundaries to start applying cost
 * @returns The boundary avoidance cost
 */
export const calculateBoundaryAvoidanceCost = (
  position: Vector2D,
  canvasWidth: number,
  canvasHeight: number,
  boundaryWeight: number,
  boundaryMargin: number,
): number => {
  let totalCost = 0;

  // Distance to each boundary
  const leftDist = position.x;
  const rightDist = canvasWidth - position.x;
  const topDist = position.y;
  const bottomDist = canvasHeight - position.y;

  // Add quadratic costs when within margin of any boundary
  // The cost scales with the square of penetration into the margin area
  // This creates a cost function that:
  // 1. Has the same quadratic scaling as position costs
  // 2. Creates a soft barrier that strengthens as the ship approaches boundaries
  // 3. Allows weights to be directly compared with position weight

  if (leftDist < boundaryMargin) {
    const penetration = boundaryMargin - leftDist;
    totalCost += boundaryWeight * Math.pow(penetration, 2);
  }
  if (rightDist < boundaryMargin) {
    const penetration = boundaryMargin - rightDist;
    totalCost += boundaryWeight * Math.pow(penetration, 2);
  }
  if (topDist < boundaryMargin) {
    const penetration = boundaryMargin - topDist;
    totalCost += boundaryWeight * Math.pow(penetration, 2);
  }
  if (bottomDist < boundaryMargin) {
    const penetration = boundaryMargin - bottomDist;
    totalCost += boundaryWeight * Math.pow(penetration, 2);
  }

  return totalCost;
};
