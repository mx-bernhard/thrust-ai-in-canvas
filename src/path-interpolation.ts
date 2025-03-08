import { distanceBetween } from "./distance-between";
import { getShortestLineToPath } from "./get-shortest-line-to-path";
import { Vector2D } from "./types";

/**
 * PathInterpolator class handles interpolation along a path of waypoints
 * to create smoother trajectories for the ship.
 */
export class PathInterpolator {
  private readonly lookaheadDistance: number;
  private readonly maxDistanceToPath: number;

  /**
   * Creates a new PathInterpolator
   * @param lookaheadDistance The distance to look ahead on the path
   * @param maxDistanceToPath The maximum distance to the path before replanning is required
   */
  constructor(lookaheadDistance: number = 150, maxDistanceToPath: number) {
    this.lookaheadDistance = lookaheadDistance;
    this.maxDistanceToPath = maxDistanceToPath;
  }

  /**
   * Get an interpolated target point along the path at a fixed distance from the current position
   * @param currentPosition The current position of the ship
   * @param waypoints Array of waypoints defining the path
   * @param currentWaypointIndex Index of the current waypoint
   * @param finalTarget The final target position (used if we've reached the end of waypoints)
   * @returns An interpolated target point at the lookahead distance
   */
  public getInterpolatedTarget(
    currentPosition: Vector2D,
    waypoints: Vector2D[],

    finalTarget: Vector2D,
  ): Vector2D {
    // If no waypoints, return the final target
    if (waypoints.length === 0) {
      return finalTarget;
    }

    const {
      shortestDistance: shortestDistanceToPath,
      crossSectionPoint: closestPointOnPath,
      segment,
    } = getShortestLineToPath(waypoints, currentPosition);

    let perpendicularDistanceCandidate: number = shortestDistanceToPath;
    let waypointIndexCandidate: number = waypoints.findIndex(
      ({ x, y }) => x === segment?.start.x && y === segment?.start.y,
    );

    if (
      closestPointOnPath != null &&
      waypointIndexCandidate >= 0 &&
      waypointIndexCandidate < waypoints.length - 1
    ) {
      let distanceToNextWaypoint = distanceBetween(
        closestPointOnPath,
        waypoints[waypointIndexCandidate + 1],
      );
      if (perpendicularDistanceCandidate < this.lookaheadDistance) {
        let remainingDistance =
          this.lookaheadDistance - perpendicularDistanceCandidate;
        let currentPoint = closestPointOnPath;
        while (
          remainingDistance > 0 &&
          waypointIndexCandidate < waypoints.length - 1
        ) {
          if (remainingDistance > distanceToNextWaypoint) {
            remainingDistance -= distanceToNextWaypoint;
            waypointIndexCandidate++;
            currentPoint = waypoints[waypointIndexCandidate];
            distanceToNextWaypoint = distanceBetween(
              currentPoint,
              waypoints[waypointIndexCandidate + 1],
            );
          } else {
            // Interpolate between the current waypoint and the next waypoint for the remaining distance
            return getVectorBetweenPoints(
              waypoints[waypointIndexCandidate + 1],
              currentPoint,
              currentPoint,
              remainingDistance,
            );
          }
        }
      } else {
      }
    }
    // If we've reached the final waypoint, return the final target
    return finalTarget;
  }

  /**
   * Check if the ship has deviated too far from the path and needs replanning
   * @param currentPosition The current position of the ship
   * @param waypoints Array of waypoints defining the path
   * @returns True if replanning is needed, false otherwise
   */
  public needsReplanning(
    currentPosition: Vector2D,
    waypoints: Vector2D[],
  ): boolean {
    const { shortestDistance } = getShortestLineToPath(
      waypoints,
      currentPosition,
    );
    return shortestDistance > this.maxDistanceToPath;
  }

  /**
   * Get the lookahead distance
   * @returns The current lookahead distance
   */
  public getLookaheadDistance(): number {
    return this.lookaheadDistance;
  }
}
export function getVectorBetweenPoints(
  point1: Vector2D,
  point2: { x: number; y: number },
  currentPoint: { x: number; y: number },
  length: number,
) {
  const directionVector = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
  };
  const directionVectorLength = distanceBetween(
    { x: 0, y: 0 },
    directionVector,
  );
  const result = {
    x: currentPoint.x + (directionVector.x * length) / directionVectorLength,
    y: currentPoint.y + (directionVector.y * length) / directionVectorLength,
  };
  return result;
}
