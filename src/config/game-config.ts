import { GameConfig, GameState, Vector2D } from "../types";
import { DDPWeights, defaultDdpWeights } from "../ddp";

export class GameConfigManager {
  private config: GameConfig;
  private controllerWeights: DDPWeights;
  private waypointLookaheadDistance: number = 75;
  private maxDistanceToPath: number = 300;
  private obstaclesAmount: number = 10;

  constructor(config: GameConfig) {
    this.config = config;
    this.controllerWeights = {
      velocityWeight: 1,
      angularVelocityWeight: 0.1,
      positionWeight: 0,
      boundaryWeight: 9,
      boundaryMargin: 50,
      obstacleWeight: 0,
      obstacleMargin: 0,
      collisionCourseWeight: 25.0,
      collisionTimeHorizon: 5.0,
      shipRadius: 15,
      waypointsDistanceWeight: 1,
      waypointsVelocityWeight: 1,
    };
  }

  public getConfig(): GameConfig {
    return this.config;
  }

  public getControllerWeights(): DDPWeights {
    return this.controllerWeights;
  }

  public getWaypointLookaheadDistance(): number {
    return this.waypointLookaheadDistance;
  }

  public getMaxDistanceToPath(): number {
    return this.maxDistanceToPath;
  }

  public getObstaclesAmount(): number {
    return this.obstaclesAmount;
  }

  public getGravity(): Vector2D {
    return this.config.gravity;
  }

  public getThrustMax(): number {
    return this.config.thrustMax;
  }

  public getTorqueMax(): number {
    return this.config.torqueMax;
  }

  public getInitialState(): GameState {
    return this.config.initialState;
  }

  public setControllerWeights(weights: Partial<DDPWeights>): void {
    this.controllerWeights = { ...this.controllerWeights, ...weights };
    console.log("Updated controller weights:", this.controllerWeights);
  }

  public getControllerWeight(name: keyof DDPWeights): number {
    return (this.controllerWeights[name] as number) || 0;
  }

  public resetControllerWeights(): void {
    this.controllerWeights = {
      ...defaultDdpWeights,
    };
    console.log("Reset controller weights to defaults");
  }

  public setThrustMax(value: number): void {
    this.config.thrustMax = value;
    console.log("Updated thrustMax:", value);
  }

  public setTorqueMax(value: number): void {
    this.config.torqueMax = value;
    console.log("Updated torqueMax:", value);
  }

  public setGravity(x: number, y: number): void {
    this.config.gravity = { x, y };
    console.log("Updated gravity:", this.config.gravity);
  }

  public setWaypointLookaheadDistance(value: number): void {
    this.waypointLookaheadDistance = value;
    console.log("Updated waypoint lookahead distance:", value);
  }

  public setObstaclesAmount(amount: number): void {
    // Ensure amount is a positive integer
    this.obstaclesAmount = Math.max(1, Math.floor(amount));
    console.log(`Obstacles amount set to ${this.obstaclesAmount}`);
  }
}
