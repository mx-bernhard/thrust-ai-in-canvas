import { Rectangle, Vector2D } from "../types";

/**
 * Calculates the cost of being close to obstacles.
 *
 * @param position - The current position
 * @param obstacles - The obstacles to avoid
 * @param obstacleWeight - The weight for obstacle avoidance cost
 * @param obstacleMargin - The margin from obstacles to start applying cost
 * @returns The obstacle avoidance cost
 */
export const calculateObstacleAvoidanceCost = (
  position: Vector2D,
  obstacles: Rectangle[],
  obstacleWeight: number,
  obstacleMargin: number,
): number => {
  let totalCost = 0;

  for (const obstacle of obstacles) {
    // Calculate closest point on rectangle to position
    const dx = Math.max(
      obstacle.x - position.x,
      0,
      position.x - (obstacle.x + obstacle.width),
    );
    const dy = Math.max(
      obstacle.y - position.y,
      0,
      position.y - (obstacle.y + obstacle.height),
    );
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Add cost if within margin
    // Use quadratic scaling to match position costs:
    // 1. Cost increases as the square of distance penetration into margin
    // 2. Creates a smooth barrier that grows stronger near obstacles
    // 3. Makes weight directly comparable with position weight
    if (distance < obstacleMargin) {
      const penetration = obstacleMargin - distance;
      totalCost += obstacleWeight * Math.pow(penetration, 2);
    }
  }

  return totalCost;
};
