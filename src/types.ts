export interface Vector2D {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  position: Vector2D;
  velocity: Vector2D;
  angle: number;
  angularVelocity: number;
  thrust: number;
  fuel: number;
  isCollided: boolean;
}

export interface ControlInput {
  thrust: number;
  torque: number;
}

export interface TerrainPoint {
  x: number;
  y: number;
}

export interface GameConfig {
  gravity: number;
  thrustMax: number;
  torqueMax: number;
  fuelMax: number;
  fuelConsumption: number;
  targetPosition: Vector2D;
  initialState: GameState;
} 