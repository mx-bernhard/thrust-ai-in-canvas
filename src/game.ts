import { GameState, ControlInput, TerrainPoint, GameConfig, Vector2D, Rectangle } from './types';
import { DDPController } from './ddp';
import { RRTPathPlanner } from './rrt';

export class LunarLanderGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private obstacles: Rectangle[];
  private controller: DDPController;
  private pathPlanner: RRTPathPlanner;
  private waypoints: Vector2D[] = [];
  private currentWaypointIndex: number = 0;
  private waypointThreshold: number = 30;
  private config: GameConfig;
  private isPaused: boolean = false;
  private isStepMode: boolean = false;
  private animationFrameId: number | null = null;
  private scale: number;
  private targetPosition: Vector2D;
  private showPath: boolean = true;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.scale = window.devicePixelRatio || 1;
    
    this.setupCanvas();
    
    // Convert relative positions to absolute
    const absoluteState = {
      ...config.initialState,
      position: this.relativeToAbsolute(config.initialState.position),
      isCollided: false
    };
    
    this.state = absoluteState;
    this.targetPosition = this.relativeToAbsolute(config.targetPosition);
    
    // Initialize obstacles before controller
    this.obstacles = this.generateObstacles();
    
    this.controller = new DDPController(
      config.gravity,
      config.thrustMax,
      config.torqueMax,
      this.targetPosition,
      this.obstacles,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale
    );
    
    // Initialize RRT path planner
    this.pathPlanner = new RRTPathPlanner(
      this.obstacles,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale
    );
    
    // Plan initial path
    this.planPath();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.setupCanvas();
      // Update positions on resize
      this.state.position = this.relativeToAbsolute(config.initialState.position);
      this.targetPosition = this.relativeToAbsolute(config.targetPosition);
      this.obstacles = this.generateObstacles();
      // Re-plan path after resize
      this.planPath();
    });
  }

  private relativeToAbsolute(pos: Vector2D): Vector2D {
    return {
      x: pos.x * (this.canvas.width / this.scale),
      y: pos.y * (this.canvas.height / this.scale)
    };
  }

  private setupCanvas() {
    this.scale = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * 0.8 * this.scale;
    this.canvas.height = window.innerHeight * 0.8 * this.scale;
    this.canvas.style.width = window.innerWidth * 0.8 + 'px';
    this.canvas.style.height = window.innerHeight * 0.8 + 'px';
    this.ctx.scale(this.scale, this.scale);
    this.canvas.style.border = '1px solid black';
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
      height: canvasHeight * 0.4
    });

    // Upper horizontal wall
    obstacles.push({
      x: canvasWidth * 0.45,
      y: canvasHeight * 0.2,
      width: canvasWidth * 0.3,
      height: 20
    });

    // Add some random obstacles in strategic locations
    const regions = [
      // Middle region
      {
        x: canvasWidth * 0.3,
        y: canvasHeight * 0.3,
        w: canvasWidth * 0.4,
        h: canvasHeight * 0.4
      },
      // Path to target
      {
        x: canvasWidth * 0.5,
        y: canvasHeight * 0.4,
        w: canvasWidth * 0.3,
        h: canvasHeight * 0.3
      }
    ];

    for (const region of regions) {
      for (let i = 0; i < 2; i++) {
        let newRect: Rectangle;
        let overlapping: boolean;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
          overlapping = false;
          newRect = {
            x: region.x + Math.random() * (region.w - 40),
            y: region.y + Math.random() * (region.h - 40),
            width: Math.random() * 30 + 20,
            height: Math.random() * 30 + 20
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
            newRect.y - start.y
          );
          const targetDist = Math.hypot(
            newRect.x - target.x,
            newRect.y - target.y
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
    return !(rect1.x + rect1.width < rect2.x ||
             rect2.x + rect2.width < rect1.x ||
             rect1.y + rect1.height < rect2.y ||
             rect2.y + rect2.height < rect1.y);
  }

  private drawObstacles() {
    this.ctx.fillStyle = '#666';
    for (const obstacle of this.obstacles) {
      this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
  }

  private drawLander() {
    this.ctx.save();
    this.ctx.translate(this.state.position.x, this.state.position.y);
    this.ctx.rotate(this.state.angle);
    
    // Draw lander body
    this.ctx.fillStyle = this.state.isCollided ? '#ff4444' : '#fff';
    this.ctx.beginPath();
    this.ctx.moveTo(-10, -10);
    this.ctx.lineTo(10, -10);
    this.ctx.lineTo(0, 10);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw thrust if active and not collided
    if (this.state.thrust > 0 && !this.state.isCollided) {
      this.ctx.beginPath();
      this.ctx.moveTo(-5, 10);
      this.ctx.lineTo(5, 10);
      this.ctx.lineTo(0, 20 + this.state.thrust * 5);
      this.ctx.fillStyle = '#f44';
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private drawTarget() {
    this.ctx.save();
    this.ctx.strokeStyle = '#0f0';
    this.ctx.beginPath();
    this.ctx.arc(
      this.targetPosition.x,
      this.targetPosition.y,
      10,
      0,
      Math.PI * 2
    );
    this.ctx.stroke();
    this.ctx.restore();
  }

  private checkCollision(): boolean {
    // Check collision with canvas bounds
    if (this.state.position.x < 0 || 
        this.state.position.x > this.canvas.width ||
        this.state.position.y < 0 || 
        this.state.position.y > this.canvas.height) {
      return true;
    }

    // Check collision with obstacles
    for (const obstacle of this.obstacles) {
      if (this.state.position.x >= obstacle.x &&
          this.state.position.x <= obstacle.x + obstacle.width &&
          this.state.position.y >= obstacle.y &&
          this.state.position.y <= obstacle.y + obstacle.height) {
        return true;
      }
    }

    return false;
  }

  private handleCollision() {
    // Reduce velocity significantly on collision
    this.state.velocity.x *= 0.2;
    this.state.velocity.y *= 0.2;
    this.state.angularVelocity *= 0.2;
    this.state.isCollided = true;
  }

  private update() {
    if (this.isPaused && !this.isStepMode) return;
    this.isStepMode = false;

    const dt = 0.016; // 60fps
    
    if (!this.state.isCollided) {
      // Update waypoint tracking
      this.updateWaypoints();
      
      // Get current waypoint as target for DDP controller
      const currentWaypoint = this.getCurrentWaypoint();
      
      // Update controller target
      this.controller = new DDPController(
        this.config.gravity,
        this.config.thrustMax,
        this.config.torqueMax,
        currentWaypoint,
        this.obstacles,
        this.canvas.width / this.scale,
        this.canvas.height / this.scale
      );
      
      const control = this.controller.computeControl(this.state);
      
      // Update state based on physics with bounds checking
      const cosAngle = Math.cos(this.state.angle);
      const sinAngle = Math.sin(this.state.angle);
      
      // Clamp velocities to prevent numerical instability
      const maxVelocity = 1000;
      this.state.velocity.x = Math.max(-maxVelocity, Math.min(maxVelocity, this.state.velocity.x));
      this.state.velocity.y = Math.max(-maxVelocity, Math.min(maxVelocity, this.state.velocity.y));
      this.state.angularVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, this.state.angularVelocity));
      
      // Update position and velocities
      this.state.position.x += this.state.velocity.x * dt;
      this.state.position.y += this.state.velocity.y * dt;
      this.state.velocity.x += (control.thrust * sinAngle) * dt;
      this.state.velocity.y += (control.thrust * cosAngle - this.config.gravity) * dt;
      this.state.angle += this.state.angularVelocity * dt;
      this.state.angularVelocity += control.torque * dt;
      this.state.thrust = control.thrust;
      this.state.fuel = Math.max(0, this.state.fuel - control.thrust * dt);

      if (this.checkCollision()) {
        this.handleCollision();
      }
    } else {
      // Continue physics simulation after collision but with no control input
      this.state.position.x += this.state.velocity.x * dt;
      this.state.position.y += this.state.velocity.y * dt;
      this.state.velocity.y += this.config.gravity * dt;
      this.state.angle += this.state.angularVelocity * dt;
    }
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw path and waypoints if enabled
    if (this.showPath) {
      this.drawPath();
    }
    
    this.drawObstacles();
    this.drawTarget();
    this.drawLander();
    this.drawDebugInfo();
  }

  private drawPath() {
    // Draw the planned path
    if (this.waypoints.length > 1) {
      this.ctx.save();
      
      // Draw path lines
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
      
      for (let i = 1; i < this.waypoints.length; i++) {
        this.ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
      }
      
      this.ctx.stroke();
      
      // Draw waypoints
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      
      for (let i = 0; i < this.waypoints.length; i++) {
        // Current waypoint is highlighted
        if (i === this.currentWaypointIndex) {
          this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
          this.ctx.beginPath();
          this.ctx.arc(this.waypoints[i].x, this.waypoints[i].y, 8, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          this.ctx.beginPath();
          this.ctx.arc(this.waypoints[i].x, this.waypoints[i].y, 5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      
      this.ctx.restore();
    }
  }

  private drawDebugInfo() {
    const costs = this.controller.getLastCosts();
    
    this.ctx.save();
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px monospace';
    
    // Background for debug panel
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 250, 190);
    
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'left';
    
    // Format numbers to be more readable
    const formatCost = (cost: number) => {
      if (cost < 0.01) return '0';
      if (cost > 999999) return (cost / 1000000).toFixed(2) + 'M';
      if (cost > 9999) return (cost / 1000).toFixed(2) + 'K';
      return cost.toFixed(2);
    };
    
    // Display all costs
    this.ctx.fillText(`Position Cost: ${formatCost(costs.position)}`, 20, 30);
    this.ctx.fillText(`Velocity Cost: ${formatCost(costs.velocity)}`, 20, 50);
    this.ctx.fillText(`Angle Cost: ${formatCost(costs.angle)}`, 20, 70);
    this.ctx.fillText(`Angular Vel Cost: ${formatCost(costs.angularVelocity)}`, 20, 90);
    this.ctx.fillText(`Obstacle Cost: ${formatCost(costs.obstacle)}`, 20, 110);
    this.ctx.fillText(`Boundary Cost: ${formatCost(costs.boundary)}`, 20, 130);
    this.ctx.fillText(`Total Cost: ${formatCost(costs.total)}`, 20, 150);
    
    // Display current position and waypoint info
    this.ctx.fillText(`Pos: (${this.state.position.x.toFixed(0)}, ${this.state.position.y.toFixed(0)})`, 20, 170);
    this.ctx.fillText(`Waypoint: ${this.currentWaypointIndex}/${this.waypoints.length}`, 20, 190);
    
    this.ctx.restore();
  }

  public gameLoop() {
    if (!this.ctx) return;  // Safety check
    
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
    const absolutePosition = this.relativeToAbsolute(this.config.initialState.position);
    this.state = {
      ...this.config.initialState,
      position: absolutePosition,
      isCollided: false
    };
    this.isPaused = false;
  }

  // Add cleanup method
  public cleanup() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // Plan a path from current position to target
  private planPath(): void {
    this.waypoints = this.pathPlanner.findPath(
      this.state.position,
      this.targetPosition
    );
    
    // Reset waypoint tracking
    this.currentWaypointIndex = 0;
    
    // Log path information
    console.log(`RRT: Found path with ${this.waypoints.length} waypoints`);
  }

  // Get current active waypoint
  private getCurrentWaypoint(): Vector2D {
    // If no waypoints or reached the end, use target position
    if (this.waypoints.length === 0 || this.currentWaypointIndex >= this.waypoints.length) {
      return this.targetPosition;
    }
    
    return this.waypoints[this.currentWaypointIndex];
  }

  // Update waypoint tracking
  private updateWaypoints(): void {
    // If no waypoints, nothing to update
    if (this.waypoints.length === 0) {
      return;
    }
    
    // Get current waypoint
    const currentWaypoint = this.getCurrentWaypoint();
    
    // Check if we've reached the current waypoint
    const distance = Math.hypot(
      this.state.position.x - currentWaypoint.x,
      this.state.position.y - currentWaypoint.y
    );
    
    if (distance < this.waypointThreshold) {
      // Move to next waypoint
      this.currentWaypointIndex++;
      console.log(`Reached waypoint ${this.currentWaypointIndex - 1}, moving to next`);
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
} 