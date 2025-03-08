import * as math from "mathjs";
import { Vector2D } from "./types";

export function getShortestLineToPath(
  path: Vector2D[],
  { x: px, y: py }: Vector2D,
) {
  let minDist = Infinity;
  let nextPoint = null;
  let nextSegment = null;

  for (let i = 0; i < path.length - 1; i++) {
    const { x: x1, y: y1 } = path[i];
    const { x: x2, y: y2 } = path[i + 1];

    // Direction vector of the segment
    const vx = x2 - x1;
    const vy = y2 - y1;

    // Vector from point P to start point A
    const wx = px - x1;
    const wy = py - y1;

    // Scalar product and projection
    const t = (wx * vx + wy * vy) / (vx * vx + vy * vy);

    let x_s, y_s;
    if (t < 0) {
      // Projection point is before A -> Take A
      x_s = x1;
      y_s = y1;
    } else if (t > 1) {
      // Projection point is behind B -> Take B
      x_s = x2;
      y_s = y2;
    } else {
      // Perpendicular projection is on the segment
      x_s = x1 + t * vx;
      y_s = y1 + t * vy;
    }

    // Calculate distance to point P
    const dist = math.sqrt((x_s - px) ** 2 + (y_s - py) ** 2);
    if (typeof dist !== "number") {
      throw new Error("Distance is not a number");
    }
    if (dist < minDist) {
      minDist = dist;
      nextPoint = { x: x_s, y: y_s };
      nextSegment = {
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
      };
    }
  }

  return {
    shortestDistance: minDist,
    crossSectionPoint: nextPoint,
    segment: nextSegment,
  };
}
