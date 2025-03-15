import { GameState, Rectangle } from "../types";

/**
 * Calculates the cost of being on a collision course with obstacles.
 *
 * @param state - The current game state
 * @param obstacles - The obstacles to avoid
 * @param collisionCourseWeight - The weight for collision course cost
 * @param collisionTimeHorizon - The time horizon for collision detection
 * @param shipRadius - The radius of the ship for collision detection
 * @returns The collision course cost
 */
export const calculateCollisionCourseCost = (
  state: GameState,
  obstacles: Rectangle[],
  collisionCourseWeight: number,
  collisionTimeHorizon: number,
  shipRadius: number,
): number => {
  if (obstacles.length === 0) return 0;

  const position = state.position;
  const velocity = state.velocity;

  // If velocity is very small, no collision course
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed < 0.1) return 0;

  let totalCost = 0;

  // Check for collision course with each obstacle
  for (const obstacle of obstacles) {
    // Expand obstacle by ship radius
    const expandedObstacle = {
      x: obstacle.x - shipRadius,
      y: obstacle.y - shipRadius,
      width: obstacle.width + 2 * shipRadius,
      height: obstacle.height + 2 * shipRadius,
    };

    // Calculate time to potential collision
    // Project the velocity vector and see where it intersects with the obstacle

    // Normalized velocity direction
    const vx = velocity.x / speed;
    const vy = velocity.y / speed;

    // Check intersection with each edge of the expanded obstacle
    const edges = [
      // Top edge
      {
        p1: { x: expandedObstacle.x, y: expandedObstacle.y },
        p2: {
          x: expandedObstacle.x + expandedObstacle.width,
          y: expandedObstacle.y,
        },
      },
      // Right edge
      {
        p1: {
          x: expandedObstacle.x + expandedObstacle.width,
          y: expandedObstacle.y,
        },
        p2: {
          x: expandedObstacle.x + expandedObstacle.width,
          y: expandedObstacle.y + expandedObstacle.height,
        },
      },
      // Bottom edge
      {
        p1: {
          x: expandedObstacle.x + expandedObstacle.width,
          y: expandedObstacle.y + expandedObstacle.height,
        },
        p2: {
          x: expandedObstacle.x,
          y: expandedObstacle.y + expandedObstacle.height,
        },
      },
      // Left edge
      {
        p1: {
          x: expandedObstacle.x,
          y: expandedObstacle.y + expandedObstacle.height,
        },
        p2: { x: expandedObstacle.x, y: expandedObstacle.y },
      },
    ];

    // Find minimum time to collision with any edge
    let minTimeToCollision = Infinity;

    for (const edge of edges) {
      // Ray-line segment intersection
      const x1 = edge.p1.x - position.x;
      const y1 = edge.p1.y - position.y;
      const x2 = edge.p2.x - position.x;
      const y2 = edge.p2.y - position.y;

      // Cross products to determine if ray intersects line segment
      const cross1 = x1 * vy - y1 * vx;
      const cross2 = x2 * vy - y2 * vx;

      // If signs are different, there's an intersection
      if (cross1 * cross2 <= 0) {
        // Calculate intersection point
        const dx = x2 - x1;
        const dy = y2 - y1;

        // Avoid division by zero
        if (Math.abs(dx * vy - dy * vx) < 1e-6) continue;

        // Parameter along the line segment
        const t = (x1 * vy - y1 * vx) / (dy * vx - dx * vy);

        // Ensure intersection is on the line segment
        if (t < 0 || t > 1) continue;

        // Intersection point
        const ix = edge.p1.x + t * dx;
        const iy = edge.p1.y + t * dy;

        // Distance to intersection
        const dist = Math.hypot(ix - position.x, iy - position.y);

        // Time to collision
        const timeToCollision = dist / speed;

        // Update minimum time if this is smaller
        if (timeToCollision < minTimeToCollision && timeToCollision > 0) {
          minTimeToCollision = timeToCollision;
        }
      }
    }

    // If we found a collision within our time horizon
    if (minTimeToCollision < collisionTimeHorizon) {
      // Calculate a spatial factor that represents effectively how close we are to collision
      // This creates a virtual "distance to collision" that can be treated similarly to position costs

      // Estimated distance to collision point (assumes constant velocity)
      const distanceToCollision = minTimeToCollision * speed;

      // Scale the distance relative to the time horizon and ship size
      // This creates a spatial reference similar to position cost scaling
      const effectiveMargin = Math.max(
        shipRadius * 10,
        (collisionTimeHorizon * speed) / 2,
      );

      // Create a quadratic cost based on how close we are to collision
      // This scales similarly to position cost (but inverted - smaller distance = higher cost)
      // Also limit the maximum value to avoid extreme costs
      const collisionDistanceFactor = Math.min(
        effectiveMargin,
        Math.max(0, effectiveMargin - distanceToCollision),
      );

      // Now square it to match the quadratic scaling of position costs
      totalCost += collisionCourseWeight * Math.pow(collisionDistanceFactor, 2);
    }
  }

  return totalCost;
};
