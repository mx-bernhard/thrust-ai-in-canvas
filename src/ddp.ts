import { GameState, ControlInput, Vector2D, Rectangle } from "./types";
import { normalizeAngle } from "./util.ts";
import { calculateTotalCost, type CostComponents } from "./costs";

// Interface for configurable weights
export interface DDPWeights {
  velocityWeight?: number;
  angularVelocityWeight?: number;
  positionWeight?: number;
  boundaryWeight?: number;
  boundaryMargin?: number;
  obstacleWeight?: number;
  obstacleMargin?: number;
  collisionCourseWeight?: number;
  collisionTimeHorizon?: number;
  shipRadius?: number;
  waypointsVelocityWeight?: number;
  waypointsDistanceWeight?: number;
}

// Default weights
export const defaultDdpWeights: Required<DDPWeights> = {
  velocityWeight: 1,
  angularVelocityWeight: 0.1,
  positionWeight: 15,
  boundaryWeight: 9,
  boundaryMargin: 50,
  obstacleWeight: 0,
  obstacleMargin: 0,
  collisionCourseWeight: 25.0,
  collisionTimeHorizon: 15.0,
  shipRadius: 15,
  waypointsVelocityWeight: 1,
  waypointsDistanceWeight: 1,
};

export class DDPController {
  private readonly dt = 0.016; // 60fps
  private readonly horizon = 60 * 1; // 1 second prediction horizon
  private readonly iterations = 30 * 1;
  private readonly gravity: number;
  private readonly thrustMax: number;
  private readonly torqueMax: number;
  private readonly getTargetPosition: () => Vector2D;
  private readonly obstacles: Rectangle[];
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;

  // Weights and configuration parameters
  private readonly velocityWeight: number;
  private readonly angularVelocityWeight: number;
  private readonly boundaryMargin: number;
  private readonly boundaryWeight: number;
  private readonly obstacleMargin: number;
  private readonly obstacleWeight: number;
  private readonly collisionCourseWeight: number;
  private readonly collisionTimeHorizon: number;
  private readonly shipRadius: number;
  private readonly positionWeight: number;
  private readonly getWaypoints: () => Vector2D[];
  private readonly waypointsVelocityWeight: number;
  private readonly waypointsDistanceWeight: number;

  // For cost reporting
  private lastCosts: CostComponents = {
    position: 0,
    velocity: 0,
    angularVelocity: 0,
    obstacle: 0,
    boundary: 0,
    collisionCourse: 0,
    waypoints: 0,
    total: 0,
  };

  constructor({
    gravity,
    thrustMax,
    torqueMax,
    getTargetPosition,
    obstacles,
    canvasWidth,
    canvasHeight,
    weights = {},
    getWaypoints = () => [],
  }: {
    gravity: number;
    thrustMax: number;
    torqueMax: number;
    getTargetPosition: () => Vector2D;
    obstacles: Rectangle[];
    canvasWidth: number;
    canvasHeight: number;
    weights?: DDPWeights;
    getWaypoints: () => Vector2D[];
  }) {
    this.gravity = gravity;
    this.thrustMax = thrustMax;
    this.torqueMax = torqueMax;
    this.getTargetPosition = getTargetPosition;
    this.obstacles = obstacles;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Apply weights with defaults
    const mergedWeights = { ...defaultDdpWeights, ...weights };
    this.velocityWeight = mergedWeights.velocityWeight;
    this.angularVelocityWeight = mergedWeights.angularVelocityWeight;
    this.positionWeight = mergedWeights.positionWeight;
    this.boundaryWeight = mergedWeights.boundaryWeight;
    this.boundaryMargin = mergedWeights.boundaryMargin;
    this.obstacleWeight = mergedWeights.obstacleWeight;
    this.obstacleMargin = mergedWeights.obstacleMargin;
    this.collisionCourseWeight = mergedWeights.collisionCourseWeight;
    this.collisionTimeHorizon = mergedWeights.collisionTimeHorizon;
    this.shipRadius = mergedWeights.shipRadius;
    this.waypointsVelocityWeight = mergedWeights.waypointsVelocityWeight;
    this.waypointsDistanceWeight = mergedWeights.waypointsDistanceWeight;
    this.getWaypoints = getWaypoints;
  }

  // Return the last calculated costs for debugging
  public getLastCosts() {
    return this.lastCosts;
  }

  private cost(state: GameState): number {
    // Use the extracted cost calculation function
    const costComponents = calculateTotalCost(
      state,
      this.getTargetPosition(),
      this.obstacles,
      this.canvasWidth,
      this.canvasHeight,
      this.getWaypoints(),
      {
        positionWeight: this.positionWeight,
        velocityWeight: this.velocityWeight,
        angularVelocityWeight: this.angularVelocityWeight,
        obstacleWeight: this.obstacleWeight,
        obstacleMargin: this.obstacleMargin,
        boundaryWeight: this.boundaryWeight,
        boundaryMargin: this.boundaryMargin,
        collisionCourseWeight: this.collisionCourseWeight,
        collisionTimeHorizon: this.collisionTimeHorizon,
        shipRadius: this.shipRadius,
        waypointsDistanceWeight: this.waypointsDistanceWeight,
        waypointsVelocityWeight: this.waypointsVelocityWeight,
      },
    );

    // Store costs for debugging
    this.lastCosts = costComponents;

    return costComponents.total;
  }

  public computeControl(currentState: GameState): ControlInput {
    let control: ControlInput = { thrust: 0, torque: 0 };
    let bestCost = Infinity;

    // Simple shooting method for now - can be extended to full DDP
    for (let i = 0; i < this.iterations; i++) {
      const testThrust = Math.random() * this.thrustMax;
      const testTorque = (Math.random() * 2 - 1) * this.torqueMax;

      let testState = { ...currentState };
      let totalCost = 0;

      const testControl = { thrust: testThrust, torque: testTorque };

      // Forward simulation
      for (let t = 0; t < this.horizon; t++) {
        testState = this.dynamics(testState, testControl);
        totalCost += this.cost(testState);
      }

      if (totalCost < bestCost) {
        bestCost = totalCost;
        control = testControl;
      }
    }

    return control;
  }

  private dynamics(state: GameState, control: ControlInput): GameState {
    const cosAngle = Math.cos(state.angle);
    const sinAngle = Math.sin(state.angle);

    // Calculate the new angle and normalize it
    const newAngle = normalizeAngle(
      state.angle + state.angularVelocity * this.dt,
    );

    return {
      position: {
        x: state.position.x + state.velocity.x * this.dt,
        y: state.position.y + state.velocity.y * this.dt,
      },
      velocity: {
        x: state.velocity.x + control.thrust * sinAngle * this.dt,
        y:
          state.velocity.y +
          (-control.thrust * cosAngle + this.gravity) * this.dt,
      },
      angle: newAngle,
      angularVelocity: state.angularVelocity + control.torque * this.dt,
      thrust: control.thrust,
      fuel:
        typeof state.fuel === "number"
          ? state.fuel - control.thrust * this.dt
          : 1000,
      isCollided: false,
    };
  }
}
