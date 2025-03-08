import { PathInterpolator } from "../path-interpolation";
import { Vector2D } from "../types";

describe("PathInterpolator", () => {
  describe("getInterpolatedTarget with waypoints", () => {
    const interpolator = new PathInterpolator(100, 200);
    const finalTarget: Vector2D = { x: 300, y: 0 };
    describe("straight waypoint line", () => {
      // Waypoints in a straight line along x-axis
      const waypoints: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 150, y: 0 },
      ];

      test.each([
        {
          description:
            "to a point at a reasonable distance using both waypoint segments",
          currentPosition: { x: 24, y: 27 },
          expectedResult: { x: 97, y: 0 },
        },
        {
          description:
            "to a point on the second segment if the current position is left to the first waypoint",
          currentPosition: { x: -1, y: 0 },
          expectedResult: { x: 99, y: 0 },
        },
        {
          description:
            "from the start of the first waypoint into the second segments",
          currentPosition: { x: 0, y: 0 },
          expectedResult: { x: 100, y: 0 },
        },
        {
          description:
            "from the start of the second waypoint to the exactly the last waypoint point",
          currentPosition: { x: 50, y: 0 },
          expectedResult: { x: 150, y: 0 },
        },
        {
          description:
            "to a point off the closest waypoint when the current position is far from the path",
          currentPosition: { x: -1000, y: 0 },
          expectedResult: { x: -900, y: 0 },
        },
      ])("interpolates $description", ({ currentPosition, expectedResult }) => {
        const result = interpolator.getInterpolatedTarget(
          currentPosition,
          waypoints,
          finalTarget,
        );

        expect(result).toEqual(expectedResult);
      });
    });

    describe("waypoint path along slope", () => {
      const waypoints: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 150, y: 150 },
      ];
      test.each([
        {
          description:
            "prefers the second segment due to the perpendicular distance being shorter inside the slope area",
          currentPosition: { x: 49, y: 10 },
          expectedResult: { x: 106, y: 84 },
        },
        {
          description:
            "prefers the second segment due to the perpendicular distance being shorter outside the slope area",
          currentPosition: { x: 60, y: 10 },
          expectedResult: { x: 112, y: 92 },
        },
      ])("$description", ({ currentPosition, expectedResult }) => {
        const result = interpolator.getInterpolatedTarget(
          currentPosition,
          waypoints,
          finalTarget,
        );

        expect(result.x).toBeCloseTo(expectedResult.x, 0);
        expect(result.y).toBeCloseTo(expectedResult.y, 0);
      });
    });
  });
});
