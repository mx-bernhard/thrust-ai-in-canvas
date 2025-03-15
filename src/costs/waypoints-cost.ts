import { Vector2D } from "../types";
import { getWaypointsFollowingCost } from "../get-waypoints-cost";

/**
 * Calculates the cost of not following waypoints.
 *
 * @param position - The current position
 * @param velocity - The current velocity
 * @param waypoints - The waypoints to follow
 * @param waypointsDistanceWeight - The weight for distance to waypoints
 * @param waypointsVelocityWeight - The weight for velocity towards waypoints
 * @returns The waypoints following cost
 */
export const calculateWaypointsCost = (
  position: Vector2D,
  velocity: Vector2D,
  waypoints: Vector2D[],
  waypointsDistanceWeight: number,
  waypointsVelocityWeight: number,
): number => {
  return getWaypointsFollowingCost(
    waypoints,
    position,
    velocity,
    waypointsDistanceWeight,
    waypointsVelocityWeight,
  );
};
