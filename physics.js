/** Hagen–Poiseuille flow. Every input and returned scalar uses SI units. */
export const DEFAULTS = Object.freeze({
  R: 0.005,
  L: 1,
  mu: 0.01,
  dp: 100,
  q: 2.454369260617026e-6,
  mode: 'pressure',
});

const LOG_PI = Math.log(Math.PI);
const LOG_TWO = Math.log(2);
const LOG_EIGHT = Math.log(8);

function requireNumber(value, name, allowZero = false) {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new RangeError(`${name} must be a finite ${allowZero ? 'nonnegative' : 'positive'} number in SI units.`);
  }
}

function representable(logValue, name) {
  const value = Math.exp(logValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} is outside the numerical range. Choose less extreme inputs.`);
  }
  return value;
}

/**
 * Solve a steady operating state. Only the selected driving input is prescribed;
 * the other is calculated. dp is a positive inlet-to-outlet pressure-drop magnitude.
 */
export function solve(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Provide a parameter object.');
  }
  const parameters = { ...DEFAULTS, ...input };
  const { R, L, mu, mode } = parameters;
  requireNumber(R, 'Radius R');
  requireNumber(L, 'Length L');
  requireNumber(mu, 'Viscosity μ');
  if (mode !== 'pressure' && mode !== 'flow') {
    throw new RangeError('Mode must be "pressure" or "flow".');
  }
  const drivingValue = mode === 'pressure' ? parameters.dp : parameters.q;
  requireNumber(drivingValue, mode === 'pressure' ? 'Pressure drop ΔP' : 'Flow rate Q', true);

  let dp = 0;
  let q = 0;
  let avg = 0;
  let umax = 0;
  let tauw = 0;
  let pressureForce = 0;
  let wallForce = 0;
  let wallGradient = 0;
  if (drivingValue > 0) {
    const logR = Math.log(R);
    const logL = Math.log(L);
    const logMu = Math.log(mu);
    const logDrive = Math.log(drivingValue);
    const logDp = mode === 'pressure'
      ? logDrive
      : logDrive + LOG_EIGHT + logMu + logL - LOG_PI - 4 * logR;
    const logQ = mode === 'flow'
      ? logDrive
      : logDrive + LOG_PI + 4 * logR - LOG_EIGHT - logMu - logL;
    const logAvg = logQ - LOG_PI - 2 * logR;
    const logTau = logDp + logR - LOG_TWO - logL;
    // Logarithmic products avoid invalid intermediate overflow/underflow.
    dp = mode === 'pressure' ? drivingValue : representable(logDp, 'Pressure drop');
    q = mode === 'flow' ? drivingValue : representable(logQ, 'Flow rate');
    avg = representable(logAvg, 'Average velocity');
    umax = representable(logAvg + LOG_TWO, 'Maximum velocity');
    tauw = representable(logTau, 'Wall shear stress');
    pressureForce = representable(logDp + LOG_PI + 2 * logR, 'Pressure force');
    // Compute shear force from stress × wall area, independently of pressure force.
    wallForce = representable(logTau + LOG_TWO + LOG_PI + logR + logL, 'Wall shear force');
    wallGradient = representable(logAvg + 2 * LOG_TWO - logR, 'Wall velocity gradient');
  }

  function radialFraction(r) {
    const tolerance = 32 * Number.EPSILON * R;
    if (!Number.isFinite(r) || r < -tolerance || r > R + tolerance) {
      throw new RangeError('Radial position must be finite and within 0 ≤ r ≤ R.');
    }
    return Math.max(0, Math.min(1, r / R));
  }
  return {
    ...parameters,
    dp,
    q,
    avg,
    umax,
    tauw,
    pressureForce,
    wallForce,
    velocity(r) {
      const fraction = radialFraction(r);
      return umax * (1 - fraction) * (1 + fraction);
    },
    gradient(r) {
      const magnitude = wallGradient * radialFraction(r);
      return magnitude === 0 ? 0 : -magnitude;
    },
    shear(r) {
      return tauw * radialFraction(r);
    },
  };
}

/**
 * Independently integrate Q = ∫u(r)2πr dr using composite Simpson's rule.
 * The dimensionless radial coordinate and normalized velocities keep summation
 * stable, while the scale comes from velocity and radius, not analytical Q.
 */
export function numericalFlow(solution, intervals = 1000) {
  if (!Number.isInteger(intervals) || intervals < 2 || intervals > 1000000 || intervals % 2 !== 0) {
    throw new RangeError('Integration intervals must be an even integer from 2 to 1,000,000.');
  }
  if (solution.umax === 0) return 0;
  let sum = 0;
  for (let index = 0; index <= intervals; index += 1) {
    const fraction = index / intervals;
    const value = (solution.velocity(solution.R * fraction) / solution.umax) * fraction;
    const weight = index === 0 || index === intervals ? 1 : index % 2 === 0 ? 2 : 4;
    sum += weight * value;
  }
  const integral = sum / (3 * intervals);
  return representable(LOG_TWO + LOG_PI + 2 * Math.log(solution.R) + Math.log(solution.umax) + Math.log(integral), 'Integrated flow rate');
}

function close(a, b, tolerance = 1e-9) {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tolerance * Math.max(Math.abs(a), Math.abs(b));
}

function concise(value) {
  return value === 0 ? '0' : value.toPrecision(6);
}

/** Current-state checks plus fixed, reproducible reference/scaling checks. */
export function validate(solution) {
  const integrated = numericalFlow(solution);
  const reference = solve(DEFAULTS);
  const referencePass = [
    [reference.q, 2.454369260617026e-6],
    [reference.avg, 0.03125],
    [reference.umax, 0.0625],
    [reference.tauw, 0.25],
    [reference.pressureForce, 0.007853981633974483],
    [reference.wallForce, 0.007853981633974483],
  ].every(([actual, expected]) => close(actual, expected));
  const pressureDouble = solve({ ...DEFAULTS, dp: 200 });
  const lengthDouble = solve({ ...DEFAULTS, L: 2 });
  const viscosityDouble = solve({ ...DEFAULTS, mu: 0.02 });
  const radiusDouble = solve({ ...DEFAULTS, R: 0.01 });
  const flowReference = solve({ ...DEFAULTS, mode: 'flow' });
  const flowDouble = solve({ ...DEFAULTS, mode: 'flow', q: 2 * DEFAULTS.q });
  const flowRadiusDouble = solve({ ...DEFAULTS, mode: 'flow', R: 0.01 });
  const flowLengthDouble = solve({ ...DEFAULTS, mode: 'flow', L: 2 });
  const flowViscosityDouble = solve({ ...DEFAULTS, mode: 'flow', mu: 0.02 });
  const pressureScalingPass = [
    [pressureDouble.q, 2 * reference.q],
    [pressureDouble.tauw, 2 * reference.tauw],
    [lengthDouble.q, reference.q / 2],
    [lengthDouble.tauw, reference.tauw / 2],
    [lengthDouble.wallForce, reference.wallForce],
    [viscosityDouble.q, reference.q / 2],
    [viscosityDouble.tauw, reference.tauw],
    [radiusDouble.q, 16 * reference.q],
    [radiusDouble.tauw, 2 * reference.tauw],
  ].every(([actual, expected]) => close(actual, expected));
  const flowScalingPass = [
    [flowDouble.dp, 2 * flowReference.dp],
    [flowDouble.tauw, 2 * flowReference.tauw],
    [flowRadiusDouble.dp, flowReference.dp / 16],
    [flowRadiusDouble.tauw, flowReference.tauw / 8],
    [flowLengthDouble.dp, 2 * flowReference.dp],
    [flowLengthDouble.tauw, flowReference.tauw],
    [flowViscosityDouble.dp, 2 * flowReference.dp],
    [flowViscosityDouble.tauw, 2 * flowReference.tauw],
  ].every(([actual, expected]) => close(actual, expected));
  const wallMaxPass = close(solution.shear(solution.R), solution.tauw)
    && Array.from({ length: 21 }, (_, index) => solution.shear(solution.R * index / 20))
      .every(value => value >= 0 && value <= solution.tauw);
  return [
    { name: 'No slip at the wall', pass: solution.velocity(solution.R) === 0, detail: `u(R) = ${concise(solution.velocity(solution.R))} m/s.` },
    { name: 'Zero centerline gradient', pass: solution.gradient(0) === 0, detail: `du/dr at r = 0 is ${concise(solution.gradient(0))} s⁻¹.` },
    { name: 'Zero center shear; maximum at wall', pass: solution.shear(0) === 0 && wallMaxPass, detail: `τ(0) = 0 Pa; τ(R) = ${concise(solution.tauw)} Pa.` },
    { name: 'Maximum velocity is twice the average', pass: close(solution.umax, 2 * solution.avg), detail: `uₘₐₓ = ${concise(solution.umax)} m/s; 2ū = ${concise(2 * solution.avg)} m/s.` },
    { name: 'Numerical annular integration', pass: close(integrated, solution.q), detail: `Simpson integration: ${concise(integrated)} m³/s; analytical Q: ${concise(solution.q)} m³/s (relative tolerance 10⁻⁹).` },
    { name: 'Pressure and wall forces balance', pass: close(solution.pressureForce, solution.wallForce), detail: `${concise(solution.pressureForce)} N versus ${concise(solution.wallForce)} N (relative tolerance 10⁻⁹).` },
    { name: 'Fixed hand-calculated reference', pass: referencePass, detail: 'R = 0.005 m, L = 1 m, μ = 0.01 Pa·s, ΔP = 100 Pa: Q = 2.45437 × 10⁻⁶ m³/s; uₘₐₓ = 0.0625 m/s; τw = 0.25 Pa; force = 0.00785398 N.' },
    { name: 'Fixed-pressure scaling cases', pass: pressureScalingPass, detail: 'Double ΔP: Q and τw ×2. Double L: Q and τw ÷2, total force unchanged. Double μ: Q ÷2, τw unchanged. Double R: Q ×16, τw ×2.' },
    { name: 'Fixed-flow scaling cases', pass: flowScalingPass, detail: 'Double Q: ΔP and τw ×2. Double R: ΔP ÷16, τw ÷8. Double L: ΔP ×2, τw unchanged. Double μ: ΔP and τw ×2.' },
  ];
}
