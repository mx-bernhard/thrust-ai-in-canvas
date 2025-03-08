import { getPerpendicularPointOnLine } from "../get-perpendicular-point-on-line";
import { Vector2D } from "../types";

test.each([
  { point: { x: 5, y: 5 }, expected: { x: 5, y: 0 } },
  { point: { x: 5, y: -5 }, expected: { x: 5, y: 0 } },
  { point: { x: 5, y: 0 }, expected: { x: 5, y: 0 } },
  { point: { x: 0, y: 0 }, expected: { x: -0, y: 0 } },
  { point: { x: 10, y: 0 }, expected: { x: 10, y: 0 } },
])(
  "getPerpendicularPointOnLine for point $point returns $expected",
  ({ point, expected }) => {
    const point1: Vector2D = { x: 0, y: 0 };
    const point2: Vector2D = { x: 10, y: 0 };
    const perpendicularPoint = getPerpendicularPointOnLine(
      point,
      point1,
      point2,
    );
    expect(perpendicularPoint).toEqual(expected);
  },
);
