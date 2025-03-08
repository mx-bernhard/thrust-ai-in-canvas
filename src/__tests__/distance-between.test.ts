import { distanceBetween } from "../distance-between";
import { Vector2D } from "../types";

describe("distanceBetween", () => {
  test("calculates horizontal distance correctly", () => {
    const point1: Vector2D = { x: 0, y: 0 };
    const point2: Vector2D = { x: 3, y: 0 };
    const distance = distanceBetween(point1, point2);
    expect(distance).toBe(3);
  });

  test("calculates vertical distance correctly", () => {
    const point1: Vector2D = { x: 0, y: 0 };
    const point3: Vector2D = { x: 0, y: 4 };
    const distance = distanceBetween(point1, point3);
    expect(distance).toBe(4);
  });

  test("calculates diagonal distance correctly (Pythagorean theorem)", () => {
    const point1: Vector2D = { x: 0, y: 0 };
    const point4: Vector2D = { x: 3, y: 4 };
    const distance = distanceBetween(point1, point4);
    expect(distance).toBe(5);
  });
});
