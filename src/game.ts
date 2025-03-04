import { GameState, ControlInput, TerrainPoint, GameConfig, Vector2D } from './types';
import { DDPController } from './ddp';

export class LunarLanderGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private terrain: TerrainPoint[];
  private controller: DDPController;
  private config: GameConfig;
  private isPaused: boolean = false;
  private isStepMode: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.state = { ...config.initialState };
    this.controller = new DDPController(
      config.gravity,
      config.thrustMax,
      config.torqueMax,
      config.targetPosition
    );
    this.terrain = this.generateTerrain();
    this.setupCanvas();
  }

  private setupCanvas() {
    this.canvas.width = window.innerWidth * 0.8;
    this.canvas.height = window.innerHeight * 0.8;
    this.canvas.style.border = '1px solid black';
  }

  private generateTerrain(): TerrainPoint[] {
    const points: TerrainPoint[] = [];
    const segments = 20;
    const width = this.canvas.width;
    const baseHeight = this.canvas.height * 0.8;
    
    for (let i = 0; i <= segments; i++) {
      const x = (width * i) / segments;
      const y = baseHeight + Math.sin(i * 0.5) * 50;
      points.push({ x, y });
    }
    
    return points;
  }

  private drawTerrain() {
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height);
    this.terrain.forEach((point, i) => {
      if (i === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        this.ctx.lineTo(point.x, point.y);
      }
    });
    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#666';
    this.ctx.fill();
  }

  private drawLander() {
    this.ctx.save();
    this.ctx.translate(this.state.position.x, this.state.position.y);
    this.ctx.rotate(this.state.angle);
    
    // Draw lander body
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.moveTo(-10, -10);
    this.ctx.lineTo(10, -10);
    this.ctx.lineTo(0, 10);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw thrust if active
    if (this.state.thrust > 0) {
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
      this.config.targetPosition.x,
      this.config.targetPosition.y,
      10,
      0,
      Math.PI * 2
    );
    this.ctx.stroke();
    this.ctx.restore();
  }

  private checkCollision(): boolean {
    // Simple collision check with terrain segments
    for (let i = 0; i < this.terrain.length - 1; i++) {
      const p1 = this.terrain[i];
      const p2 = this.terrain[i + 1];
      
      if (this.state.position.x >= p1.x && 
          this.state.position.x <= p2.x && 
          this.state.position.y >= Math.min(p1.y, p2.y)) {
        return true;
      }
    }
    return false;
  }

  private update() {
    if (this.isPaused && !this.isStepMode) return;
    this.isStepMode = false;

    const control = this.controller.computeControl(this.state);
    
    // Update state based on physics
    const dt = 0.016; // 60fps
    const cosAngle = Math.cos(this.state.angle);
    const sinAngle = Math.sin(this.state.angle);
    
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;
    this.state.velocity.x += (control.thrust * sinAngle) * dt;
    this.state.velocity.y += (control.thrust * cosAngle - this.config.gravity) * dt;
    this.state.angle += this.state.angularVelocity * dt;
    this.state.angularVelocity += control.torque * dt;
    this.state.thrust = control.thrust;
    this.state.fuel -= control.thrust * dt;

    if (this.checkCollision()) {
      this.isPaused = true;
    }
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawTerrain();
    this.drawTarget();
    this.drawLander();
  }

  public gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  public togglePause() {
    this.isPaused = !this.isPaused;
  }

  public step() {
    this.isStepMode = true;
    this.isPaused = false;
  }

  public reset() {
    this.state = { ...this.config.initialState };
    this.isPaused = false;
  }
} 