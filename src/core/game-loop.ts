import { GameState, ControlInput } from "../types";
import { DDPController } from "../ddp";
import { normalizeAngle } from "../util";

export class GameLoop {
  private isPaused: boolean = false;
  private isStepMode: boolean = false;
  private animationFrameId: number | null = null;
  private dt: number = 0.016; // 60fps

  constructor(
    private getState: () => GameState,
    private getController: () => DDPController,
    private updateWaypoints: () => void,
    private checkCollision: () => boolean,
    private handleCollision: () => void,
    private updateDebugInfo: () => void,
    private draw: () => void,
    private getGravity: () => { x: number; y: number },
  ) {}

  public start(): void {
    this.gameLoop();
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }

  public step(): void {
    this.isStepMode = true;
    this.isPaused = false;
  }

  public cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop(): void {
    this.update();
    this.draw();

    // Store the animation frame ID so we can cancel it if needed
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    if (this.isPaused && !this.isStepMode) {
      return;
    }

    this.isStepMode = false;

    // Update waypoint tracking
    this.updateWaypoints();

    // Get control input from controller
    const state = this.getState();
    const controller = this.getController();
    const control = controller.computeControl(state);

    // Update state based on physics
    this.updatePhysics(control);

    // Check for collision after movement
    if (this.checkCollision()) {
      // If collision detected, handle it
      this.handleCollision();
    }

    // Update debug info
    this.updateDebugInfo();
  }

  private updatePhysics(control: ControlInput): void {
    const state = this.getState();
    const gravity = this.getGravity();
    const cosAngle = Math.cos(state.angle);
    const sinAngle = Math.sin(state.angle);

    // Clamp velocities to prevent numerical instability
    const maxVelocity = 1000;
    state.velocity.x = Math.max(
      -maxVelocity,
      Math.min(maxVelocity, state.velocity.x),
    );
    state.velocity.y = Math.max(
      -maxVelocity,
      Math.min(maxVelocity, state.velocity.y),
    );
    state.angularVelocity = Math.max(
      -maxVelocity,
      Math.min(maxVelocity, state.angularVelocity),
    );

    // Update position and velocities
    state.position.x += state.velocity.x * this.dt;
    state.position.y += state.velocity.y * this.dt;
    state.velocity.x += control.thrust * sinAngle * this.dt;
    state.velocity.y += (-control.thrust * cosAngle + gravity.y) * this.dt;
    state.angle += state.angularVelocity * this.dt;
    state.angle = normalizeAngle(state.angle);
    state.angularVelocity += control.torque * this.dt;
    state.thrust = control.thrust;

    // Update fuel if it's defined
    if (state.fuel !== undefined) {
      state.fuel = Math.max(0, state.fuel - control.thrust * this.dt);
    }
  }
}
