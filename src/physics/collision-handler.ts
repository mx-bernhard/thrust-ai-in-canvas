import { GameState, Rectangle } from "../types";

export class CollisionHandler {
  private collisionFlashDuration: number = 200; // ms

  constructor(
    private getCanvasWidth: () => number,
    private getCanvasHeight: () => number,
    private getScale: () => number,
    private onCollisionFlash: (isColliding: boolean) => void,
  ) {}

  public checkCollision(state: GameState, obstacles: Rectangle[]): boolean {
    // Check collision with boundaries
    const boundaryMargin = 20; // Match the value in handleCollision

    if (
      state.position.x < boundaryMargin ||
      state.position.x >
        this.getCanvasWidth() / this.getScale() - boundaryMargin ||
      state.position.y < boundaryMargin ||
      state.position.y >
        this.getCanvasHeight() / this.getScale() - boundaryMargin
    ) {
      return true;
    }

    // Check collision with obstacles
    const landerRadius = 15; // Match the value in handleCollision

    for (const obstacle of obstacles) {
      // Calculate closest point on rectangle to lander
      const closestX = Math.max(
        obstacle.x,
        Math.min(state.position.x, obstacle.x + obstacle.width),
      );
      const closestY = Math.max(
        obstacle.y,
        Math.min(state.position.y, obstacle.y + obstacle.height),
      );

      // Vector from closest point to lander
      const dx = state.position.x - closestX;
      const dy = state.position.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < landerRadius) {
        return true;
      }
    }

    return false;
  }

  public handleCollision(state: GameState, obstacles: Rectangle[]): void {
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
      x: state.velocity.x,
      y: state.velocity.y,
    };

    if (state.position.x < boundaryMargin) {
      // Left boundary collision - reflect x velocity
      state.position.x = boundaryMargin;
      state.velocity.x = -state.velocity.x * restitution;
      collisionHandled = true;
    } else if (
      state.position.x >
      this.getCanvasWidth() / this.getScale() - boundaryMargin
    ) {
      // Right boundary collision - reflect x velocity
      state.position.x =
        this.getCanvasWidth() / this.getScale() - boundaryMargin;
      state.velocity.x = -state.velocity.x * restitution;
      collisionHandled = true;
    }

    if (state.position.y < boundaryMargin) {
      // Top boundary collision - reflect y velocity
      state.position.y = boundaryMargin;
      state.velocity.y = -state.velocity.y * restitution;
      collisionHandled = true;
    } else if (
      state.position.y >
      this.getCanvasHeight() / this.getScale() - boundaryMargin
    ) {
      // Bottom boundary collision - reflect y velocity
      state.position.y =
        this.getCanvasHeight() / this.getScale() - boundaryMargin;
      state.velocity.y = -state.velocity.y * restitution;
      collisionHandled = true;
    }

    // If boundary collision was handled, don't check obstacles
    if (collisionHandled) {
      // Ensure minimum velocity after collision to prevent getting stuck
      const minVelocity = 0.1;
      const currentSpeed = Math.hypot(state.velocity.x, state.velocity.y);

      if (currentSpeed < minVelocity) {
        // Apply a small random velocity to prevent getting stuck
        const angle = Math.random() * Math.PI * 2;
        state.velocity.x = Math.cos(angle) * minVelocity;
        state.velocity.y = Math.sin(angle) * minVelocity;
      }

      this.flashCollision();
      return;
    }

    // Check collision with obstacles
    const landerRadius = 15; // Increased from 10 for better collision detection
    for (const obstacle of obstacles) {
      // Calculate closest point on rectangle to lander
      const closestX = Math.max(
        obstacle.x,
        Math.min(state.position.x, obstacle.x + obstacle.width),
      );
      const closestY = Math.max(
        obstacle.y,
        Math.min(state.position.y, obstacle.y + obstacle.height),
      );

      // Vector from closest point to lander
      const dx = state.position.x - closestX;
      const dy = state.position.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < landerRadius) {
        // Normalize collision normal
        const nx = dx / distance;
        const ny = dy / distance;

        // Move lander outside obstacle (prevent penetration)
        state.position.x = closestX + nx * (landerRadius + 1); // Add 1 pixel extra to prevent sticking
        state.position.y = closestY + ny * (landerRadius + 1);

        // Calculate relative velocity along normal
        const velAlongNormal = state.velocity.x * nx + state.velocity.y * ny;

        // Only reflect if moving toward the obstacle
        if (velAlongNormal < 0) {
          // Calculate impulse scalar
          const impulse = -(1 + restitution) * velAlongNormal;

          // Apply impulse to velocity
          state.velocity.x += impulse * nx;
          state.velocity.y += impulse * ny;

          // Apply angular impulse based on offset from center
          // This creates realistic rotation on impact
          const impactOffset = Math.random() * 2 - 1; // Random offset for simplicity
          state.angularVelocity += impactOffset * impulse * 0.01;

          // Apply some friction to tangential velocity
          const friction = 0.3;
          const tx = -ny; // Tangent is perpendicular to normal
          const ty = nx;
          const velAlongTangent = state.velocity.x * tx + state.velocity.y * ty;

          state.velocity.x -= friction * velAlongTangent * tx;
          state.velocity.y -= friction * velAlongTangent * ty;

          // Ensure minimum velocity after collision to prevent getting stuck
          const minVelocity = 0.1;
          const currentSpeed = Math.hypot(state.velocity.x, state.velocity.y);

          if (currentSpeed < minVelocity) {
            // Scale up velocity to minimum
            const scale = minVelocity / currentSpeed;
            state.velocity.x *= scale;
            state.velocity.y *= scale;
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
        `Velocity before: (${originalVelocity.x.toFixed(2)}, ${originalVelocity.y.toFixed(2)}), after: (${state.velocity.x.toFixed(2)}, ${state.velocity.y.toFixed(2)})`,
      );
      this.flashCollision();
    }
  }

  // Add a visual effect for collision
  private flashCollision(): void {
    this.onCollisionFlash(true);

    setTimeout(() => {
      this.onCollisionFlash(false);
    }, this.collisionFlashDuration);
  }
}
