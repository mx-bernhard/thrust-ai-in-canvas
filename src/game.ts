import { GameState, ControlInput, TerrainPoint, GameConfig, Vector2D, Rectangle } from './types';
import { DDPController } from './ddp';

export class LunarLanderGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private obstacles: Rectangle[];
  private controller: DDPController;
  private config: GameConfig;
  private isPaused: boolean = false;
  private isStepMode: boolean = false;
  private animationFrameId: number | null = null;
  private scale: number;
  private targetPosition: Vector2D;

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
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.setupCanvas();
      // Update positions on resize
      this.state.position = this.relativeToAbsolute(config.initialState.position);
      this.targetPosition = this.relativeToAbsolute(config.targetPosition);
      this.obstacles = this.generateObstacles();
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
    this.drawObstacles();
    this.drawTarget();
    this.drawLander();
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
} 