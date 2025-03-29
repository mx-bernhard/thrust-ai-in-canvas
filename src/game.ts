import { GameState, GameConfig, Vector2D } from "./types";
import { DDPController, DDPWeights } from "./ddp";
import { PhaserRenderer } from "./renderers/phaser-renderer";
import { CollisionHandler } from "./physics/collision-handler";
import { PathManager } from "./path-planning/path-manager";
import { DebugManager } from "./debug/debug-manager";
import { GameConfigManager } from "./config/game-config";
import { ObstacleManager } from "./obstacles/obstacle-manager";
import { GameLoop } from "./core/game-loop";

export class LunarLanderGame {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private scale: number;

  // Modules
  private configManager: GameConfigManager;
  private obstacleManager: ObstacleManager;
  private pathManager: PathManager;
  private collisionHandler: CollisionHandler;
  private debugManager: DebugManager;
  private renderer: PhaserRenderer;
  private gameLoopManager: GameLoop;

  private cachedController: DDPController | null = null;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.scale = window.devicePixelRatio || 1;

    // Initialize config manager
    this.configManager = new GameConfigManager(config);

    // Use initial state directly without conversion
    const initialState = {
      ...config.initialState,
      position: { ...config.initialState.position }, // Create a copy to avoid reference issues
      isCollided: false,
    };

    this.state = initialState;

    // Initialize obstacle manager
    this.obstacleManager = new ObstacleManager(
      canvas.width,
      canvas.height,
      this.scale,
    );

    // Generate obstacles
    const obstacles = this.obstacleManager.generateObstacles(
      this.state.position,
      this.configManager.getConfig().targetPosition,
      this.configManager.getObstaclesAmount(),
    );

    // Initialize path manager
    this.pathManager = new PathManager(
      obstacles,
      canvas.width,
      canvas.height,
      this.scale,
      this.configManager.getWaypointLookaheadDistance(),
      this.configManager.getMaxDistanceToPath(),
    );

    // Initialize collision handler
    this.collisionHandler = new CollisionHandler(
      () => this.canvas.width,
      () => this.canvas.height,
      () => this.scale,
      (isColliding) => this.renderer?.setIsColliding(isColliding),
    );

    // Initialize debug manager
    this.debugManager = new DebugManager();

    // Initialize controller with proper weights
    const controllerWeights = this.configManager.getControllerWeights();
    // Initial controller setup
    this.cachedController = new DDPController({
      gravity: config.gravity.y,
      thrustMax: config.thrustMax,
      torqueMax: config.torqueMax,
      getTargetPosition: () => this.getInterpolatedTarget(),
      obstacles: obstacles,
      canvasWidth: this.canvas.width / this.scale,
      canvasHeight: this.canvas.height / this.scale,
      weights: controllerWeights,
      getWaypoints: () => this.pathManager.getWaypoints(),
    });

    // Compute an initial control to ensure costs are calculated
    this.cachedController.computeControl(this.state);

    // Initialize renderer
    this.renderer = new PhaserRenderer(
      canvas,
      () => this.state,
      () => this.obstacleManager.getObstacles(),
      () => this.getInterpolatedTarget(),
      () => this.pathManager.getWaypoints(),
      () => this.pathManager.getCurrentWaypointIndex(),
      () => this.getInterpolatedTarget(),
      () => this.configManager.getThrustMax(),
      () => this.pathManager.getLookaheadDistance(),
      () => {
        console.log("Renderer is ready, initializing game systems");
        this.setupCanvas();

        // Plan initial path
        this.planPath();

        // Start the game loop only after the renderer is initialized
        this.gameLoopManager.start();

        console.log("Game loop started");
      },
    );

    // Initialize game loop
    this.gameLoopManager = new GameLoop(
      () => this.state,
      () => this.getUpdatedController(),
      () => this.updateWaypoints(),
      () => this.checkCollision(),
      () => this.handleCollision(),
      () => this.updateDebugInfo(),
      () => this.renderer.draw(),
      () => this.configManager.getGravity(),
    );

    // Handle window resize
    window.addEventListener("resize", () => {
      this.setupCanvas();
      // Update positions on resize - use direct values
      this.state.position = { ...config.initialState.position };

      // Update canvas dimensions in obstacle manager
      this.obstacleManager.setCanvasDimensions(
        this.canvas.width,
        this.canvas.height,
        this.scale,
      );

      // Regenerate obstacles
      const newObstacles = this.obstacleManager.generateObstacles(
        this.state.position,
        this.getInterpolatedTarget(),
        this.configManager.getObstaclesAmount(),
      );

      // Update obstacles in path manager
      this.pathManager.updateObstacles(newObstacles);

      // Re-plan path after resize
      this.planPath();
    });
  }

  private getInterpolatedTarget(): Vector2D {
    return this.pathManager.getInterpolatedTarget(
      this.state.position,
      this.configManager.getConfig().targetPosition,
    );
  }

  private setupCanvas(): void {
    // Use the canvas dimensions as they are (already set in main.ts)
    this.scale = window.devicePixelRatio || 1;

    // Set scale in renderer
    this.renderer.setScale(this.scale);
  }

  /**
   * Returns the current controller, creating a new one only if necessary
   */
  private getUpdatedController(): DDPController {
    // If no controller exists, create one
    if (this.cachedController === null) {
      this.createNewController();
    }

    return this.cachedController!;
  }

  // Helper method to create a new controller with current parameters
  private createNewController(): void {
    this.cachedController = new DDPController({
      gravity: this.configManager.getGravity().y,
      thrustMax: this.configManager.getThrustMax(),
      torqueMax: this.configManager.getTorqueMax(),
      getTargetPosition: () => this.getInterpolatedTarget(),
      obstacles: this.obstacleManager.getObstacles(),
      canvasWidth: this.canvas.width / this.scale,
      canvasHeight: this.canvas.height / this.scale,
      weights: this.configManager.getControllerWeights(),
      getWaypoints: () => this.pathManager.getWaypoints(),
    });

    // Compute one control to ensure costs are calculated
    this.cachedController.computeControl(this.state);
  }

  private updateWaypoints(): void {
    this.pathManager.updateWaypoints(
      this.state.position,
      this.getInterpolatedTarget(),
    );
  }

  private checkCollision(): boolean {
    return this.collisionHandler.checkCollision(
      this.state,
      this.obstacleManager.getObstacles(),
    );
  }

  private handleCollision(): void {
    this.collisionHandler.handleCollision(
      this.state,
      this.obstacleManager.getObstacles(),
    );
  }

  private updateDebugInfo(): void {
    if (this.debugManager.shouldUpdateDebugInfo()) {
      const costs = this.cachedController?.getLastCosts() || {
        position: 0,
        velocity: 0,
        angularVelocity: 0,
        obstacle: 0,
        boundary: 0,
        collisionCourse: 0,
        waypoints: 0,
        total: 0,
      };
      const waypoints = this.pathManager.getWaypoints();
      const interpolatedTarget = this.pathManager.getInterpolatedTarget(
        this.state.position,
        this.configManager.getConfig().targetPosition,
      );

      this.debugManager.updateDebugInfo(
        this.state,
        costs,
        waypoints,
        interpolatedTarget,
      );

      // Update debug info in renderer
      this.renderer.setDebugInfo(this.debugManager.getDebugInfo());
    }
  }

  // Public methods
  public start(): void {
    // Initialize game loop
    this.gameLoopManager.start();

    // Plan initial path after a short delay to ensure everything is initialized
    setTimeout(() => {
      this.planPath();
    }, 500);
  }

  public togglePause(): void {
    this.gameLoopManager.togglePause();
  }

  public step(): void {
    this.gameLoopManager.step();
  }

  public reset(): void {
    // Use the initial position directly without conversion
    this.state = {
      ...this.configManager.getInitialState(),
      position: { ...this.configManager.getInitialState().position }, // Create a copy to avoid reference issues
      isCollided: false,
    };

    console.log("Reset ship position to:", this.state.position);

    // Re-plan path after reset
    this.planPath();
  }

  public cleanup(): void {
    this.gameLoopManager.cleanup();
  }

  public planPath(): void {
    this.pathManager.planPath(
      this.state.position,
      this.configManager.getConfig().targetPosition,
    );

    // Create a new controller since the path/waypoints have changed
    this.createNewController();
  }

  public replanPath(): void {
    this.planPath();
  }

  public togglePathVisibility(show: boolean): void {
    this.renderer.setShowPath(show);
  }

  public toggleDebugInfo(show: boolean): void {
    this.renderer.setShowDebugInfo(show);
  }

  public toggleNarrowPassagesVisualization(show: boolean): void {
    this.renderer.setShowNarrowPassages(show);
  }

  public setObstaclesAmount(amount: number): void {
    this.configManager.setObstaclesAmount(amount);
    this.regenerateObstacles();
  }

  public regenerateObstacles(): void {
    // Generate new obstacles
    const obstacles = this.obstacleManager.generateObstacles(
      this.state.position,
      this.getInterpolatedTarget(),
      this.configManager.getObstaclesAmount(),
    );

    // Update obstacles in path manager
    this.pathManager.updateObstacles(obstacles);

    // Replan the path with the new obstacles
    this.planPath();

    console.log(
      `Obstacles regenerated (${this.configManager.getObstaclesAmount()} obstacles)`,
    );
  }

  public setControllerWeights(weights: DDPWeights): void {
    this.configManager.setControllerWeights(weights);

    // Create a new controller when weights change
    this.createNewController();
  }

  public getControllerWeight(name: keyof DDPWeights): number {
    return this.configManager.getControllerWeight(name);
  }

  public resetControllerWeights(): void {
    this.configManager.resetControllerWeights();

    // Create a new controller when weights are reset
    this.createNewController();
  }

  public setThrustMax(value: number): void {
    this.configManager.setThrustMax(value);
    this.createNewController();
  }

  public setTorqueMax(value: number): void {
    this.configManager.setTorqueMax(value);
    this.createNewController();
  }

  public setGravity(x: number, y: number): void {
    this.configManager.setGravity(x, y);
    this.createNewController();
  }

  public setWaypointLookaheadDistance(value: number): void {
    this.configManager.setWaypointLookaheadDistance(value);
    this.pathManager.setLookaheadDistance(value);
    this.createNewController();
  }

  // Compatibility methods for main.ts
  public pause(): void {
    // Make sure we're paused
    if (!this.gameLoopManager.isPausedState()) {
      this.gameLoopManager.togglePause();
    }
  }

  public resume(): void {
    // Make sure we're not paused
    if (this.gameLoopManager.isPausedState()) {
      this.gameLoopManager.togglePause();
    }
  }

  public togglePath(show: boolean): void {
    this.togglePathVisibility(show);
  }
}
