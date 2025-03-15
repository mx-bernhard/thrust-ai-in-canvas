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
      // Use quadratic scaling for consistency with other cost functions
      return waypointsDistanceWeight * shortestDistance;
    }

    // Calculate distance cost with quadratic scaling
    // This creates a bowl-shaped cost function that:
    // 1. Increases with the square of distance from the path
    // 2. Provides a smooth gradient toward the path
    // 3. Is consistent with other quadratic costs in the system
    const distanceCost = waypointsDistanceWeight * shortestDistance;

    // Handle velocity-based cost components
    let velocityCost = 0;
    const velocityMagnitude = Math.sqrt(
      velocity.x * velocity.x + velocity.y * velocity.y,
    );

    if (velocityMagnitude > 0.001) {
      // Normalize velocity for direction calculations
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

      // Calculate dot product for alignment with segment
      const alignmentDot =
        velocityNorm.x * segmentNorm.x + velocityNorm.y * segmentNorm.y;

      // Create adaptive velocity expectations based on segment length
      const expectedVelocity = segmentLength;

      // Create the expected velocity vector in the direction of the segment
      const expectedVelocityVector = {
        x: segmentNorm.x * expectedVelocity,
        y: segmentNorm.y * expectedVelocity,
      };

      // Calculate velocity difference vector
      const velocityDiff = {
        x: velocity.x - expectedVelocityVector.x,
        y: velocity.y - expectedVelocityVector.y,
      };

      // Calculate the squared magnitude of the difference vector
      const velocityDeviation =
        velocityDiff.x * velocityDiff.x + velocityDiff.y * velocityDiff.y;

      // Apply a strongly non-linear scaling based on alignment
      // This creates a steep drop-off for well-aligned velocity (alignmentDot near 1)
      // For alignmentDot = 1, this will be close to 0
      // For alignmentDot = 0, this will be 1
      // For alignmentDot = -1, this will be 4
      const alignmentScaling =
        Math.pow(1.0 - Math.max(0, alignmentDot), 4) +
        Math.pow(Math.max(0, -alignmentDot), 2);

      // Combine deviation and alignment in a way that:
      // 1. Gives very low costs for well-aligned velocity with good magnitude (< 10)
      // 2. Gives higher costs for misaligned velocity
      // 3. Penalizes opposed velocity strongly
      const scaledDeviation =
        velocityDeviation * 0.005 + alignmentScaling * 500;

      // Scale the penalty by the weight
      velocityCost = waypointsVelocityWeight * scaledDeviation;

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

        // Calculate alignment with path direction
        const pathAlignmentDot =
          velocityNorm.x * toPathNorm.x + velocityNorm.y * toPathNorm.y;

        // Calculate a distance scaling factor that increases with distance from path
        // This creates a stronger urge to return to the path when far away
        // and less influence when close to the path
        const distanceScaleFactor = Math.min(1, shortestDistance / 100);

        // Unified approach without conditionals:
        // 1. Create a continuous function that transitions smoothly from rewards to penalties
        // 2. Apply a cubic function to pathAlignmentDot that creates a strong asymmetry:
        //    - Positive alignment (toward path) creates a strong negative cost (reward)
        //    - Negative alignment (away from path) creates a strong positive cost (penalty)
        //    - Near-zero alignment creates minimal adjustment

        // This function creates:
        // - Strong negative costs (rewards) when aligned toward the path
        // - Strong positive costs (penalties) when aligned away from the path
        // - Smooth transition around zero with minimal effect for near-perpendicular movement
        const alignmentFactor =
          Math.pow(pathAlignmentDot, 3) * velocityMagnitude;

        // Create a continuous multiplier that varies based on alignment
        // Using a sigmoid-like function that transitions smoothly from 200 to 500
        // 500 when moving toward path (pathAlignmentDot > 0)
        // 200 when moving away from path (pathAlignmentDot < 0)
        // The function (300 * tanh(pathAlignmentDot * 3) + 350) accomplishes this transition smoothly
        const continuousMultiplier =
          300 * Math.tanh(pathAlignmentDot * 3) + 350;

        // Apply the continuous multiplier to the alignment factor
        const pathEffect = alignmentFactor * continuousMultiplier;

        // Apply the effect, which will be:
        // - Negative (reducing cost) when moving toward the path
        // - Positive (increasing cost) when moving away from the path
        velocityCost -=
          waypointsVelocityWeight * pathEffect * distanceScaleFactor;
      }
    }

    return distanceCost + velocityCost;
  } catch (error) {
    // If anything goes wrong, fall back to a simple distance-based cost with quadratic scaling
    console.error("Error in getWaypointsFollowingCost:", error);
    const { shortestDistance } = getShortestLineToPath(waypoints, position);
    return waypointsDistanceWeight * shortestDistance;
  }
};
