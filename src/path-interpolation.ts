import { Vector2D } from "./types";

/**
 * PathInterpolator class handles interpolation along a path of waypoints
 * to create smoother trajectories for the ship.
 */
export class PathInterpolator {
  private readonly lookaheadDistance: number;

  /**
   * Creates a new PathInterpolator
   * @param lookaheadDistance The distance to look ahead on the path
   */
  constructor(lookaheadDistance: number = 150) {
    this.lookaheadDistance = lookaheadDistance;
  }

  /**
   * Calculate the distance between two points
   * @param point1 First point
   * @param point2 Second point
   * @returns The Euclidean distance between the points
   */
  public distanceBetween(point1: Vector2D, point2: Vector2D): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
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
    currentWaypointIndex: number,
    finalTarget: Vector2D,
  ): Vector2D {
    // If no waypoints, return the final target
    if (waypoints.length === 0) {
      return finalTarget;
    }

    // If we've reached the final waypoint, return the final target
    if (currentWaypointIndex >= waypoints.length) {
      return finalTarget;
    }

    // Start by checking the current waypoint
    let targetPoint = waypoints[currentWaypointIndex];
    let distanceToTarget = this.distanceBetween(currentPosition, targetPoint);

    // If the current waypoint is too close, look ahead on the path
    if (
      distanceToTarget < this.lookaheadDistance &&
      currentWaypointIndex < waypoints.length - 1
    ) {
      // Try to find a waypoint that's at least the lookahead distance away
      let nextWaypointIndex = currentWaypointIndex + 1;
      while (nextWaypointIndex < waypoints.length) {
        const nextWaypoint = waypoints[nextWaypointIndex];
        const distanceToNext = this.distanceBetween(
          currentPosition,
          nextWaypoint,
        );

        if (distanceToNext >= this.lookaheadDistance) {
          // Found a waypoint that's far enough
          break;
        }

        nextWaypointIndex++;
      }

      if (nextWaypointIndex < waypoints.length) {
        // We found a waypoint that's far enough away
        // Now interpolate between the current and next waypoint to get exactly the lookahead distance
        const currentWaypoint = waypoints[currentWaypointIndex];
        const nextWaypoint = waypoints[nextWaypointIndex];

        // If we're already past the current waypoint, use the next one as the target
        if (nextWaypointIndex === currentWaypointIndex + 1) {
          targetPoint = nextWaypoint;
        } else {
          // Otherwise, interpolate along the path
          // This is a simplified approach - for a more accurate solution, we would need to
          // consider the entire path and find the exact point at the lookahead distance
          const segmentLength = this.distanceBetween(
            currentWaypoint,
            nextWaypoint,
          );
          const t = this.lookaheadDistance / segmentLength;

          targetPoint = {
            x: currentWaypoint.x + t * (nextWaypoint.x - currentWaypoint.x),
            y: currentWaypoint.y + t * (nextWaypoint.y - currentWaypoint.y),
          };
        }
      } else if (nextWaypointIndex === waypoints.length) {
        // If we've gone through all waypoints, use the final target
        targetPoint = finalTarget;
      }
    } else if (distanceToTarget > this.lookaheadDistance) {
      // If the current waypoint is too far, interpolate between ship and waypoint
      const direction = {
        x: targetPoint.x - currentPosition.x,
        y: targetPoint.y - currentPosition.y,
      };

      // Normalize the direction vector
      const distance = Math.sqrt(
        direction.x * direction.x + direction.y * direction.y,
      );
      direction.x /= distance;
      direction.y /= distance;

      // Create a point at exactly the lookahead distance
      targetPoint = {
        x: currentPosition.x + direction.x * this.lookaheadDistance,
        y: currentPosition.y + direction.y * this.lookaheadDistance,
      };
    }

    return targetPoint;
  }

  /**
   * Check if the current position is close enough to the current waypoint to move to the next one
   * @param currentPosition The current position of the ship
   * @param waypoints Array of waypoints defining the path
   * @param currentWaypointIndex Index of the current waypoint
   * @param waypointThreshold Distance threshold to consider a waypoint reached
   * @returns The new waypoint index if the current one was reached, otherwise the same index
   */
  public updateWaypointIndex(
    currentPosition: Vector2D,
    waypoints: Vector2D[],
    currentWaypointIndex: number,
    waypointThreshold: number,
  ): number {
    if (waypoints.length === 0 || currentWaypointIndex >= waypoints.length) {
      return currentWaypointIndex;
    }

    const currentWaypoint = waypoints[currentWaypointIndex];
    const distanceToCurrent = this.distanceBetween(
      currentPosition,
      currentWaypoint,
    );

    // If we're close enough to the current waypoint, move to the next one
    if (distanceToCurrent < waypointThreshold) {
      return currentWaypointIndex + 1;
    }

    return currentWaypointIndex;
  }

  /**
   * Check if the ship has deviated too far from the path and needs replanning
   * @param currentPosition The current position of the ship
   * @param interpolatedTarget The interpolated target point
   * @param deviationThreshold Maximum allowed deviation (as a multiple of lookahead distance)
   * @returns True if replanning is needed, false otherwise
   */
  public needsReplanning(
    currentPosition: Vector2D,
    interpolatedTarget: Vector2D,
    deviationThreshold: number = 2.0,
  ): boolean {
    const distanceToTarget = this.distanceBetween(
      currentPosition,
      interpolatedTarget,
    );
    return distanceToTarget > this.lookaheadDistance * deviationThreshold;
  }

  /**
   * Get the lookahead distance
   * @returns The current lookahead distance
   */
  public getLookaheadDistance(): number {
    return this.lookaheadDistance;
  }
}
