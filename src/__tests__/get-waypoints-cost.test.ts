import { getWaypointsFollowingCost } from "../get-waypoints-cost";
import { Vector2D } from "../types";

describe("getWaypointsFollowingCost", () => {
  // Constants for weights
  const distanceWeight = 10.0;
  const velocityWeight = 20.0;

  // Create a straight path of waypoints
  const straightWaypoints: Vector2D[] = [
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 300, y: 100 },
  ];

  describe("position on segment", () => {
    // Position very close to the second segment
    const positionOnSegment: Vector2D = { x: 150, y: 100.1 };

    test("velocity opposed to desired direction - high cost", () => {
      // Velocity going backward (opposite to path direction)
      const opposedVelocity: Vector2D = { x: -10, y: 0 };

      const cost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOnSegment,
        velocity: opposedVelocity,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      // Cost should be high due to velocity in opposite direction
      expect(cost).toBeGreaterThan(1000);
      console.log("Cost with opposed velocity:", cost);
    });

    test("velocity perpendicular to segment - medium cost", () => {
      // Velocity going perpendicular to the path (up)
      const perpendicularVelocity: Vector2D = { x: 0, y: 10 };

      const cost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOnSegment,
        velocity: perpendicularVelocity,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      // Get the opposed and aligned costs for comparison
      const opposedVelocity: Vector2D = { x: -10, y: 0 };
      const alignedVelocity: Vector2D = { x: 10, y: 0 };

      const opposedCost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOnSegment,
        velocity: opposedVelocity,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      const alignedCost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOnSegment,
        velocity: alignedVelocity,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      // Cost should be between opposed (high) and aligned (low)
      expect(cost).toBeLessThan(opposedCost);
      expect(cost).toBeGreaterThan(alignedCost);
      console.log("Cost with perpendicular velocity:", cost);
      console.log(
        "Cost range: " +
          alignedCost +
          " (aligned) to " +
          opposedCost +
          " (opposed)",
      );
    });

    test.each([
      { velocity: 1, expectedCost: 981 },
      { velocity: 10, expectedCost: 811 },
      { velocity: 90, expectedCost: 11 },
      { velocity: 100, expectedCost: 1 },
    ])(
      "velocity $velocity towards desired direction has cost $expectedCost",
      ({ velocity, expectedCost }) => {
        // Velocity going forward (aligned with path direction)
        const alignedVelocity: Vector2D = { x: velocity, y: 0 };

        const cost = getWaypointsFollowingCost({
          waypoints: straightWaypoints,
          position: positionOnSegment,
          velocity: alignedVelocity,
          waypointsDistanceWeight: distanceWeight,
          waypointsVelocityWeight: velocityWeight,
        });

        // With the continuous multiplier approach, the absolute cost value is higher
        // but still much lower than opposed or perpendicular motion
        expect(cost).toBeCloseTo(expectedCost, 0);
      },
    );
  });

  describe("position off segment", () => {
    // Position off any segment (above the path)
    const positionOffSegment: Vector2D = { x: 150, y: 150 };

    test("velocity away from segments - high cost", () => {
      // Velocity going further away from path
      const awayVelocity: Vector2D = { x: 0, y: 10 };

      const cost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOffSegment,
        velocity: awayVelocity,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      // Cost should be high due to moving away from path
      expect(cost).toBeGreaterThan(1.0);
      console.log("Cost with velocity away from path:", cost);
    });

    test("velocity towards segments - proper direction recognized", () => {
      // Velocity going towards the path
      const towardsVelocity: Vector2D = { x: 0, y: -10 };

      // Velocity going parallel to path (not helping to get closer)
      const parallelVelocity: Vector2D = { x: 10, y: 0 };

      const towardsCost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOffSegment,
        velocity: towardsVelocity,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      const parallelCost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOffSegment,
        velocity: parallelVelocity,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      // With the new continuous multiplier (300 * tanh(pathAlignmentDot * 3) + 350),
      // moving towards the path should be better than moving parallel
      expect(towardsCost).toBeLessThan(parallelCost);
      console.log("Cost with velocity towards path:", towardsCost);
      console.log("Cost with velocity parallel to path:", parallelCost);
    });
  });

  // Add a comparison test between on-path and off-path costs
  describe("consistency between on-path and off-path costs", () => {
    // On path positions
    const positionOnPath = { x: 150, y: 100 };

    // Off path position - not too far to make costs comparable
    const positionOffPath = { x: 150, y: 120 }; // 20 units away from path

    test("costs should be in the same ballpark regardless of position", () => {
      // Moving away costs
      const awayVelocityOnPath = { x: -10, y: 0 }; // Wrong direction on path
      const awayVelocityOffPath = { x: 0, y: 10 }; // Further from path

      // Moving towards costs
      const towardsVelocityOnPath = { x: 10, y: 0 }; // Right direction on path
      const towardsVelocityOffPath = { x: 0, y: -10 }; // Towards path

      // Calculate the costs
      const awayOnPathCost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOnPath,
        velocity: awayVelocityOnPath,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      const awayOffPathCost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOffPath,
        velocity: awayVelocityOffPath,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      const towardsOnPathCost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOnPath,
        velocity: towardsVelocityOnPath,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      const towardsOffPathCost = getWaypointsFollowingCost({
        waypoints: straightWaypoints,
        position: positionOffPath,
        velocity: towardsVelocityOffPath,
        waypointsDistanceWeight: distanceWeight,
        waypointsVelocityWeight: velocityWeight,
      });

      // Log all costs for comparison
      console.log("Away from path (on path):", awayOnPathCost);
      console.log("Away from path (off path):", awayOffPathCost);
      console.log("Towards path (on path):", towardsOnPathCost);
      console.log("Towards path (off path):", towardsOffPathCost);

      // With the continuous multiplier approach, we should still maintain
      // the relative ordering of costs with a smooth transition
      expect(towardsOnPathCost).toBeLessThan(awayOnPathCost);
      expect(towardsOffPathCost).toBeLessThan(awayOffPathCost);
    });
  });

  // Add a new test group for velocity magnitude effects
  describe("velocity magnitude effects on cost", () => {
    // Test cases for off-path position with varying velocity magnitudes
    describe("off path position with velocity towards path", () => {
      const positionOffPath = { x: 150, y: 120 }; // 20 units off the path

      test("high velocity towards path reduces cost compared to low velocity", () => {
        // High velocity towards path
        const highVelocityTowards: Vector2D = { x: 0, y: -20 };

        // Low velocity towards path
        const lowVelocityTowards: Vector2D = { x: 0, y: -5 };

        const highVelocityCost = getWaypointsFollowingCost({
          waypoints: straightWaypoints,
          position: positionOffPath,
          velocity: highVelocityTowards,
          waypointsDistanceWeight: distanceWeight,
          waypointsVelocityWeight: velocityWeight,
        });

        const lowVelocityCost = getWaypointsFollowingCost({
          waypoints: straightWaypoints,
          position: positionOffPath,
          velocity: lowVelocityTowards,
          waypointsDistanceWeight: distanceWeight,
          waypointsVelocityWeight: velocityWeight,
        });

        // With the continuous multiplier approach, higher velocity towards path
        // should still get a stronger reward, resulting in lower cost
        expect(highVelocityCost).toBeLessThan(lowVelocityCost);
        console.log("High velocity towards path cost:", highVelocityCost);
        console.log("Low velocity towards path cost:", lowVelocityCost);
      });
    });

    // Test cases for on-path position with varying velocity magnitudes
    describe("on path position with correct direction velocity", () => {
      const positionOnPath = { x: 150, y: 100 };

      test("high velocity in correct direction reduces cost compared to low velocity", () => {
        // High velocity along path
        const highVelocity: Vector2D = { x: 20, y: 0 };

        // Low velocity along path
        const lowVelocity: Vector2D = { x: 2, y: 0 };

        // Calculate costs
        const highVelocityCost = getWaypointsFollowingCost({
          waypoints: straightWaypoints,
          position: positionOnPath,
          velocity: highVelocity,
          waypointsDistanceWeight: distanceWeight,
          waypointsVelocityWeight: velocityWeight,
        });

        const lowVelocityCost = getWaypointsFollowingCost({
          waypoints: straightWaypoints,
          position: positionOnPath,
          velocity: lowVelocity,
          waypointsDistanceWeight: distanceWeight,
          waypointsVelocityWeight: velocityWeight,
        });

        // High velocity in correct direction should result in lower cost
        expect(highVelocityCost).toBeLessThan(lowVelocityCost);
        console.log("High velocity along path cost:", highVelocityCost);
        console.log("Low velocity along path cost:", lowVelocityCost);
      });
    });
  });
});
