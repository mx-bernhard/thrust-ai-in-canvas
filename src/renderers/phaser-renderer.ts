import { GameState, Vector2D, Rectangle } from "../types";
import * as Phaser from "phaser";

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

export class PhaserRenderer {
  private game!: Phaser.Game;
  private phaserScene?: LanderScene;
  public isColliding: boolean = false;
  public showPath: boolean = true;
  public showDebugInfo: boolean = true;
  public showNarrowPassages: boolean = false;
  public debugInfo: DebugInfo;
  public scale: number;
  private readyCallback?: () => void;

  constructor(
    private canvasElement: HTMLCanvasElement,
    public getState: () => GameState,
    public getObstacles: () => Rectangle[],
    public getTargetPosition: () => Vector2D,
    public getWaypoints: () => Vector2D[],
    public getCurrentWaypointIndex: () => number,
    public getCurrentWaypoint: () => Vector2D,
    public getThrustMax: () => number,
    public getPathInterpolatorLookaheadDistance: () => number,
    readyCallback?: () => void,
  ) {
    this.scale = window.devicePixelRatio || 1;
    this.readyCallback = readyCallback;
    console.log("PhaserRenderer constructor called");
    console.log(
      "Canvas dimensions:",
      canvasElement.width,
      canvasElement.height,
    );

    // Make sure our canvas element is visible
    canvasElement.style.display = "block";
    canvasElement.style.backgroundColor = "#000000";

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

    try {
      const phaserConfig: Phaser.Types.Core.GameConfig = {
        type: Phaser.CANVAS,
        width: canvasElement.width,
        height: canvasElement.height,
        canvas: canvasElement,
        backgroundColor: "#000000",
        scene: LanderScene,
        render: {
          antialias: true,
          pixelArt: false,
          roundPixels: false,
        },
        parent: canvasElement.parentElement || undefined,
        transparent: false,
        clearBeforeRender: true,
        fps: {
          target: 60,
          forceSetTimeOut: true,
        },
      };

      // Initialize Phaser game
      console.log("Creating Phaser game with config:", phaserConfig);
      this.game = new Phaser.Game(phaserConfig);

      // Store renderer reference in registry to access from scene
      this.game.registry.set("renderer", this);

      // Listen for events
      this.game.events.once("ready", () => {
        console.log("Phaser ready event triggered");
        this.phaserScene = this.game.scene.getScene(
          "LanderScene",
        ) as LanderScene;
        if (this.phaserScene) {
          this.phaserScene.rendererRef = this;
          console.log(
            "Set rendererRef in LanderScene, scene is active:",
            this.phaserScene.scene.isActive(),
          );

          // Make sure scene is started
          if (!this.phaserScene.scene.isActive()) {
            console.log("Starting LanderScene...");
            this.phaserScene.scene.start();
          }

          // Call the ready callback if provided
          if (this.readyCallback) {
            console.log("Calling renderer ready callback");
            this.readyCallback();
          }
        }
      });

      // Listen for errors
      window.addEventListener("error", (e) => {
        console.error("Global error caught:", e.message);
      });
    } catch (error) {
      console.error("Error creating Phaser game:", error);
    }
  }

  public setScale(scale: number): void {
    this.scale = scale;
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
    // Trigger a manual update of the Phaser scene
    console.log("PhaserRenderer.draw() called, phaserScene:", this.phaserScene);

    if (this.phaserScene) {
      // Force update of the renderer debug info with current state
      const state = this.getState();
      this.debugInfo.position = { ...state.position };
      this.debugInfo.velocity = { ...state.velocity };
      this.debugInfo.angle = state.angle;
      this.debugInfo.thrust = state.thrust;
      this.debugInfo.speed = Math.sqrt(
        state.velocity.x * state.velocity.x +
          state.velocity.y * state.velocity.y,
      );

      // Trigger manual update
      this.phaserScene.renderUpdate();
    } else {
      console.warn("PhaserScene not available in draw() call");

      // Try to get a reference to the scene
      try {
        if (this.game) {
          this.phaserScene = this.game.scene.getScene(
            "LanderScene",
          ) as LanderScene;
          if (this.phaserScene) {
            console.log("Retrieved scene reference in draw()");
            this.phaserScene.rendererRef = this;
            this.phaserScene.renderUpdate();
          } else {
            console.error("Could not get LanderScene reference");
          }
        }
      } catch (error) {
        console.error("Error trying to get scene in draw():", error);
      }
    }
  }

  // Helper methods for formatting debug values
  public formatCost(cost: number): string {
    if (cost < 0.01) return "0";
    if (cost > 999999) return (cost / 1000000).toFixed(2) + "M";
    if (cost > 9999) return (cost / 1000).toFixed(2) + "K";
    return cost.toFixed(2);
  }

  public formatValue(val: number): string {
    return val.toFixed(2);
  }
}

// Phaser scene class
class LanderScene extends Phaser.Scene {
  // Reference to the PhaserRenderer
  public rendererRef!: PhaserRenderer;

  // Game objects
  private ship!: Phaser.GameObjects.Container;
  private shipBody!: Phaser.GameObjects.Polygon;
  private thrustFlame!: Phaser.GameObjects.Polygon;
  private obstacles: Phaser.GameObjects.Rectangle[] = [];
  private target!: Phaser.GameObjects.Graphics;
  private waypointsGraphics!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;
  private waypointsInfoText!: Phaser.GameObjects.Text;
  private narrowPassagesGraphics!: Phaser.GameObjects.Graphics;
  private narrowPassagesLabels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: "LanderScene" });
    console.log("LanderScene constructor called");
  }

  init(): void {
    console.log("LanderScene init method called");
    try {
      // Try to get the renderer reference from the registry
      this.rendererRef = this.game.registry.get("renderer") as PhaserRenderer;
      console.log("Got rendererRef in init:", this.rendererRef);
    } catch (error) {
      console.error("Error in LanderScene init:", error);
    }
  }

  preload(): void {
    console.log("LanderScene preload method called");
  }

  create(): void {
    console.log("LanderScene create method called");

    try {
      if (!this.rendererRef) {
        console.error(
          "rendererRef not available in create(), attempting to get from registry",
        );
        this.rendererRef = this.game.registry.get("renderer") as PhaserRenderer;
      }

      // Get initial state to position objects correctly
      const initialState = this.rendererRef.getState();

      // Create a graphics object for the ship rather than using a container and polygon
      const shipGraphics = this.add.graphics();

      // Draw the ship triangle
      shipGraphics.fillStyle(0xffffff);
      shipGraphics.beginPath();
      shipGraphics.moveTo(0, -10); // Top
      shipGraphics.lineTo(7, 10); // Bottom right
      shipGraphics.lineTo(-7, 10); // Bottom left
      shipGraphics.closePath();
      shipGraphics.fillPath();

      // Create ship as a container with the ship graphics
      this.ship = this.add.container(
        initialState.position.x,
        initialState.position.y,
      );
      this.ship.add(shipGraphics);

      // Set initial rotation
      this.ship.setRotation(initialState.angle);

      // Store reference to the ship body
      this.shipBody = shipGraphics as unknown as Phaser.GameObjects.Polygon;

      // Create thrust flame graphics
      const thrustGraphics = this.add.graphics();
      thrustGraphics.fillStyle(0xff9900);
      thrustGraphics.beginPath();
      thrustGraphics.moveTo(-5, 10);
      thrustGraphics.lineTo(0, 20);
      thrustGraphics.lineTo(5, 10);
      thrustGraphics.closePath();
      thrustGraphics.fillPath();
      thrustGraphics.visible = false;

      // Add thrust to ship
      this.ship.add(thrustGraphics);

      // Store reference to thrust flame
      this.thrustFlame =
        thrustGraphics as unknown as Phaser.GameObjects.Polygon;

      // Create target indicator
      this.target = this.add.graphics();

      // Create waypoints graphics
      this.waypointsGraphics = this.add.graphics();

      // Create narrow passages visualization
      this.narrowPassagesGraphics = this.add.graphics();

      // Create debug text
      this.debugText = this.add.text(20, 20, "", {
        fontFamily: "monospace",
        color: "#ffffff",
        fontSize: "14px",
      });

      // Waypoints info text
      this.waypointsInfoText = this.add.text(150, 190, "", {
        fontFamily: "monospace",
        color: "#ffffff",
        fontSize: "14px",
      });

      // Force initial drawing
      this.renderUpdate();

      console.log(
        "Scene setup complete, ship position:",
        this.ship.x,
        this.ship.y,
      );
    } catch (error) {
      console.error("Error in LanderScene create:", error);
    }
  }

  update(): void {
    // Automatically update based on the game state
    // This runs in Phaser's internal game loop
    if (this.rendererRef) {
      try {
        const state = this.rendererRef.getState();
        this.ship.setPosition(state.position.x, state.position.y);
        this.ship.setRotation(state.angle);

        // Update flame visibility based on thrust
        if (state.thrust > 0) {
          this.thrustFlame.visible = true;
        } else {
          this.thrustFlame.visible = false;
        }
      } catch (error) {
        console.error("Error in scene update:", error);
      }
    }
  }

  renderUpdate(): void {
    if (!this.rendererRef) {
      console.error("rendererRef not available in renderUpdate()");
      return;
    }

    try {
      // Clear all graphics
      this.target.clear();
      this.waypointsGraphics.clear();
      this.narrowPassagesGraphics.clear();

      // Clear previous distance labels
      this.narrowPassagesLabels.forEach((label) => label.destroy());
      this.narrowPassagesLabels = [];

      // Update ship and obstacles
      this.updateShip();
      this.updateObstacles();

      // Draw target
      this.drawTarget();

      // Draw path if needed
      if (this.rendererRef.showPath) {
        this.drawPath();
      }

      // Draw narrow passages if needed
      if (this.rendererRef.showNarrowPassages) {
        this.drawNarrowPassages();
      }

      // Update debug info
      if (this.rendererRef.showDebugInfo) {
        this.updateDebugInfo();
      } else {
        this.debugText.visible = false;
        this.waypointsInfoText.visible = false;
      }
    } catch (error) {
      console.error("Error in renderUpdate:", error);
    }
  }

  private updateShip(): void {
    if (!this.rendererRef) return;

    const state = this.rendererRef.getState();
    const { position, angle, thrust } = state;

    // Update ship position and rotation
    this.ship.setPosition(position.x, position.y);
    this.ship.setRotation(angle);

    // Update ship color (flash red on collision)
    if (this.rendererRef.isColliding) {
      // Flash red
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).clear();
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).fillStyle(
        0xff3333,
      );
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).beginPath();
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).moveTo(0, -10);
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).lineTo(7, 10);
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).lineTo(-7, 10);
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).closePath();
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).fillPath();
    } else {
      // Normal white
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).clear();
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).fillStyle(
        0xffffff,
      );
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).beginPath();
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).moveTo(0, -10);
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).lineTo(7, 10);
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).lineTo(-7, 10);
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).closePath();
      (this.shipBody as unknown as Phaser.GameObjects.Graphics).fillPath();
    }

    // Update thrust flame
    if (thrust > 0) {
      const flameHeight = 10 + thrust * 1.5;

      // Update flame
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).visible =
        true;
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).clear();
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).fillStyle(
        0xff9900,
      );
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).beginPath();
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).moveTo(
        -5,
        10,
      );
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).lineTo(
        0,
        flameHeight,
      );
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).lineTo(
        5,
        10,
      );
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).closePath();
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).fillPath();
    } else {
      // Hide flame
      (this.thrustFlame as unknown as Phaser.GameObjects.Graphics).visible =
        false;
    }
  }

  private updateObstacles(): void {
    if (!this.rendererRef) return;

    const obstacles = this.rendererRef.getObstacles();

    // Clear existing obstacles if count doesn't match
    if (this.obstacles.length !== obstacles.length) {
      this.obstacles.forEach((o) => o.destroy());
      this.obstacles = [];

      // Create new obstacles
      obstacles.forEach((obstacle) => {
        const rect = this.add.rectangle(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2,
          obstacle.width,
          obstacle.height,
          0x666666,
        );
        this.obstacles.push(rect);
      });
    } else {
      // Update existing obstacles
      obstacles.forEach((obstacle, index) => {
        this.obstacles[index].setPosition(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2,
        );
        this.obstacles[index].setSize(obstacle.width, obstacle.height);
      });
    }
  }

  private drawTarget(): void {
    if (!this.rendererRef) return;

    const target = this.rendererRef.getTargetPosition();

    this.target.lineStyle(1, 0x00ff00);
    this.target.strokeCircle(target.x, target.y, 10);
  }

  private drawPath(): void {
    if (!this.rendererRef) return;

    const waypoints = this.rendererRef.getWaypoints();
    if (waypoints.length <= 1) return;

    // Draw path line
    this.waypointsGraphics.lineStyle(2, 0xffffff, 0.3);
    this.waypointsGraphics.beginPath();
    this.waypointsGraphics.moveTo(waypoints[0].x, waypoints[0].y);

    for (let i = 1; i < waypoints.length; i++) {
      this.waypointsGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    }

    this.waypointsGraphics.strokePath();

    // Draw waypoints
    const currentIndex = this.rendererRef.getCurrentWaypointIndex();

    for (let i = 0; i < waypoints.length; i++) {
      if (i === currentIndex) {
        // Current waypoint
        this.waypointsGraphics.fillStyle(0x00ffff);
        this.waypointsGraphics.fillCircle(waypoints[i].x, waypoints[i].y, 5);
      } else {
        // Other waypoints
        this.waypointsGraphics.fillStyle(0xffff00);
        this.waypointsGraphics.fillCircle(waypoints[i].x, waypoints[i].y, 3);
      }
    }
  }

  private drawNarrowPassages(): void {
    if (!this.rendererRef) return;

    const obstacles = this.rendererRef.getObstacles();
    if (!obstacles || obstacles.length < 2) return;

    const minPassageWidth = 40; // Same as in RRT

    for (let i = 0; i < obstacles.length; i++) {
      for (let j = i + 1; j < obstacles.length; j++) {
        const obstacle1 = obstacles[i];
        const obstacle2 = obstacles[j];

        // Find closest points between obstacles (sampling edges)
        let minDistance = Infinity;
        let closestPoint1 = { x: 0, y: 0 };
        let closestPoint2 = { x: 0, y: 0 };

        // Define obstacle edges
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

        // Sample points along edges to find closest pair
        for (const edge1 of edges1) {
          for (const edge2 of edges2) {
            const samples = 5;

            for (let s1 = 0; s1 <= samples; s1++) {
              const t1 = s1 / samples;
              const p1 = {
                x: edge1.start.x + t1 * (edge1.end.x - edge1.start.x),
                y: edge1.start.y + t1 * (edge1.end.y - edge1.start.y),
              };

              for (let s2 = 0; s2 <= samples; s2++) {
                const t2 = s2 / samples;
                const p2 = {
                  x: edge2.start.x + t2 * (edge2.end.x - edge2.start.x),
                  y: edge2.start.y + t2 * (edge2.end.y - edge2.start.y),
                };

                const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

                if (dist < minDistance) {
                  minDistance = dist;
                  closestPoint1 = p1;
                  closestPoint2 = p2;
                }
              }
            }
          }
        }

        // Draw line between closest points if distance is below threshold
        if (minDistance < minPassageWidth) {
          this.narrowPassagesGraphics.lineStyle(2, 0xff0000, 0.7);
          this.narrowPassagesGraphics.beginPath();
          this.narrowPassagesGraphics.moveTo(closestPoint1.x, closestPoint1.y);
          this.narrowPassagesGraphics.lineTo(closestPoint2.x, closestPoint2.y);
          this.narrowPassagesGraphics.strokePath();

          // Add distance label
          const midX = (closestPoint1.x + closestPoint2.x) / 2;
          const midY = (closestPoint1.y + closestPoint2.y) / 2;

          const label = this.add
            .text(midX, midY, `${minDistance.toFixed(0)}px`, {
              fontSize: "12px",
              color: "#ff0000",
              backgroundColor: "#000000",
            })
            .setOrigin(0.5);

          this.narrowPassagesLabels.push(label);
        }
      }
    }
  }

  private updateDebugInfo(): void {
    if (!this.rendererRef) return;

    const debugInfo = this.rendererRef.debugInfo;
    const formatCost = this.rendererRef.formatCost.bind(this.rendererRef);
    const formatValue = this.rendererRef.formatValue.bind(this.rendererRef);

    // Show debug info
    this.debugText.visible = true;
    this.waypointsInfoText.visible = true;

    // Build debug text
    let debugText = "";
    debugText += `Position Cost: ${formatCost(debugInfo.costs.position)}\n`;
    debugText += `Velocity Cost: ${formatCost(debugInfo.costs.velocity)}\n`;
    debugText += `Angular Vel Cost: ${formatCost(debugInfo.costs.angularVelocity)}\n`;
    debugText += `Obstacle Cost: ${formatCost(debugInfo.costs.obstacle)}\n`;
    debugText += `Boundary Cost: ${formatCost(debugInfo.costs.boundary)}\n`;

    if (debugInfo.costs.waypoints !== undefined) {
      debugText += `Waypoints Cost: ${formatCost(debugInfo.costs.waypoints)}\n`;
    }

    if (debugInfo.costs.collisionCourse !== undefined) {
      debugText += `Collision Course: ${formatCost(debugInfo.costs.collisionCourse)}\n`;
    }

    debugText += `Total Cost: ${formatCost(debugInfo.costs.total)}\n`;
    debugText += `Pos: (${debugInfo.position.x.toFixed(0)}, ${debugInfo.position.y.toFixed(0)})\n`;
    debugText += `Vel X: ${formatValue(debugInfo.velocity.x)}\n`;
    debugText += `Vel Y: ${formatValue(debugInfo.velocity.y)}\n`;
    debugText += `Speed: ${formatValue(debugInfo.speed)}\n`;
    debugText += `Thrust: ${formatValue(debugInfo.thrust)} / ${this.rendererRef.getThrustMax()}\n`;
    debugText += `Torque: ${formatValue(debugInfo.torque)}\n`;

    if (debugInfo.interpolatedTarget) {
      const target = debugInfo.interpolatedTarget;
      debugText += `Target: (${target.position.x.toFixed(0)}, ${target.position.y.toFixed(0)})\n`;
      debugText += `Distance: ${target.distance.toFixed(0)}\n`;
    }

    this.debugText.setText(debugText);

    // Update waypoints info
    const waypoints = this.rendererRef.getWaypoints();
    if (waypoints.length > 0) {
      this.waypointsInfoText.setText(
        `Waypoints: ${debugInfo.waypoints.total}\n` +
          `Angle: ${formatValue(debugInfo.angle)}\n` +
          `Lookahead: ${this.rendererRef.getPathInterpolatorLookaheadDistance()}`,
      );
    } else {
      this.waypointsInfoText.setText("");
    }
  }
}
