import { Rectangle, Vector2D } from "../types";

export class ObstacleManager {
  private obstacles: Rectangle[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private scale: number;

  constructor(canvasWidth: number, canvasHeight: number, scale: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.scale = scale;
  }

  public getObstacles(): Rectangle[] {
    return this.obstacles;
  }

  public setCanvasDimensions(
    width: number,
    height: number,
    scale: number,
  ): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.scale = scale;
  }

  public generateObstacles(
    startPosition: Vector2D,
    targetPosition: Vector2D,
    obstaclesAmount: number,
  ): Rectangle[] {
    const obstacles: Rectangle[] = [];
    const canvasWidth = this.canvasWidth / this.scale;
    const canvasHeight = this.canvasHeight / this.scale;

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
      for (let i = 0; i < obstaclesAmount; i++) {
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
            newRect.x - startPosition.x,
            newRect.y - startPosition.y,
          );
          const targetDist = Math.hypot(
            newRect.x - targetPosition.x,
            newRect.y - targetPosition.y,
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

    this.obstacles = obstacles;
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
}
