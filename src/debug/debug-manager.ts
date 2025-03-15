import { GameState, Vector2D } from "../types";
import { distanceBetween } from "../distance-between";

export interface DebugInfo {
  costs: {
    position: number;
    velocity: number;
    angularVelocity: number;
    obstacle: number;
    boundary: number;
    collisionCourse?: number;
    waypoints?: number;
    total: number;
  };
  position: Vector2D;
  velocity: Vector2D;
  speed: number;
  thrust: number;
  torque: number;
  angle: number;
  waypoints: { total: number };
  interpolatedTarget: { position: Vector2D; distance: number } | null;
  lastUpdateTime: number;
}

export class DebugManager {
  private debugInfo: DebugInfo;
  private debugUpdateInterval: number = 500; // Update debug info every 500ms

  constructor() {
    // Initialize debug info
    this.debugInfo = {
      costs: {
        position: 0,
        velocity: 0,
        angularVelocity: 0,
        obstacle: 0,
        boundary: 0,
        total: 0,
      },
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      speed: 0,
      thrust: 0,
      torque: 0,
      angle: 0,
      waypoints: { total: 0 },
      interpolatedTarget: null,
      lastUpdateTime: 0,
    };
  }

  public getDebugInfo(): DebugInfo {
    return this.debugInfo;
  }

  public setDebugUpdateInterval(interval: number): void {
    this.debugUpdateInterval = interval;
  }

  public updateDebugInfo(
    state: GameState,
    costs: {
      position: number;
      velocity: number;
      angularVelocity: number;
      obstacle: number;
      boundary: number;
      collisionCourse?: number;
      waypoints?: number;
      total: number;
    },
    waypoints: Vector2D[],
    interpolatedTarget: Vector2D,
  ): void {
    const currentTime = Date.now();

    // Only update debug info at the specified interval
    if (
      currentTime - this.debugInfo.lastUpdateTime >=
      this.debugUpdateInterval
    ) {
      const speed = Math.hypot(state.velocity.x, state.velocity.y);

      // Calculate distance to interpolated target
      const distanceToTarget = distanceBetween(
        state.position,
        interpolatedTarget,
      );

      this.debugInfo = {
        costs,
        position: { ...state.position },
        velocity: { ...state.velocity },
        speed,
        thrust: state.thrust,
        torque: state.angularVelocity,
        angle: state.angle,
        waypoints: {
          total: waypoints.length,
        },
        interpolatedTarget: {
          position: interpolatedTarget,
          distance: distanceToTarget,
        },
        lastUpdateTime: currentTime,
      };
    }
  }

  public shouldUpdateDebugInfo(): boolean {
    const currentTime = Date.now();
    return (
      currentTime - this.debugInfo.lastUpdateTime >= this.debugUpdateInterval
    );
  }

  // Helper methods for formatting debug values
  public formatCost(cost: number): string {
    if (cost < 0.01) return "0";
    if (cost > 999999) return (cost / 1000000).toFixed(2) + "M";
    if (cost > 9999) return (cost / 1000).toFixed(2) + "K";
    return cost.toFixed(2);
  }

  public formatValue(val: number): string {
    return val.toFixed(2);
  }
}
