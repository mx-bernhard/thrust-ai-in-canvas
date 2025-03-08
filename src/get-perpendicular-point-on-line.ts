import * as math from "mathjs";
import { Vector2D } from "./types";

export function getPerpendicularPointOnLine(
  point: Vector2D,
  lineStart: Vector2D,
  lineEnd: Vector2D,
): Vector2D {
  // Geradengleichung ax + by + c = 0 aus zwei Punkten bestimmen
  const a = lineEnd.y - lineStart.y;
  const b = lineStart.x - lineEnd.x;
  const c = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y;

  // Matrix A und Vektor B aufstellen
  const A = [
    [a, b],
    [b, -a],
  ];
  const B = [-c, a * point.y - b * point.x];

  const result = math.lusolve(A, B);
  const xs = Array.isArray(result[0]) ? result[0][0] : result[0];
  const ys = Array.isArray(result[1]) ? result[1][0] : result[1];

  return { x: -1 * Number(xs), y: Number(ys) };
}
