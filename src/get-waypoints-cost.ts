import { getShortestLineToPath } from "./get-shortest-line-to-path.ts";
import { Vector2D } from "./types.ts";

/**
 * Calculates the cost of not following the waypoints.
 *
 * @param waypoints - The waypoints to follow.
 * @param position - The current position.
 * @param velocity - The current velocity.
 * @param waypointsDistanceWeight - The weight of the distance to the waypoints.
 * @param waypointsVelocityWeight - The weight of the velocity towards the waypoints.
 */
export const getWaypointsFollowingCost = (
  waypoints: Vector2D[],
  position: Vector2D,
  velocity: Vector2D,
  waypointsDistanceWeight: number,
  waypointsVelocityWeight: number,
) => {
  // Skip if there are not enough waypoints
  if (waypoints.length < 2) {
    return 0;
  }

  try {
    // Get the closest point on the path and associated segment
    const { shortestDistance, crossSectionPoint, segment } =
      getShortestLineToPath(waypoints, position);

    // Safety check - if any key data is missing, just return distance-based cost
    if (!crossSectionPoint || !segment) {
      return waypointsDistanceWeight * Math.sqrt(shortestDistance);
    }

    // Calculate the basic distance cost using square root for better scaling
    // This is the primary component for off-path positions
    const distanceCost = waypointsDistanceWeight * Math.sqrt(shortestDistance);

    // Handle velocity-based cost components
    let velocityCost = 0;
    const velocityMagnitude = Math.sqrt(
      velocity.x * velocity.x + velocity.y * velocity.y,
    );

    if (velocityMagnitude > 0.001) {
      // Get normalized velocity vector
      const velocityNorm = {
        x: velocity.x / velocityMagnitude,
        y: velocity.y / velocityMagnitude,
      };

      // Get segment direction
      const segmentVector = {
        x: segment.end.x - segment.start.x,
        y: segment.end.y - segment.start.y,
      };

      // Safe segment length calculation
      const segmentLength = Math.sqrt(
        segmentVector.x * segmentVector.x + segmentVector.y * segmentVector.y,
      );

      // Skip further calculation if segment is too short
      if (segmentLength < 0.001) {
        return distanceCost;
      }

      // Normalize segment direction
      const segmentNorm = {
        x: segmentVector.x / segmentLength,
        y: segmentVector.y / segmentLength,
      };

      // Calculate alignment between velocity and segment direction
      // 1 = perfect alignment, 0 = perpendicular, -1 = opposite
      const alignmentDot =
        velocityNorm.x * segmentNorm.x + velocityNorm.y * segmentNorm.y;

      // Create adaptive velocity expectations based on segment length
      // Longer segments expect higher velocities
      const expectedVelocity = Math.min(15, segmentLength / 10);

      // Calculate velocity cost based on alignment and magnitude
      if (alignmentDot > 0) {
        // Reward velocity in the right direction, using segment length as scale
        // More velocity in the right direction = lower cost
        velocityCost =
          waypointsVelocityWeight *
          (1 - Math.min(1, velocityMagnitude / expectedVelocity));
      } else {
        // Penalize velocity in the wrong direction
        // More velocity in the wrong direction = higher cost
        velocityCost =
          waypointsVelocityWeight *
          (1 + (Math.abs(alignmentDot) * velocityMagnitude) / 5);
      }

      // If we're off the path, add a component for velocity toward/away from path
      if (shortestDistance > 0.001) {
        // Vector from position to nearest point on path
        const toPathVector = {
          x: crossSectionPoint.x - position.x,
          y: crossSectionPoint.y - position.y,
        };

        // Normalize to-path vector
        const toPathDistance = Math.sqrt(
          toPathVector.x * toPathVector.x + toPathVector.y * toPathVector.y,
        );

        const toPathNorm = {
          x: toPathVector.x / toPathDistance,
          y: toPathVector.y / toPathDistance,
        };

        // Alignment with path direction
        const pathAlignmentDot =
          velocityNorm.x * toPathNorm.x + velocityNorm.y * toPathNorm.y;

        // Adjust cost based on whether we're moving toward or away from path
        // Scale by distance - more important when further from path
        const pathDirectionFactor =
          -pathAlignmentDot * Math.min(1, shortestDistance / 50);

        // Scale by velocity magnitude - faster movement toward path is better
        const pathVelocityFactor =
          pathAlignmentDot > 0
            ? Math.min(1, velocityMagnitude / expectedVelocity)
            : 0;

        velocityCost +=
          waypointsVelocityWeight *
          pathDirectionFactor *
          (1 + pathVelocityFactor);
      }
    }

    return distanceCost + velocityCost;
  } catch (error) {
    // If anything goes wrong, fall back to a simple distance-based cost
    console.error("Error in getWaypointsFollowingCost:", error);
    const { shortestDistance } = getShortestLineToPath(waypoints, position);
    return waypointsDistanceWeight * Math.sqrt(shortestDistance);
  }
};
