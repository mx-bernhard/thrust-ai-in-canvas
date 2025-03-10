import { GameState, ControlInput, Vector2D, Rectangle } from "./types";

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
  collisionTimeHorizon: 5.0,
  shipRadius: 15,
};

export class DDPController {
  private readonly dt = 0.016; // 60fps
  private readonly horizon = 60; // 1 second prediction horizon
  private readonly iterations = 30;
  private readonly gravity: number;
  private readonly thrustMax: number;
  private readonly torqueMax: number;
  private readonly targetPosition: Vector2D;
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

  // For cost reporting
  private lastCosts = {
    position: 0,
    velocity: 0,
    angle: 0,
    angularVelocity: 0,
    obstacle: 0,
    boundary: 0,
    collisionCourse: 0,
    total: 0,
  };

  constructor({
    gravity,
    thrustMax,
    torqueMax,
    targetPosition,
    obstacles,
    canvasWidth,
    canvasHeight,
    weights = {},
  }: {
    gravity: number;
    thrustMax: number;
    torqueMax: number;
    targetPosition: Vector2D;
    obstacles: Rectangle[];
    canvasWidth: number;
    canvasHeight: number;
    weights?: DDPWeights;
  }) {
    this.gravity = gravity;
    this.thrustMax = thrustMax;
    this.torqueMax = torqueMax;
    this.targetPosition = targetPosition;
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
  }

  // Return the last calculated costs for debugging
  public getLastCosts() {
    return this.lastCosts;
  }

  // Add a method to calculate collision course cost
  private collisionCourseCost(state: GameState): number {
    if (this.obstacles.length === 0) return 0;

    const position = state.position;
    const velocity = state.velocity;

    // If velocity is very small, no collision course
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed < 0.1) return 0;

    let totalCost = 0;

    // Check for collision course with each obstacle
    for (const obstacle of this.obstacles) {
      // Expand obstacle by ship radius
      const expandedObstacle = {
        x: obstacle.x - this.shipRadius,
        y: obstacle.y - this.shipRadius,
        width: obstacle.width + 2 * this.shipRadius,
        height: obstacle.height + 2 * this.shipRadius,
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
      if (minTimeToCollision < this.collisionTimeHorizon) {
        // Cost is higher for imminent collisions and lower for distant ones
        // Use inverse relationship with time to collision
        const timeFactor = 1.0 - minTimeToCollision / this.collisionTimeHorizon;
        totalCost +=
          this.collisionCourseWeight * Math.pow(timeFactor, 2) * 1000;
      }
    }

    return totalCost;
  }

  private boundaryAvoidanceCost(position: Vector2D): number {
    let totalCost = 0;

    // Distance to each boundary
    const leftDist = position.x;
    const rightDist = this.canvasWidth - position.x;
    const topDist = position.y;
    const bottomDist = this.canvasHeight - position.y;

    // Add quadratic costs when within margin of any boundary
    if (leftDist < this.boundaryMargin) {
      totalCost +=
        this.boundaryWeight * Math.pow(this.boundaryMargin - leftDist, 2);
    }
    if (rightDist < this.boundaryMargin) {
      totalCost +=
        this.boundaryWeight * Math.pow(this.boundaryMargin - rightDist, 2);
    }
    if (topDist < this.boundaryMargin) {
      totalCost +=
        this.boundaryWeight * Math.pow(this.boundaryMargin - topDist, 2);
    }
    if (bottomDist < this.boundaryMargin) {
      totalCost +=
        this.boundaryWeight * Math.pow(this.boundaryMargin - bottomDist, 2);
    }

    return totalCost;
  }

  private obstacleAvoidanceCost(position: Vector2D): number {
    let totalCost = 0;

    for (const obstacle of this.obstacles) {
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
      if (distance < this.obstacleMargin) {
        totalCost +=
          this.obstacleWeight * Math.pow(this.obstacleMargin - distance, 2);
      }
    }

    return totalCost;
  }

  private cost(state: GameState): number {
    // Target reaching cost
    const positionCost =
      this.positionWeight *
      (Math.pow(state.position.x - this.targetPosition.x, 2) +
        Math.pow(state.position.y - this.targetPosition.y, 2));
    // Movement costs
    const velocityCost =
      Math.pow(state.velocity.x * this.velocityWeight, 2) +
      Math.pow(state.velocity.y * this.velocityWeight, 2);
    const angleCost = Math.pow(state.angle, 2);
    const angularVelocityCost = Math.pow(
      state.angularVelocity * this.angularVelocityWeight,
      2,
    );

    // Obstacle and boundary avoidance costs
    const obstacleCost = this.obstacleAvoidanceCost(state.position);
    const boundaryCost = this.boundaryAvoidanceCost(state.position);

    // New collision course cost
    const collisionCourseCost = this.collisionCourseCost(state);

    // Store costs for debugging
    this.lastCosts = {
      position: positionCost,
      velocity: velocityCost,
      angle: angleCost,
      angularVelocity: angularVelocityCost,
      obstacle: obstacleCost,
      boundary: boundaryCost,
      collisionCourse: collisionCourseCost,
      total:
        positionCost +
        velocityCost +
        angleCost +
        angularVelocityCost +
        obstacleCost +
        boundaryCost +
        collisionCourseCost,
    };

    return this.lastCosts.total;
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
      angle: state.angle + state.angularVelocity * this.dt,
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
