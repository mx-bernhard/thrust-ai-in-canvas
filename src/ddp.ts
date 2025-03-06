import { GameState, ControlInput, Vector2D, Rectangle } from './types';

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

  constructor(
    gravity: number, 
    thrustMax: number, 
    torqueMax: number, 
    targetPosition: Vector2D,
    obstacles: Rectangle[],
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.gravity = gravity;
    this.thrustMax = thrustMax;
    this.torqueMax = torqueMax;
    this.targetPosition = targetPosition;
    this.obstacles = obstacles;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  private boundaryAvoidanceCost(position: Vector2D): number {
    const margin = 50; // Safety margin from boundaries
    const boundaryWeight = 9;
    let totalCost = 0;

    // Distance to each boundary
    const leftDist = position.x;
    const rightDist = this.canvasWidth - position.x;
    const topDist = position.y;
    const bottomDist = this.canvasHeight - position.y;

    // Add quadratic costs when within margin of any boundary
    if (leftDist < margin) {
      totalCost += boundaryWeight * Math.pow(margin - leftDist, 2);
    }
    if (rightDist < margin) {
      totalCost += boundaryWeight * Math.pow(margin - rightDist, 2);
    }
    if (topDist < margin) {
      totalCost += boundaryWeight * Math.pow(margin - topDist, 2);
    }
    if (bottomDist < margin) {
      totalCost += boundaryWeight * Math.pow(margin - bottomDist, 2);
    }

    return totalCost;
  }

  private obstacleAvoidanceCost(position: Vector2D): number {
    const margin = 100; // Safety margin around obstacles
    const obstacleWeight = 1.0; // Weight for obstacle avoidance
    let totalCost = 0;

    for (const obstacle of this.obstacles) {
      // Calculate closest point on rectangle to position
      const dx = Math.max(obstacle.x - position.x, 0, position.x - (obstacle.x + obstacle.width));
      const dy = Math.max(obstacle.y - position.y, 0, position.y - (obstacle.y + obstacle.height));
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Add cost if within margin
      if (distance < margin) {
        totalCost += obstacleWeight * Math.pow(margin - distance, 2);
      }
    }

    return totalCost;
  }

  private cost(state: GameState): number {
    // Target reaching cost
    const positionCost = 
      Math.pow(state.position.x - this.targetPosition.x, 2) +
      Math.pow(state.position.y - this.targetPosition.y, 2);
    const velocityWeight = 1
    const angularVelocityWeight = 0.1
    // Movement costs
    const velocityCost = 
      Math.pow(state.velocity.x * velocityWeight, 2) +
      Math.pow(state.velocity.y * velocityWeight, 2);
    const angleCost = Math.pow(state.angle, 2);
    const angularVelocityCost = Math.pow(state.angularVelocity * angularVelocityWeight, 2);

    // Obstacle and boundary avoidance costs
    const obstacleCost = this.obstacleAvoidanceCost(state.position);
    const boundaryCost = this.boundaryAvoidanceCost(state.position);

    // Store costs for debugging
    this.lastCosts = {
      position: positionCost,
      velocity: velocityCost,
      angle: angleCost,
      angularVelocity: angularVelocityCost,
      obstacle: obstacleCost,
      boundary: boundaryCost,
      total: positionCost + 
             velocityCost + 
             angleCost + 
             angularVelocityCost + 
             obstacleCost +
             boundaryCost
    };

    return this.lastCosts.total;
  }

  // Add a property to store the last computed costs
  private lastCosts: {
    position: number;
    velocity: number;
    angle: number;
    angularVelocity: number;
    obstacle: number;
    boundary: number;
    total: number;
  } = {
    position: 0,
    velocity: 0,
    angle: 0,
    angularVelocity: 0,
    obstacle: 0,
    boundary: 0,
    total: 0
  };

  // Add a getter to access the costs
  public getLastCosts() {
    return this.lastCosts;
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
        y: state.position.y + state.velocity.y * this.dt
      },
      velocity: {
        x: state.velocity.x + (control.thrust * sinAngle) * this.dt,
        y: state.velocity.y + (-control.thrust * cosAngle + this.gravity) * this.dt
      },
      angle: state.angle + state.angularVelocity * this.dt,
      angularVelocity: state.angularVelocity + control.torque * this.dt,
      thrust: control.thrust,
      fuel: state.fuel - control.thrust * this.dt,
      isCollided: false
    };
  }
} 