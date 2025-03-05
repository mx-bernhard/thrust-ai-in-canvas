import { Vector2D, Rectangle } from './types';

// Node in the RRT tree
interface RRTNode {
  position: Vector2D;
  parent: RRTNode | null;
}

export class RRTPathPlanner {
  private readonly maxIterations: number = 1000;
  private readonly stepSize: number = 20;
  private readonly goalBias: number = 0.1;
  private readonly goalThreshold: number = 30;
  private readonly obstacles: Rectangle[];
  private readonly width: number;
  private readonly height: number;
  private readonly boundaryMargin: number = 20;

  constructor(obstacles: Rectangle[], width: number, height: number) {
    this.obstacles = obstacles;
    this.width = width;
    this.height = height;
  }

  // Find a path from start to goal
  public findPath(start: Vector2D, goal: Vector2D): Vector2D[] {
    // Initialize tree with start node
    const startNode: RRTNode = { position: start, parent: null };
    const tree: RRTNode[] = [startNode];
    
    // Try to find a path
    for (let i = 0; i < this.maxIterations; i++) {
      // Sample random point (with goal bias)
      const randomPoint = Math.random() < this.goalBias 
        ? goal 
        : this.sampleRandomPoint();
      
      // Find nearest node in tree
      const nearestNode = this.findNearestNode(tree, randomPoint);
      
      // Extend tree toward random point
      const newPosition = this.steer(nearestNode.position, randomPoint, this.stepSize);
      
      // Check if path is collision-free
      if (!this.collides(nearestNode.position, newPosition)) {
        // Add new node to tree
        const newNode: RRTNode = { position: newPosition, parent: nearestNode };
        tree.push(newNode);
        
        // Check if we reached the goal
        if (this.distance(newPosition, goal) < this.goalThreshold) {
          // Construct and return path
          return this.constructPath(newNode);
        }
      }
    }
    
    // No path found, return empty array
    console.log("RRT: No path found after maximum iterations");
    return [];
  }

  // Sample a random point in the space
  private sampleRandomPoint(): Vector2D {
    return {
      x: this.boundaryMargin + Math.random() * (this.width - 2 * this.boundaryMargin),
      y: this.boundaryMargin + Math.random() * (this.height - 2 * this.boundaryMargin)
    };
  }

  // Find the nearest node in the tree to the given point
  private findNearestNode(tree: RRTNode[], point: Vector2D): RRTNode {
    let nearestNode = tree[0];
    let minDistance = this.distance(tree[0].position, point);
    
    for (let i = 1; i < tree.length; i++) {
      const dist = this.distance(tree[i].position, point);
      if (dist < minDistance) {
        minDistance = dist;
        nearestNode = tree[i];
      }
    }
    
    return nearestNode;
  }

  // Steer from start toward goal with maximum step size
  private steer(from: Vector2D, to: Vector2D, stepSize: number): Vector2D {
    const dist = this.distance(from, to);
    
    if (dist <= stepSize) {
      return to;
    } else {
      const ratio = stepSize / dist;
      return {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      };
    }
  }

  // Check if a line segment collides with any obstacle
  private collides(from: Vector2D, to: Vector2D): boolean {
    // Check collision with obstacles
    for (const obstacle of this.obstacles) {
      if (this.lineIntersectsRectangle(from, to, obstacle)) {
        return true;
      }
    }
    
    // Check collision with boundaries
    if (to.x < this.boundaryMargin || to.x > this.width - this.boundaryMargin ||
        to.y < this.boundaryMargin || to.y > this.height - this.boundaryMargin) {
      return true;
    }
    
    return false;
  }

  // Check if a line segment intersects a rectangle
  private lineIntersectsRectangle(from: Vector2D, to: Vector2D, rect: Rectangle): boolean {
    // Check if either endpoint is inside the rectangle
    if (this.pointInRectangle(from, rect) || this.pointInRectangle(to, rect)) {
      return true;
    }
    
    // Check if line intersects any of the rectangle's edges
    const rectEdges = [
      { from: { x: rect.x, y: rect.y }, to: { x: rect.x + rect.width, y: rect.y } },
      { from: { x: rect.x + rect.width, y: rect.y }, to: { x: rect.x + rect.width, y: rect.y + rect.height } },
      { from: { x: rect.x + rect.width, y: rect.y + rect.height }, to: { x: rect.x, y: rect.y + rect.height } },
      { from: { x: rect.x, y: rect.y + rect.height }, to: { x: rect.x, y: rect.y } }
    ];
    
    for (const edge of rectEdges) {
      if (this.lineSegmentsIntersect(from, to, edge.from, edge.to)) {
        return true;
      }
    }
    
    return false;
  }

  // Check if a point is inside a rectangle
  private pointInRectangle(point: Vector2D, rect: Rectangle): boolean {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  // Check if two line segments intersect
  private lineSegmentsIntersect(
    a: Vector2D, b: Vector2D, 
    c: Vector2D, d: Vector2D
  ): boolean {
    // Calculate direction vectors
    const r = { x: b.x - a.x, y: b.y - a.y };
    const s = { x: d.x - c.x, y: d.y - c.y };
    
    // Calculate determinant
    const denominator = r.x * s.y - r.y * s.x;
    
    // Lines are parallel or collinear
    if (Math.abs(denominator) < 1e-10) {
      return false;
    }
    
    // Calculate parameters
    const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denominator;
    const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denominator;
    
    // Check if intersection is within both line segments
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // Calculate Euclidean distance between two points
  private distance(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Construct path from goal node to start node
  private constructPath(goalNode: RRTNode): Vector2D[] {
    const path: Vector2D[] = [];
    let currentNode: RRTNode | null = goalNode;
    
    // Traverse from goal to start
    while (currentNode !== null) {
      path.unshift(currentNode.position);
      currentNode = currentNode.parent;
    }
    
    // Simplify path by removing redundant waypoints
    return this.simplifyPath(path);
  }

  // Simplify path by removing unnecessary waypoints
  private simplifyPath(path: Vector2D[]): Vector2D[] {
    if (path.length <= 2) {
      return path;
    }
    
    const simplified: Vector2D[] = [path[0]];
    let i = 0;
    
    while (i < path.length - 1) {
      let furthestVisible = i + 1;
      
      // Find furthest visible node
      for (let j = path.length - 1; j > i; j--) {
        if (!this.collides(path[i], path[j])) {
          furthestVisible = j;
          break;
        }
      }
      
      simplified.push(path[furthestVisible]);
      i = furthestVisible;
    }
    
    return simplified;
  }
} 