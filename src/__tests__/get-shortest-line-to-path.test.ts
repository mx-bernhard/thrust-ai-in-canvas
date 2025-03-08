import { getShortestLineToPath } from "../get-shortest-line-to-path";

test.each([
  {
    description: "is over first point",
    point: { x: 0, y: 10 },
    expected: { point: { x: 0, y: 0 }, distance: 10 },
  },
  {
    description: "is over first segment",
    point: { x: 1, y: 5 },
    expected: { point: { x: 1, y: 0 }, distance: 5 },
  },
  {
    description: "is below first segment",
    point: { x: 1, y: -5 },
    expected: { point: { x: 1, y: 0 }, distance: 5 },
  },
  {
    description: "is left of first point",
    point: { x: -1, y: -1 },
    expected: { point: { x: 0, y: 0 }, distance: Math.sqrt(2) },
  },
  {
    description: "is right of last point",
    point: { x: 11, y: 0 },
    expected: { point: { x: 10, y: 0 }, distance: 1 },
  },
  {
    description: "is below right of middle point",
    point: { x: 11, y: -1 },
    expected: { point: { x: 10, y: 0 }, distance: Math.sqrt(2) },
  },
  {
    description: "is above left of middle point",
    point: { x: 9, y: 1 },
    expected: { point: { x: 9, y: 0 }, distance: 1 },
  },
])("getShortestLineToPath: $description", ({ point, expected }) => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  const { shortestDistance: shortesDistance, crossSectionPoint } =
    getShortestLineToPath(path, point);
  expect(shortesDistance).toEqual(expected.distance);
  expect(crossSectionPoint).toEqual(expected.point);
});
