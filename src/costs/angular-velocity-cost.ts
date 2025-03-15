/**
 * Calculates the cost of angular velocity.
 *
 * @param angularVelocity - The current angular velocity
 * @param angularVelocityWeight - The weight for angular velocity cost
 * @returns The angular velocity cost
 */
export const calculateAngularVelocityCost = (
  angularVelocity: number,
  angularVelocityWeight: number,
): number => {
  return Math.pow(angularVelocity * angularVelocityWeight, 2);
};
