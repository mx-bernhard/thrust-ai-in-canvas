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
  private readonly boundaryMargin: number = 0;
  private readonly shipRadius: number = 15; // Ship radius for collision checking
  private readonly minPassageWidth: number = 30; // Minimum width for passages

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
      
      // Check if path is collision-free and not through narrow passages
      if (!this.collides(nearestNode.position, newPosition) && 
          !this.isInNarrowPassage(newPosition)) {
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

  // Check if a point is in a narrow passage between obstacles
  private isInNarrowPassage(point: Vector2D): boolean {
    // Find the two closest obstacles
    const distances: { distance: number; obstacle: Rectangle }[] = [];
    
    for (const obstacle of this.obstacles) {
      const distance = this.distanceToRectangle(point, obstacle);
      distances.push({ distance, obstacle });
    }
    
    // Sort by distance
    distances.sort((a, b) => a.distance - b.distance);
    
    // If we have at least two obstacles
    if (distances.length >= 2) {
      const firstObstacle = distances[0].obstacle;
      const secondObstacle = distances[1].obstacle;
      
      // If both obstacles are close enough to create a narrow passage
      if (distances[0].distance < this.minPassageWidth / 2 && 
          distances[1].distance < this.minPassageWidth / 2) {
        
        // Check if obstacles are on opposite sides of the point
        // This is a simplified check - we're looking for obstacles that create a narrow corridor
        
        // Get closest points on each obstacle
        const closestPoint1 = this.closestPointOnRectangle(point, firstObstacle);
        const closestPoint2 = this.closestPointOnRectangle(point, secondObstacle);
        
        // Calculate vectors from point to obstacles
        const vector1 = {
          x: closestPoint1.x - point.x,
          y: closestPoint1.y - point.y
        };
        
        const vector2 = {
          x: closestPoint2.x - point.x,
          y: closestPoint2.y - point.y
        };
        
        // Normalize vectors
        const length1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
        const length2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        
        if (length1 > 0 && length2 > 0) {
          vector1.x /= length1;
          vector1.y /= length1;
          vector2.x /= length2;
          vector2.y /= length2;
          
          // Calculate dot product
          const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
          
          // If vectors are pointing in roughly opposite directions (dot product < -0.5),
          // then the obstacles are on opposite sides creating a narrow passage
          if (dotProduct < -0.5) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  // Calculate distance from point to rectangle
  private distanceToRectangle(point: Vector2D, rect: Rectangle): number {
    // Find closest point on rectangle
    const closestPoint = this.closestPointOnRectangle(point, rect);
    
    // Calculate distance
    return this.distance(point, closestPoint);
  }

  // Find closest point on rectangle to given point
  private closestPointOnRectangle(point: Vector2D, rect: Rectangle): Vector2D {
    // Calculate closest point on rectangle
    const closestX = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
    
    return { x: closestX, y: closestY };
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
    // Check collision with obstacles (accounting for ship radius)
    for (const obstacle of this.obstacles) {
      // Expand obstacle by ship radius for collision checking
      const expandedObstacle = {
        x: obstacle.x - this.shipRadius,
        y: obstacle.y - this.shipRadius,
        width: obstacle.width + 2 * this.shipRadius,
        height: obstacle.height + 2 * this.shipRadius
      };
      
      if (this.lineIntersectsRectangle(from, to, expandedObstacle)) {
        return true;
      }
    }
    
    // Check collision with boundaries
    const effectiveBoundaryMargin = this.boundaryMargin + this.shipRadius;
    if (to.x < effectiveBoundaryMargin || to.x > this.width - effectiveBoundaryMargin ||
        to.y < effectiveBoundaryMargin || to.y > this.height - effectiveBoundaryMargin) {
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
        if (!this.collides(path[i], path[j]) && !this.hasNarrowPassage(path[i], path[j])) {
          furthestVisible = j;
          break;
        }
      }
      
      simplified.push(path[furthestVisible]);
      i = furthestVisible;
    }
    
    return simplified;
  }
  
  // Check if a path segment passes through any narrow passages
  private hasNarrowPassage(from: Vector2D, to: Vector2D): boolean {
    // Sample points along the path segment
    const distance = this.distance(from, to);
    const numSamples = Math.max(2, Math.ceil(distance / 10)); // Sample every 10 pixels
    
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const point = {
        x: from.x + t * (to.x - from.x),
        y: from.y + t * (to.y - from.y)
      };
      
      if (this.isInNarrowPassage(point)) {
        return true;
      }
    }
    
    return false;
  }
} 