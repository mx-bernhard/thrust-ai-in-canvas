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
  private readonly velocityWeight = 1
  private readonly angularVelocityWeight = 0.1
  private readonly boundaryMargin = 50; // Safety margin from boundaries
  private readonly boundaryWeight = 9;
  private readonly obstacleMargin = 100; // Safety margin around obstacles
  private readonly obstacleWeight = 1.5; // Weight for obstacle avoidance

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
    let totalCost = 0;

    // Distance to each boundary
    const leftDist = position.x;
    const rightDist = this.canvasWidth - position.x;
    const topDist = position.y;
    const bottomDist = this.canvasHeight - position.y;

    // Add quadratic costs when within margin of any boundary
    if (leftDist < this.boundaryMargin) {
      totalCost += this.boundaryWeight * Math.pow(this.boundaryMargin - leftDist, 2);
    }
    if (rightDist < this.boundaryMargin) {
      totalCost += this.boundaryWeight * Math.pow(this.boundaryMargin - rightDist, 2);
    }
    if (topDist < this.boundaryMargin) {
      totalCost += this.boundaryWeight * Math.pow(this.boundaryMargin - topDist, 2);
    }
    if (bottomDist < this.boundaryMargin) {
      totalCost += this.boundaryWeight * Math.pow(this.boundaryMargin - bottomDist, 2);
    }

    return totalCost;
  }

  private obstacleAvoidanceCost(position: Vector2D): number {
    let totalCost = 0;

    for (const obstacle of this.obstacles) {
      // Calculate closest point on rectangle to position
      const dx = Math.max(obstacle.x - position.x, 0, position.x - (obstacle.x + obstacle.width));
      const dy = Math.max(obstacle.y - position.y, 0, position.y - (obstacle.y + obstacle.height));
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Add cost if within margin
      if (distance < this.obstacleMargin) {
        totalCost += this.obstacleWeight * Math.pow(this.obstacleMargin - distance, 2);
      }
    }

    return totalCost;
  }

  private cost(state: GameState): number {
    // Target reaching cost
    const positionCost = 
      Math.pow(state.position.x - this.targetPosition.x, 2) +
      Math.pow(state.position.y - this.targetPosition.y, 2);
    // Movement costs
    const velocityCost = 
      Math.pow(state.velocity.x * this.velocityWeight, 2) +
      Math.pow(state.velocity.y * this.velocityWeight, 2);
    const angleCost = Math.pow(state.angle, 2);
    const angularVelocityCost = Math.pow(state.angularVelocity * this.angularVelocityWeight, 2);

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
      fuel: typeof state.fuel === 'number' ? state.fuel - control.thrust * this.dt : 1000,
      isCollided: false
    };
  }
} 