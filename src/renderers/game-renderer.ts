import { GameState, Vector2D, Rectangle } from "../types";

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

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private scale: number;
  private isColliding: boolean = false;
  private showPath: boolean = true;
  private showDebugInfo: boolean = true;
  private showNarrowPassages: boolean = false;
  private debugInfo: DebugInfo;

  constructor(
    private canvas: HTMLCanvasElement,
    private getState: () => GameState,
    private getObstacles: () => Rectangle[],
    private getTargetPosition: () => Vector2D,
    private getWaypoints: () => Vector2D[],
    private getCurrentWaypointIndex: () => number,
    private getCurrentWaypoint: () => Vector2D,
    private getThrustMax: () => number,
    private getPathInterpolatorLookaheadDistance: () => number,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.scale = window.devicePixelRatio || 1;

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

  public setScale(scale: number): void {
    this.scale = scale;
    this.ctx.scale(this.scale, this.scale);
  }

  public setIsColliding(isColliding: boolean): void {
    this.isColliding = isColliding;
  }

  public setShowPath(showPath: boolean): void {
    this.showPath = showPath;
  }

  public setShowDebugInfo(showDebugInfo: boolean): void {
    this.showDebugInfo = showDebugInfo;
  }

  public setShowNarrowPassages(showNarrowPassages: boolean): void {
    this.showNarrowPassages = showNarrowPassages;
  }

  public setDebugInfo(debugInfo: DebugInfo): void {
    this.debugInfo = debugInfo;
  }

  public draw(): void {
    if (!this.ctx) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw obstacles
    this.drawObstacles();

    // Draw narrow passages if enabled
    if (this.showNarrowPassages) {
      this.drawNarrowPassages();
    }

    // Draw target
    this.drawTarget();

    // Draw path if available and enabled
    const waypoints = this.getWaypoints();
    if (waypoints.length > 0 && this.showPath) {
      this.drawPath();
    }

    // Draw ship
    this.drawLander();

    // Draw debug info if enabled
    if (this.showDebugInfo) {
      this.drawDebugInfo();
    }
  }

  private drawLander(): void {
    const state = this.getState();
    const { position, angle, thrust } = state;

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

  private drawObstacles(): void {
    const obstacles = this.getObstacles();
    this.ctx.fillStyle = "#666";
    for (const obstacle of obstacles) {
      this.ctx.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height,
      );
    }
  }

  private drawTarget(): void {
    const targetPosition = this.getTargetPosition();
    this.ctx.save();
    this.ctx.strokeStyle = "#0f0";
    this.ctx.beginPath();
    this.ctx.arc(targetPosition.x, targetPosition.y, 10, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawPath(): void {
    const waypoints = this.getWaypoints();
    if (waypoints.length <= 1) return;

    this.ctx.save();

    // Draw the path
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(waypoints[0].x, waypoints[0].y);

    for (let i = 1; i < waypoints.length; i++) {
      this.ctx.lineTo(waypoints[i].x, waypoints[i].y);
    }

    this.ctx.stroke();

    // Draw waypoints
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    const currentWaypointIndex = this.getCurrentWaypointIndex();

    for (let i = 0; i < waypoints.length; i++) {
      // Highlight the current waypoint
      if (i === currentWaypointIndex) {
        this.ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
        this.ctx.beginPath();
        this.ctx.arc(waypoints[i].x, waypoints[i].y, 8, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        this.ctx.beginPath();
        this.ctx.arc(waypoints[i].x, waypoints[i].y, 5, 0, Math.PI * 2);
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
    const state = this.getState();
    this.ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(state.position.x, state.position.y);
    this.ctx.lineTo(interpolatedTarget.x, interpolatedTarget.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawDebugInfo(): void {
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

    // Add waypoints following cost
    if (this.debugInfo.costs.waypoints !== undefined) {
      this.ctx.fillText(
        `Waypoints Cost: ${formatCost(this.debugInfo.costs.waypoints)}`,
        20,
        debugY,
      );
      debugY += lineHeight;
    }

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
      `Thrust: ${formatValue(this.debugInfo.thrust)} / ${this.getThrustMax()}`,
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
    const waypoints = this.getWaypoints();
    if (waypoints.length > 0) {
      this.ctx.fillText(
        `Waypoints: ${this.debugInfo.waypoints.total}`,
        150,
        190,
      );
      this.ctx.fillText(
        `Angle: ${formatValue(this.debugInfo.angle)}`,
        150,
        210,
      );
      this.ctx.fillText(
        `Lookahead: ${this.getPathInterpolatorLookaheadDistance()}`,
        150,
        230,
      );
    }

    this.ctx.restore();
  }

  private drawNarrowPassages(): void {
    const obstacles = this.getObstacles();
    if (!obstacles || obstacles.length < 2) return;

    const minPassageWidth = 40; // Same as in RRT

    // Check for narrow passages between obstacles
    for (let i = 0; i < obstacles.length; i++) {
      for (let j = i + 1; j < obstacles.length; j++) {
        const obstacle1 = obstacles[i];
        const obstacle2 = obstacles[j];

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
          this.ctx.save();

          // Draw line between closest points
          this.ctx.beginPath();
          this.ctx.moveTo(closestPoint1.x, closestPoint1.y);
          this.ctx.lineTo(closestPoint2.x, closestPoint2.y);
          this.ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
          this.ctx.lineWidth = 2;
          this.ctx.stroke();

          // Draw distance text
          const midX = (closestPoint1.x + closestPoint2.x) / 2;
          const midY = (closestPoint1.y + closestPoint2.y) / 2;
          this.ctx.fillStyle = "red";
          this.ctx.font = "12px Arial";
          this.ctx.fillText(`${minDistance.toFixed(1)}px`, midX, midY);

          this.ctx.restore();
        }
      }
    }
  }
}
