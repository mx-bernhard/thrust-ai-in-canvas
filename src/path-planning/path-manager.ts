import { Vector2D, Rectangle } from "../types";
import { RRTPathPlanner } from "../rrt";
import { PathInterpolator } from "../path-interpolation";

export class PathManager {
  private waypoints: Vector2D[] = [];
  private currentWaypointIndex: number = 0;
  private pathPlanner: RRTPathPlanner;
  private pathInterpolator: PathInterpolator;

  constructor(
    private obstacles: Rectangle[],
    private canvasWidth: number,
    private canvasHeight: number,
    private scale: number,
    lookaheadDistance: number,
    maxDistanceToPath: number,
  ) {
    // Initialize RRT path planner
    this.pathPlanner = new RRTPathPlanner(
      obstacles,
      canvasWidth / scale,
      canvasHeight / scale,
    );

    // Initialize the path interpolator
    this.pathInterpolator = new PathInterpolator(
      lookaheadDistance,
      maxDistanceToPath,
    );
  }

  public getWaypoints(): Vector2D[] {
    return this.waypoints;
  }

  public getCurrentWaypointIndex(): number {
    return this.currentWaypointIndex;
  }

  public setCurrentWaypointIndex(index: number): void {
    this.currentWaypointIndex = index;
  }

  public updateObstacles(obstacles: Rectangle[]): void {
    this.obstacles = obstacles;
    this.pathPlanner = new RRTPathPlanner(
      obstacles,
      this.canvasWidth / this.scale,
      this.canvasHeight / this.scale,
    );
  }

  public setLookaheadDistance(distance: number): void {
    this.pathInterpolator = new PathInterpolator(
      distance,
      this.pathInterpolator.getMaxDistanceToPath(),
    );
  }

  public getLookaheadDistance(): number {
    return this.pathInterpolator.getLookaheadDistance();
  }

  public planPath(
    currentPosition: Vector2D,
    targetPosition: Vector2D,
  ): Vector2D[] {
    // Find path from current position to target
    const path = this.pathPlanner.findPath(currentPosition, targetPosition);

    // Update waypoints
    this.waypoints = path;
    this.currentWaypointIndex = 0;

    console.log(`Path planned with ${path.length} waypoints`);
    return path;
  }

  public getInterpolatedTarget(
    currentPosition: Vector2D,
    targetPosition: Vector2D,
  ): Vector2D {
    return this.pathInterpolator.getInterpolatedTarget(
      currentPosition,
      this.waypoints,
      targetPosition,
    );
  }

  public needsReplanning(currentPosition: Vector2D): boolean {
    return this.pathInterpolator.needsReplanning(
      currentPosition,
      this.waypoints,
    );
  }

  public updateWaypoints(
    currentPosition: Vector2D,
    targetPosition: Vector2D,
  ): void {
    if (this.waypoints.length === 0) return;

    // Check if we need to replan the path
    if (this.needsReplanning(currentPosition)) {
      console.log("Deviation from path detected, replanning...");
      this.planPath(currentPosition, targetPosition);
    }
  }

  public getObstacles(): Rectangle[] {
    return this.obstacles;
  }
}
