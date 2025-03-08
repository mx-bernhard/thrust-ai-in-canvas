import { GameState, GameConfig, Vector2D, Rectangle } from "./types";
import { DDPController } from "./ddp";
import { RRTPathPlanner } from "./rrt";
import { PathInterpolator } from "./path-interpolation";

export class LunarLanderGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private obstacles: Rectangle[];
  private controller: DDPController;
  private pathPlanner: RRTPathPlanner;
  private pathInterpolator: PathInterpolator;
  private waypoints: Vector2D[] = [];
  private currentWaypointIndex: number = 0;
  private waypointThreshold: number = 70;
  private config: GameConfig;
  private isPaused: boolean = false;
  private isStepMode: boolean = false;
  private animationFrameId: number | null = null;
  private scale: number;
  private targetPosition: Vector2D;
  private showPath: boolean = true;
  private isColliding: boolean = false;
  private debugInfo: {
    costs: any;
    position: Vector2D;
    velocity: Vector2D;
    speed: number;
    thrust: number;
    torque: number;
    angle: number;
    waypoints: { current: number; total: number };
    interpolatedTarget: { position: Vector2D; distance: number } | null;
    lastUpdateTime: number;
  };
  private debugUpdateInterval: number = 500; // Update debug info every 500ms (2 times per second)
  private showDebugInfo: boolean = true;
  private showNarrowPassages: boolean = false;

  private obstaclesAmount = 10;

  // Constant for the lookahead distance
  private readonly waypointLookaheadDistance: number = 50; // Distance to look ahead on the path

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.config = config;
    this.scale = window.devicePixelRatio || 1;

    // Initialize the path interpolator
    this.pathInterpolator = new PathInterpolator(
      this.waypointLookaheadDistance,
    );

    // Initialize debug info
    this.debugInfo = {
      costs: {
        position: 0,
        velocity: 0,
        angle: 0,
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
      waypoints: { current: 0, total: 0 },
      interpolatedTarget: null,
      lastUpdateTime: 0,
    };

    this.setupCanvas();

    // Use initial state directly without conversion
    const initialState = {
      ...config.initialState,
      position: { ...config.initialState.position }, // Create a copy to avoid reference issues
      isCollided: false,
    };

    this.state = initialState;
    this.targetPosition = { ...config.targetPosition }; // Use target position directly

    console.log("Initial ship position:", this.state.position);
    console.log("Target position:", this.targetPosition);

    // Initialize obstacles before controller
    this.obstacles = this.generateObstacles();

    this.controller = new DDPController(
      config.gravity.y,
      config.thrustMax,
      config.torqueMax,
      this.targetPosition,
      this.obstacles,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale,
    );

    // Initialize RRT path planner
    this.pathPlanner = new RRTPathPlanner(
      this.obstacles,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale,
    );

    // Plan initial path
    this.planPath();

    // Handle window resize
    window.addEventListener("resize", () => {
      this.setupCanvas();
      // Update positions on resize - use direct values
      this.state.position = { ...config.initialState.position };
      this.targetPosition = { ...config.targetPosition };
      this.obstacles = this.generateObstacles();
      // Re-plan path after resize
      this.planPath();
    });
  }

  private setupCanvas() {
    // Use the canvas dimensions as they are (already set in main.ts)
    this.scale = window.devicePixelRatio || 1;

    // Don't modify the canvas dimensions here, they're set in main.ts
    // Just set up the context scaling
    this.ctx.scale(this.scale, this.scale);
  }

  private generateObstacles(): Rectangle[] {
    const obstacles: Rectangle[] = [];
    const canvasWidth = this.canvas.width / this.scale;
    const canvasHeight = this.canvas.height / this.scale;

    // Calculate start and target positions for reference
    const start = this.state.position;
    const target = this.targetPosition;

    // Add walls to create a challenging path
    // Central vertical wall
    obstacles.push({
      x: canvasWidth * 0.45,
      y: canvasHeight * 0.2,
      width: 20,
      height: canvasHeight * 0.4,
    });

    // Upper horizontal wall
    obstacles.push({
      x: canvasWidth * 0.45,
      y: canvasHeight * 0.2,
      width: canvasWidth * 0.3,
      height: 20,
    });

    // Add some random obstacles in strategic locations
    const regions = [
      // Middle region
      {
        x: canvasWidth * 0,
        y: canvasHeight * 0,
        w: canvasWidth * 1,
        h: canvasHeight * 1,
      },
    ];

    for (const region of regions) {
      for (let i = 0; i < this.obstaclesAmount; i++) {
        let newRect: Rectangle;
        let overlapping: boolean;
        let attempts = 0;
        const maxAttempts = 100;

        do {
          overlapping = false;
          newRect = {
            x: region.x + Math.random() * (region.w - 40),
            y: region.y + Math.random() * (region.h - 40),
            width: Math.random() * 100 + 20,
            height: Math.random() * 100 + 20,
          };

          // Check overlap with existing obstacles
          for (const obstacle of obstacles) {
            if (this.checkRectangleOverlap(newRect, obstacle)) {
              overlapping = true;
              break;
            }
          }

          // Check if too close to start position or target
          const startDist = Math.hypot(
            newRect.x - start.x,
            newRect.y - start.y,
          );
          const targetDist = Math.hypot(
            newRect.x - target.x,
            newRect.y - target.y,
          );

          if (startDist < 80 || targetDist < 80) {
            overlapping = true;
          }

          attempts++;
          if (attempts >= maxAttempts) break;
        } while (overlapping);

        if (attempts < maxAttempts) {
          obstacles.push(newRect);
        }
      }
    }

    return obstacles;
  }

  private checkRectangleOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    );
  }

  private drawObstacles() {
    this.ctx.fillStyle = "#666";
    for (const obstacle of this.obstacles) {
      this.ctx.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height,
      );
    }
  }

  private drawLander() {
    const { position, angle, thrust } = this.state;

    this.ctx.save();
    this.ctx.translate(position.x, position.y);
    this.ctx.rotate(angle);

    // Draw lander body
    if (this.isColliding) {
      // Flash red on collision
      this.ctx.fillStyle = "#ff3333";
    } else {
      this.ctx.fillStyle = "white";
    }

    this.ctx.beginPath();
    this.ctx.moveTo(0, -10);
    this.ctx.lineTo(7, 10);
    this.ctx.lineTo(-7, 10);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw thrust flame if thrusting
    if (thrust > 0) {
      this.ctx.fillStyle = "#ff9900";
      this.ctx.beginPath();
      this.ctx.moveTo(-5, 10);
      this.ctx.lineTo(0, 10 + thrust * 2);
      this.ctx.lineTo(5, 10);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawTarget() {
    this.ctx.save();
    this.ctx.strokeStyle = "#0f0";
    this.ctx.beginPath();
    this.ctx.arc(
      this.targetPosition.x,
      this.targetPosition.y,
      10,
      0,
      Math.PI * 2,
    );
    this.ctx.stroke();
    this.ctx.restore();
  }

  private checkCollision(): boolean {
    // Check collision with boundaries
    const boundaryMargin = 20; // Match the value in handleCollision

    if (
      this.state.position.x < boundaryMargin ||
      this.state.position.x > this.canvas.width / this.scale - boundaryMargin ||
      this.state.position.y < boundaryMargin ||
      this.state.position.y > this.canvas.height / this.scale - boundaryMargin
    ) {
      return true;
    }

    // Check collision with obstacles
    const landerRadius = 15; // Match the value in handleCollision

    for (const obstacle of this.obstacles) {
      // Calculate closest point on rectangle to lander
      const closestX = Math.max(
        obstacle.x,
        Math.min(this.state.position.x, obstacle.x + obstacle.width),
      );
      const closestY = Math.max(
        obstacle.y,
        Math.min(this.state.position.y, obstacle.y + obstacle.height),
      );

      // Vector from closest point to lander
      const dx = this.state.position.x - closestX;
      const dy = this.state.position.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < landerRadius) {
        return true;
      }
    }

    return false;
  }

  private handleCollision() {
    // Implement physics-based collision response
    console.log("Collision detected - applying physics deflection");

    // Coefficient of restitution (elasticity of collision)
    // 1.0 = perfectly elastic, 0.0 = perfectly inelastic
    const restitution = 0.6; // Reduced from 0.8 for more energy loss

    // Check collision with boundaries
    const boundaryMargin = 20; // Increased from 10 for better visibility
    let collisionHandled = false;

    // Store original velocity for debugging
    const originalVelocity = {
      x: this.state.velocity.x,
      y: this.state.velocity.y,
    };

    if (this.state.position.x < boundaryMargin) {
      // Left boundary collision - reflect x velocity
      this.state.position.x = boundaryMargin;
      this.state.velocity.x = -this.state.velocity.x * restitution;
      collisionHandled = true;
    } else if (
      this.state.position.x >
      this.canvas.width / this.scale - boundaryMargin
    ) {
      // Right boundary collision - reflect x velocity
      this.state.position.x = this.canvas.width / this.scale - boundaryMargin;
      this.state.velocity.x = -this.state.velocity.x * restitution;
      collisionHandled = true;
    }

    if (this.state.position.y < boundaryMargin) {
      // Top boundary collision - reflect y velocity
      this.state.position.y = boundaryMargin;
      this.state.velocity.y = -this.state.velocity.y * restitution;
      collisionHandled = true;
    } else if (
      this.state.position.y >
      this.canvas.height / this.scale - boundaryMargin
    ) {
      // Bottom boundary collision - reflect y velocity
      this.state.position.y = this.canvas.height / this.scale - boundaryMargin;
      this.state.velocity.y = -this.state.velocity.y * restitution;
      collisionHandled = true;
    }

    // If boundary collision was handled, don't check obstacles
    if (collisionHandled) {
      // Ensure minimum velocity after collision to prevent getting stuck
      const minVelocity = 0.1;
      const currentSpeed = Math.hypot(
        this.state.velocity.x,
        this.state.velocity.y,
      );

      if (currentSpeed < minVelocity) {
        // Apply a small random velocity to prevent getting stuck
        const angle = Math.random() * Math.PI * 2;
        this.state.velocity.x = Math.cos(angle) * minVelocity;
        this.state.velocity.y = Math.sin(angle) * minVelocity;
      }

      this.flashCollision();
      return;
    }

    // Check collision with obstacles
    const landerRadius = 15; // Increased from 10 for better collision detection
    for (const obstacle of this.obstacles) {
      // Calculate closest point on rectangle to lander
      const closestX = Math.max(
        obstacle.x,
        Math.min(this.state.position.x, obstacle.x + obstacle.width),
      );
      const closestY = Math.max(
        obstacle.y,
        Math.min(this.state.position.y, obstacle.y + obstacle.height),
      );

      // Vector from closest point to lander
      const dx = this.state.position.x - closestX;
      const dy = this.state.position.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < landerRadius) {
        // Normalize collision normal
        const nx = dx / distance;
        const ny = dy / distance;

        // Move lander outside obstacle (prevent penetration)
        this.state.position.x = closestX + nx * (landerRadius + 1); // Add 1 pixel extra to prevent sticking
        this.state.position.y = closestY + ny * (landerRadius + 1);

        // Calculate relative velocity along normal
        const velAlongNormal =
          this.state.velocity.x * nx + this.state.velocity.y * ny;

        // Only reflect if moving toward the obstacle
        if (velAlongNormal < 0) {
          // Calculate impulse scalar
          const impulse = -(1 + restitution) * velAlongNormal;

          // Apply impulse to velocity
          this.state.velocity.x += impulse * nx;
          this.state.velocity.y += impulse * ny;

          // Apply angular impulse based on offset from center
          // This creates realistic rotation on impact
          const impactOffset = Math.random() * 2 - 1; // Random offset for simplicity
          this.state.angularVelocity += impactOffset * impulse * 0.01;

          // Apply some friction to tangential velocity
          const friction = 0.3;
          const tx = -ny; // Tangent is perpendicular to normal
          const ty = nx;
          const velAlongTangent =
            this.state.velocity.x * tx + this.state.velocity.y * ty;

          this.state.velocity.x -= friction * velAlongTangent * tx;
          this.state.velocity.y -= friction * velAlongTangent * ty;

          // Ensure minimum velocity after collision to prevent getting stuck
          const minVelocity = 0.1;
          const currentSpeed = Math.hypot(
            this.state.velocity.x,
            this.state.velocity.y,
          );

          if (currentSpeed < minVelocity) {
            // Scale up velocity to minimum
            const scale = minVelocity / currentSpeed;
            this.state.velocity.x *= scale;
            this.state.velocity.y *= scale;
          }

          // Collision was handled
          collisionHandled = true;
          break;
        }
      }
    }

    // Flash the lander to indicate collision
    if (collisionHandled) {
      console.log(
        `Velocity before: (${originalVelocity.x.toFixed(2)}, ${originalVelocity.y.toFixed(2)}), after: (${this.state.velocity.x.toFixed(2)}, ${this.state.velocity.y.toFixed(2)})`,
      );
      this.flashCollision();
    }
  }

  // Add a visual effect for collision
  private flashCollision() {
    this.isColliding = true;
    setTimeout(() => {
      this.isColliding = false;
    }, 200);
  }

  private updateDebugInfo() {
    const currentTime = Date.now();

    // Only update debug info at the specified interval
    if (
      currentTime - this.debugInfo.lastUpdateTime >=
      this.debugUpdateInterval
    ) {
      const costs = this.controller.getLastCosts();
      const speed = Math.hypot(this.state.velocity.x, this.state.velocity.y);

      // Get the interpolated target for debug info
      const interpolatedTarget = this.getCurrentWaypoint();
      const distanceToTarget = this.pathInterpolator.distanceBetween(
        this.state.position,
        interpolatedTarget,
      );

      this.debugInfo = {
        costs,
        position: { ...this.state.position },
        velocity: { ...this.state.velocity },
        speed,
        thrust: this.state.thrust,
        torque: this.state.angularVelocity,
        angle: this.state.angle,
        waypoints: {
          current: this.currentWaypointIndex,
          total: this.waypoints.length,
        },
        interpolatedTarget: {
          position: interpolatedTarget,
          distance: distanceToTarget,
        },
        lastUpdateTime: currentTime,
      };
    }
  }

  private drawDebugInfo(): void {
    const currentTime = Date.now();

    // Only update debug info at the throttled rate
    if (
      currentTime - this.debugInfo.lastUpdateTime >=
      this.debugUpdateInterval
    ) {
      this.updateDebugInfo();
    }

    this.ctx.save();
    this.ctx.fillStyle = "white";
    this.ctx.font = "14px monospace";

    // Background for debug panel
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(10, 10, 250, 330); // Increased height for interpolated target info

    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "left";

    let debugY = 30;
    const lineHeight = 20;

    // Format numbers to be more readable
    const formatCost = (cost: number) => {
      if (cost < 0.01) return "0";
      if (cost > 999999) return (cost / 1000000).toFixed(2) + "M";
      if (cost > 9999) return (cost / 1000).toFixed(2) + "K";
      return cost.toFixed(2);
    };

    // Format velocity and control values for display
    const formatValue = (val: number) => {
      return val.toFixed(2);
    };

    // Display all costs
    this.ctx.fillText(
      `Position Cost: ${formatCost(this.debugInfo.costs.position)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    this.ctx.fillText(
      `Velocity Cost: ${formatCost(this.debugInfo.costs.velocity)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    this.ctx.fillText(
      `Angle Cost: ${formatCost(this.debugInfo.costs.angle)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    this.ctx.fillText(
      `Angular Vel Cost: ${formatCost(this.debugInfo.costs.angularVelocity)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    this.ctx.fillText(
      `Obstacle Cost: ${formatCost(this.debugInfo.costs.obstacle)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    this.ctx.fillText(
      `Boundary Cost: ${formatCost(this.debugInfo.costs.boundary)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    // Add collision course cost
    if (this.debugInfo.costs.collisionCourse !== undefined) {
      this.ctx.fillText(
        `Collision Course: ${formatCost(this.debugInfo.costs.collisionCourse)}`,
        20,
        debugY,
      );
      debugY += lineHeight;
    }

    this.ctx.fillText(
      `Total Cost: ${formatCost(this.debugInfo.costs.total)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    // Display current position
    this.ctx.fillText(
      `Pos: (${this.debugInfo.position.x.toFixed(0)}, ${this.debugInfo.position.y.toFixed(0)})`,
      20,
      debugY,
    );
    debugY += lineHeight;

    // Display velocity information
    this.ctx.fillText(
      `Vel X: ${formatValue(this.debugInfo.velocity.x)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    this.ctx.fillText(
      `Vel Y: ${formatValue(this.debugInfo.velocity.y)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    this.ctx.fillText(
      `Speed: ${formatValue(this.debugInfo.speed)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    // Display control input information
    this.ctx.fillText(
      `Thrust: ${formatValue(this.debugInfo.thrust)} / ${this.config.thrustMax}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    this.ctx.fillText(
      `Torque: ${formatValue(this.debugInfo.torque)}`,
      20,
      debugY,
    );
    debugY += lineHeight;

    // Add interpolated target information
    if (this.debugInfo.interpolatedTarget) {
      const target = this.debugInfo.interpolatedTarget;
      this.ctx.fillText(
        `Target: (${target.position.x.toFixed(0)}, ${target.position.y.toFixed(0)})`,
        20,
        debugY,
      );
      debugY += lineHeight;
      this.ctx.fillText(`Distance: ${target.distance.toFixed(0)}`, 20, debugY);
      debugY += lineHeight;
    }

    // Add path planning info
    if (this.waypoints.length > 0) {
      this.ctx.fillText(
        `Waypoint: ${this.debugInfo.waypoints.current}/${this.debugInfo.waypoints.total}`,
        150,
        190,
      );
      this.ctx.fillText(
        `Angle: ${formatValue(this.debugInfo.angle)}`,
        150,
        210,
      );
      this.ctx.fillText(
        `Lookahead: ${this.pathInterpolator.getLookaheadDistance()}`,
        150,
        230,
      );
    }

    this.ctx.restore();
  }

  private update() {
    if (this.isPaused && !this.isStepMode) return;
    this.isStepMode = false;

    const dt = 0.016; // 60fps

    // Update waypoint tracking
    this.updateWaypoints();

    // Get current waypoint as target for DDP controller
    const currentWaypoint = this.getCurrentWaypoint();

    // Update controller target
    this.controller = new DDPController(
      this.config.gravity.y,
      this.config.thrustMax,
      this.config.torqueMax,
      currentWaypoint,
      this.obstacles,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale,
    );

    const control = this.controller.computeControl(this.state);

    // Store previous position for collision detection (used for debugging)
    // const prevPosition = { ...this.state.position };

    // Update state based on physics with bounds checking
    const cosAngle = Math.cos(this.state.angle);
    const sinAngle = Math.sin(this.state.angle);

    // Clamp velocities to prevent numerical instability
    const maxVelocity = 1000;
    this.state.velocity.x = Math.max(
      -maxVelocity,
      Math.min(maxVelocity, this.state.velocity.x),
    );
    this.state.velocity.y = Math.max(
      -maxVelocity,
      Math.min(maxVelocity, this.state.velocity.y),
    );
    this.state.angularVelocity = Math.max(
      -maxVelocity,
      Math.min(maxVelocity, this.state.angularVelocity),
    );

    // Update position and velocities
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;
    this.state.velocity.x += control.thrust * sinAngle * dt;
    this.state.velocity.y +=
      (-control.thrust * cosAngle + this.config.gravity.y) * dt;
    this.state.angle += this.state.angularVelocity * dt;
    this.state.angularVelocity += control.torque * dt;
    this.state.thrust = control.thrust;

    // Initialize fuel if it's undefined
    if (this.state.fuel === undefined) {
      this.state.fuel = this.config.fuelMax || 1000;
    }

    // Update fuel if fuel consumption is enabled
    if (this.config.fuelConsumption) {
      this.state.fuel = Math.max(0, this.state.fuel - control.thrust * dt);
    }

    // Check for collision after movement
    if (this.checkCollision()) {
      // If collision detected, handle it
      this.handleCollision();

      // Debug log to verify position after collision
      console.log(
        `Position after collision: (${this.state.position.x.toFixed(2)}, ${this.state.position.y.toFixed(2)})`,
      );
    }

    // Update debug info
    this.updateDebugInfo();
  }

  public draw() {
    if (!this.ctx) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw obstacles
    this.drawObstacles();

    // Draw narrow passages if enabled
    if (this.showNarrowPassages) {
      this.drawNarrowPassages(this.ctx);
    }

    // Draw target
    this.drawTarget();

    // Draw path if available and enabled
    if (this.waypoints.length > 0 && this.showPath) {
      this.drawPath();
    }

    // Draw ship
    this.drawLander();

    // Draw debug info if enabled
    if (this.showDebugInfo) {
      this.drawDebugInfo();
    }
  }

  private drawPath() {
    if (this.waypoints.length <= 1) return;

    this.ctx.save();

    // Draw the path
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);

    for (let i = 1; i < this.waypoints.length; i++) {
      this.ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
    }

    this.ctx.stroke();

    // Draw waypoints
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";

    for (let i = 0; i < this.waypoints.length; i++) {
      // Highlight the current waypoint
      if (i === this.currentWaypointIndex) {
        this.ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        this.ctx.beginPath();
        this.ctx.arc(
          this.waypoints[i].x,
          this.waypoints[i].y,
          8,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        this.ctx.beginPath();
        this.ctx.arc(
          this.waypoints[i].x,
          this.waypoints[i].y,
          5,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      }
    }

    // Draw the interpolated target point
    const interpolatedTarget = this.getCurrentWaypoint();
    this.ctx.fillStyle = "rgba(255, 255, 0, 0.8)";
    this.ctx.beginPath();
    this.ctx.arc(
      interpolatedTarget.x,
      interpolatedTarget.y,
      10,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    // Draw a line from the ship to the interpolated target
    this.ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.state.position.x, this.state.position.y);
    this.ctx.lineTo(interpolatedTarget.x, interpolatedTarget.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  public gameLoop() {
    if (!this.ctx) return; // Safety check

    this.update();
    this.draw();

    // Store the animation frame ID so we can cancel it if needed
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  public togglePause() {
    this.isPaused = !this.isPaused;
  }

  public step() {
    this.isStepMode = true;
    this.isPaused = false;
  }

  public reset() {
    // Use the initial position directly without conversion
    this.state = {
      ...this.config.initialState,
      position: { ...this.config.initialState.position }, // Create a copy to avoid reference issues
      isCollided: false,
    };

    console.log("Reset ship position to:", this.state.position);

    // Reset other game state
    this.isPaused = false;
    this.isColliding = false;

    // Re-plan path after reset
    this.planPath();
  }

  // Add cleanup method
  public cleanup() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // Plan a path from current position to target
  public planPath(): void {
    // Create path planner
    this.pathPlanner = new RRTPathPlanner(
      this.obstacles,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale,
    );

    // Find path from current position to target
    const path = this.pathPlanner.findPath(
      this.state.position,
      this.targetPosition,
    );

    // Update waypoints
    this.waypoints = path;
    this.currentWaypointIndex = 0;

    console.log(`Path planned with ${path.length} waypoints`);
  }

  // Update the getCurrentWaypoint method to use the PathInterpolator
  private getCurrentWaypoint(): Vector2D {
    return this.pathInterpolator.getInterpolatedTarget(
      this.state.position,
      this.waypoints,
      this.targetPosition,
    );
  }

  // Update the updateWaypoints method to use the PathInterpolator
  private updateWaypoints(): void {
    if (this.waypoints.length === 0) return;

    // Update the waypoint index
    const newIndex = this.pathInterpolator.updateWaypointIndex(
      this.state.position,
      this.waypoints,
      this.currentWaypointIndex,
      this.waypointThreshold,
    );

    // If the index changed, log it
    if (newIndex > this.currentWaypointIndex) {
      console.log(
        `Reached waypoint ${this.currentWaypointIndex}, moving to next`,
      );
      this.currentWaypointIndex = newIndex;
    }

    // Check if we need to replan the path
    const interpolatedTarget = this.getCurrentWaypoint();
    if (
      this.pathInterpolator.needsReplanning(
        this.state.position,
        interpolatedTarget,
      )
    ) {
      console.log("Deviation from path detected, replanning...");
      this.planPath();
    }
  }

  // Toggle path visibility
  public togglePathVisibility(): void {
    this.showPath = !this.showPath;
  }

  // Re-plan path
  public replanPath(): void {
    this.planPath();
  }

  // Add a method to visualize narrow passages
  private drawNarrowPassages(ctx: CanvasRenderingContext2D): void {
    if (!this.obstacles || this.obstacles.length < 2) return;

    // const shipRadius = 15; // Same as in RRT
    const minPassageWidth = 40; // Same as in RRT

    // Check for narrow passages between obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      for (let j = i + 1; j < this.obstacles.length; j++) {
        const obstacle1 = this.obstacles[i];
        const obstacle2 = this.obstacles[j];

        // Find closest points between obstacles
        const edges1 = [
          {
            start: { x: obstacle1.x, y: obstacle1.y },
            end: { x: obstacle1.x + obstacle1.width, y: obstacle1.y },
          },
          {
            start: { x: obstacle1.x + obstacle1.width, y: obstacle1.y },
            end: {
              x: obstacle1.x + obstacle1.width,
              y: obstacle1.y + obstacle1.height,
            },
          },
          {
            start: {
              x: obstacle1.x + obstacle1.width,
              y: obstacle1.y + obstacle1.height,
            },
            end: { x: obstacle1.x, y: obstacle1.y + obstacle1.height },
          },
          {
            start: { x: obstacle1.x, y: obstacle1.y + obstacle1.height },
            end: { x: obstacle1.x, y: obstacle1.y },
          },
        ];

        const edges2 = [
          {
            start: { x: obstacle2.x, y: obstacle2.y },
            end: { x: obstacle2.x + obstacle2.width, y: obstacle2.y },
          },
          {
            start: { x: obstacle2.x + obstacle2.width, y: obstacle2.y },
            end: {
              x: obstacle2.x + obstacle2.width,
              y: obstacle2.y + obstacle2.height,
            },
          },
          {
            start: {
              x: obstacle2.x + obstacle2.width,
              y: obstacle2.y + obstacle2.height,
            },
            end: { x: obstacle2.x, y: obstacle2.y + obstacle2.height },
          },
          {
            start: { x: obstacle2.x, y: obstacle2.y + obstacle2.height },
            end: { x: obstacle2.x, y: obstacle2.y },
          },
        ];

        let minDistance = Infinity;
        let closestPoint1 = { x: 0, y: 0 };
        let closestPoint2 = { x: 0, y: 0 };

        // Check all edge combinations
        for (const edge1 of edges1) {
          for (const edge2 of edges2) {
            // Sample points along edges
            const samples1 = 5;
            const samples2 = 5;

            for (let s1 = 0; s1 <= samples1; s1++) {
              const t1 = s1 / samples1;
              const point1 = {
                x: edge1.start.x + t1 * (edge1.end.x - edge1.start.x),
                y: edge1.start.y + t1 * (edge1.end.y - edge1.start.y),
              };

              for (let s2 = 0; s2 <= samples2; s2++) {
                const t2 = s2 / samples2;
                const point2 = {
                  x: edge2.start.x + t2 * (edge2.end.x - edge2.start.x),
                  y: edge2.start.y + t2 * (edge2.end.y - edge2.start.y),
                };

                const dx = point1.x - point2.x;
                const dy = point1.y - point2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                  minDistance = distance;
                  closestPoint1 = { ...point1 };
                  closestPoint2 = { ...point2 };
                }
              }
            }
          }
        }

        // If distance is less than minimum passage width, highlight it
        if (minDistance < minPassageWidth) {
          ctx.save();

          // Draw line between closest points
          ctx.beginPath();
          ctx.moveTo(closestPoint1.x, closestPoint1.y);
          ctx.lineTo(closestPoint2.x, closestPoint2.y);
          ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw distance text
          const midX = (closestPoint1.x + closestPoint2.x) / 2;
          const midY = (closestPoint1.y + closestPoint2.y) / 2;
          ctx.fillStyle = "red";
          ctx.font = "12px Arial";
          ctx.fillText(`${minDistance.toFixed(1)}px`, midX, midY);

          ctx.restore();
        }
      }
    }
  }

  // Public methods for UI controls
  public start(): void {
    // Initialize game loop
    this.gameLoop();

    // Plan initial path after a short delay to ensure everything is initialized
    setTimeout(() => {
      this.planPath();
    }, 500);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public togglePath(show: boolean): void {
    this.showPath = show;
  }

  public toggleDebugInfo(show: boolean): void {
    this.showDebugInfo = show;
  }

  public toggleNarrowPassagesVisualization(show: boolean): void {
    this.showNarrowPassages = show;
  }

  // Add a method to set the number of obstacles
  public setObstaclesAmount(amount: number): void {
    // Ensure amount is a positive integer
    this.obstaclesAmount = Math.max(1, Math.floor(amount));
    console.log(`Obstacles amount set to ${this.obstaclesAmount}`);
  }

  // Update the regenerateObstacles method to use the current obstaclesAmount
  public regenerateObstacles(): void {
    // Generate new obstacles
    this.obstacles = this.generateObstacles();

    // Update the controller with new obstacles
    this.controller = new DDPController(
      this.config.gravity.y,
      this.config.thrustMax,
      this.config.torqueMax,
      this.targetPosition,
      this.obstacles,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale,
    );

    // Update the path planner with new obstacles
    this.pathPlanner = new RRTPathPlanner(
      this.obstacles,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale,
    );

    // Replan the path with the new obstacles
    this.planPath();

    console.log(`Obstacles regenerated (${this.obstaclesAmount} obstacles)`);
  }
}
