import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, solve, numericalFlow, validate } from '../dist/physics.js';

function near(actual, expected, tolerance = 1e-10) {
  assert.ok(actual === expected || Math.abs(actual - expected) <= tolerance * Math.max(Math.abs(actual), Math.abs(expected)), `${actual} differs from ${expected}`);
}

test('hand reference: values, local profiles, and Newtonian stress relation', () => {
  const s = solve();
  near(s.q, 2.454369260617026e-6);
  near(s.avg, 0.03125);
  near(s.umax, 0.0625);
  near(s.tauw, 0.25);
  near(s.pressureForce, Math.PI * 0.005 ** 2 * 100);
  near(s.wallForce, 0.25 * 2 * Math.PI * 0.005);
  near(s.velocity(s.R / 2), 0.046875);
  near(s.gradient(s.R / 2), -12.5);
  near(s.shear(s.R / 2), 0.125);
  for (let i = 0; i <= 20; i += 1) {
    const r = s.R * i / 20;
    near(s.shear(r), -s.mu * s.gradient(r));
  }
  assert.equal(s.velocity(s.R), 0);
  assert.equal(s.gradient(0), 0);
  assert.equal(s.shear(0), 0);
});

test('numerical area integration agrees with analytical Q without using stored Q', () => {
  const s = solve();
  near(numericalFlow(s, 1000), s.q);
  near(numericalFlow({ ...s, q: -999 }, 1000), s.q);
  near(numericalFlow(s, 2), s.q);
});

test('pressure-controlled scaling and total-force distinction', () => {
  const baseline = solve();
  const pressure = solve({ dp: 200 });
  near(pressure.q, 2 * baseline.q);
  near(pressure.tauw, 2 * baseline.tauw);
  near(pressure.umax, 2 * baseline.umax);
  const length = solve({ L: 2 });
  near(length.q, baseline.q / 2);
  near(length.tauw, baseline.tauw / 2);
  near(length.wallForce, baseline.wallForce);
  const viscosity = solve({ mu: 0.02 });
  near(viscosity.q, baseline.q / 2);
  near(viscosity.tauw, baseline.tauw);
  const radius = solve({ R: 0.01 });
  near(radius.q, 16 * baseline.q);
  near(radius.tauw, 2 * baseline.tauw);
  near(radius.pressureForce, 4 * baseline.pressureForce);
});

test('flow-controlled inverse and radius, length, viscosity, throughput scaling', () => {
  const baseline = solve({ mode: 'flow', q: DEFAULTS.q });
  near(baseline.dp, 100);
  near(baseline.tauw, 0.25);
  near(solve({ mode: 'flow', R: 0.01 }).dp, baseline.dp / 16);
  near(solve({ mode: 'flow', R: 0.01 }).tauw, baseline.tauw / 8);
  near(solve({ mode: 'flow', L: 2 }).dp, 2 * baseline.dp);
  near(solve({ mode: 'flow', L: 2 }).tauw, baseline.tauw);
  near(solve({ mode: 'flow', mu: 0.02 }).dp, 2 * baseline.dp);
  near(solve({ mode: 'flow', mu: 0.02 }).tauw, 2 * baseline.tauw);
  near(solve({ mode: 'flow', q: 2 * DEFAULTS.q }).dp, 2 * baseline.dp);
  near(solve({ mode: 'flow', q: 2 * DEFAULTS.q }).tauw, 2 * baseline.tauw);
  const pressureState = solve({ R: 0.003, L: 0.7, mu: 0.025, dp: 70 });
  const recovered = solve({ ...pressureState, mode: 'flow' });
  near(recovered.dp, 70);
  near(recovered.q, pressureState.q);
});

test('zero driving input produces a zero-flow state in both modes', () => {
  for (const input of [{ dp: 0 }, { mode: 'flow', q: 0 }]) {
    const s = solve(input);
    for (const key of ['dp', 'q', 'avg', 'umax', 'tauw', 'pressureForce', 'wallForce']) assert.equal(s[key], 0);
    assert.equal(s.velocity(s.R / 2), 0);
    assert.equal(s.gradient(s.R), 0);
    assert.equal(s.shear(s.R), 0);
    assert.equal(numericalFlow(s), 0);
    assert.ok(validate(s).every(check => check.pass));
  }
});

test('invalid parameters, modes, and radial positions are rejected', () => {
  for (const key of ['R', 'L', 'mu']) {
    for (const value of [0, -1, NaN, Infinity, '1', undefined]) assert.throws(() => solve({ [key]: value }), RangeError);
  }
  for (const value of [-1, NaN, Infinity, '100', undefined]) {
    assert.throws(() => solve({ dp: value }), RangeError);
    assert.throws(() => solve({ mode: 'flow', q: value }), RangeError);
  }
  assert.throws(() => solve({ mode: 'other' }), RangeError);
  assert.throws(() => solve(null), TypeError);
  assert.throws(() => solve([]), TypeError);
  const s = solve();
  for (const method of ['velocity', 'gradient', 'shear']) {
    for (const r of [-0.001, s.R * 1.01, NaN, Infinity]) assert.throws(() => s[method](r), RangeError);
    assert.equal(s[method](s.R * (1 + Number.EPSILON)), s[method](s.R));
  }
});

test('integration rejects invalid interval counts', () => {
  for (const intervals of [0, -2, 3, 2.5, Infinity, 1000002]) assert.throws(() => numericalFlow(solve(), intervals), RangeError);
});

test('unrepresentable results are rejected; finite extreme products remain solvable', () => {
  assert.throws(() => solve({ R: 1e100 }), RangeError);
  assert.throws(() => solve({ R: 1e-100 }), RangeError);
  const s = solve({ R: 1e80, L: 1e80, mu: 1e80, dp: 1e-100 });
  assert.ok(Number.isFinite(s.q) && s.q > 0);
  near(numericalFlow(s), s.q, 1e-9);
  near(s.pressureForce, s.wallForce, 1e-9);
});

test('all displayed validation checks pass for representative pressure and flow states', () => {
  for (const input of [DEFAULTS, { R: 0.003, L: 2.4, mu: 0.07, dp: 1250 }, { mode: 'flow', q: 1e-6, R: 0.008, L: 0.6, mu: 0.02 }]) {
    const results = validate(solve(input));
    assert.ok(results.length >= 9);
    for (const result of results) assert.ok(result.pass, result.name);
  }
});
