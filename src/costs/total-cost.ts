import { GameState, Rectangle, Vector2D } from "../types";
import { calculatePositionCost } from "./position-cost";
import { calculateVelocityCost } from "./velocity-cost";
import { calculateAngularVelocityCost } from "./angular-velocity-cost";
import { calculateObstacleAvoidanceCost } from "./obstacle-avoidance-cost";
import { calculateBoundaryAvoidanceCost } from "./boundary-avoidance-cost";
import { calculateCollisionCourseCost } from "./collision-course-cost";
import { getWaypointsFollowingCost } from "../get-waypoints-cost.ts";

export interface CostComponents {
  position: number;
  velocity: number;
  angularVelocity: number;
  obstacle: number;
  boundary: number;
  collisionCourse: number;
  waypoints: number;
  total: number;
}

/**
 * Calculates the total cost by combining all cost components.
 *
 * @param state - The current game state
 * @param targetPosition - The target position to reach
 * @param obstacles - The obstacles to avoid
 * @param canvasWidth - The width of the canvas
 * @param canvasHeight - The height of the canvas
 * @param waypoints - The waypoints to follow
 * @param weights - The weights for different cost components
 * @returns The cost components and total cost
 */
export const calculateTotalCost = (
  state: GameState,
  targetPosition: Vector2D,
  obstacles: Rectangle[],
  canvasWidth: number,
  canvasHeight: number,
  waypoints: Vector2D[],
  weights: {
    positionWeight: number;
    velocityWeight: number;
    angularVelocityWeight: number;
    obstacleWeight: number;
    obstacleMargin: number;
    boundaryWeight: number;
    boundaryMargin: number;
    collisionCourseWeight: number;
    collisionTimeHorizon: number;
    shipRadius: number;
    waypointsDistanceWeight: number;
    waypointsVelocityWeight: number;
  },
): CostComponents => {
  // Calculate individual cost components
  const positionCost = calculatePositionCost(
    state.position,
    targetPosition,
    weights.positionWeight,
  );

  const velocityCost = calculateVelocityCost(
    state.velocity,
    weights.velocityWeight,
  );

  const angularVelocityCost = calculateAngularVelocityCost(
    state.angularVelocity,
    weights.angularVelocityWeight,
  );

  const obstacleCost = calculateObstacleAvoidanceCost(
    state.position,
    obstacles,
    weights.obstacleWeight,
    weights.obstacleMargin,
  );

  const boundaryCost = calculateBoundaryAvoidanceCost(
    state.position,
    canvasWidth,
    canvasHeight,
    weights.boundaryWeight,
    weights.boundaryMargin,
  );

  const collisionCourseCost = calculateCollisionCourseCost(
    state,
    obstacles,
    weights.collisionCourseWeight,
    weights.collisionTimeHorizon,
    weights.shipRadius,
  );

  const waypointsCost = getWaypointsFollowingCost({
    position: state.position,
    velocity: state.velocity,
    waypoints,
    waypointsDistanceWeight: weights.waypointsDistanceWeight,
    waypointsVelocityWeight: weights.waypointsVelocityWeight,
  });

  // Combine the costs
  const totalCost =
    positionCost +
    velocityCost +
    angularVelocityCost +
    obstacleCost +
    boundaryCost +
    collisionCourseCost +
    waypointsCost;

  // Return all cost components for reporting
  return {
    position: positionCost,
    velocity: velocityCost,
    angularVelocity: angularVelocityCost,
    obstacle: obstacleCost,
    boundary: boundaryCost,
    collisionCourse: collisionCourseCost,
    waypoints: waypointsCost,
    total: totalCost,
  };
};
