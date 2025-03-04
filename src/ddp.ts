import { GameState, ControlInput, Vector2D, Rectangle } from './types';

export class DDPController {
  private readonly dt = 0.016; // 60fps
  private readonly horizon = 60; // 1 second prediction horizon
  private readonly iterations = 10;
  private readonly gravity: number;
  private readonly thrustMax: number;
  private readonly torqueMax: number;
  private readonly targetPosition: Vector2D;
  private readonly obstacles: Rectangle[];

  constructor(
    gravity: number, 
    thrustMax: number, 
    torqueMax: number, 
    targetPosition: Vector2D,
    obstacles: Rectangle[]
  ) {
    this.gravity = gravity;
    this.thrustMax = thrustMax;
    this.torqueMax = torqueMax;
    this.targetPosition = targetPosition;
    this.obstacles = obstacles;
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
        y: state.velocity.y + (control.thrust * cosAngle - this.gravity) * this.dt
      },
      angle: state.angle + state.angularVelocity * this.dt,
      angularVelocity: state.angularVelocity + control.torque * this.dt,
      thrust: control.thrust,
      fuel: state.fuel - control.thrust * this.dt,
      isCollided: false
    };
  }

  private obstacleAvoidanceCost(position: Vector2D): number {
    const margin = 50; // Safety margin around obstacles
    const obstacleWeight = 1000; // Weight for obstacle avoidance
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
    
    // Movement costs
    const velocityCost = 
      Math.pow(state.velocity.x, 2) +
      Math.pow(state.velocity.y, 2);
    const angleCost = Math.pow(state.angle, 2);
    const angularVelocityCost = Math.pow(state.angularVelocity, 2);

    // Obstacle avoidance cost
    const obstacleCost = this.obstacleAvoidanceCost(state.position);

    return (
      positionCost + 
      0.1 * velocityCost + 
      0.1 * angleCost + 
      0.05 * angularVelocityCost + 
      obstacleCost
    );
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
} 