import { test } from 'zora';
import { Double } from '../dist/double.js';

let D = Double;
let eps1 = 1e-15;
let eps2 = 1e-30;
let abs = Math.abs;
let diff, diff2, expected, expected2, actual, actual2, actual3;

test('IEEE verification in your browser (based on ref. [4])', t => {
  expected = Infinity;
  actual = (1e308 + 1e308) / 1e308;
  t.ok(actual == expected, 'Infinity');
  actual = 0/0;
  t.ok(isNaN(actual), 'NaN');
  expected = 1.0000000000000002;
  actual = 1 / (1 - Math.pow(2,-53))
  t.ok(actual == expected, 'double rounding 1');
  expected = Infinity;
  actual = 1e1023 * (2 - Math.pow(2, -52))
  t.ok(actual == expected, 'double rounding 2');
  expected = 9007199254740994;
  actual = 1 - 1/65536 + 9007199254740994;
  t.ok(actual == expected, 'SSE2 rounding 1');
  expected = 1.1125369292536007e-308;
  actual = 1.5 * 2.2250738585072014e-308 - 2.2250738585072014e-308;
  t.ok(actual == expected, 'SSE2 rounding 2');
});

test('constructor test', t => {
  let d = new D(0.3);
  t.ok(d instanceof D, 'constructed from number');
  let d2 = new D('0.3');
  t.ok(d2 instanceof D, 'constructed from string');
  let d3 = new D({ hi: 0.3, lo: 0 });
  t.ok(d3 instanceof D, 'constructed from object');
  let d4 = new D([0.3, 0]);
  t.ok(d4 instanceof D, 'constructed from array');
  let d5 = new D(d);
  t.deepEqual(d3, d, 'fromObject() equal to fromNumber()');
  t.deepEqual(d4, d, 'fromArray() equal to fromNumber()');
  t.deepEqual(d5, d, 'clone() equal to fromString()');
  t.ok(d.toNumber() == 0.3, 'toNumber() equal to number');
});

test('classic test', t => {
  expected = new D('0.2');
  actual = new D('0.3').sub(new D('0.1'));
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, '0.3-0.1 = 0.2 (result = ' + actual.toNumber() +', diff=' + diff + ')');
});

test('unary operators with double', t => {
  expected = D.One;
  actual = D.Log2.mul(D.Log2.inv());
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'inv2(x) * x (diff=' + diff + ')');
  expected = D.Zero;
  actual = D.Log2.add(D.Log2.neg());
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'neg2(x) + x (diff=' + diff + ')');
  expected = D.Pi;
  actual = D.Pi.neg().abs();
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'abs2(x) (diff=' + diff + ')');
  expected = D.Log2;
  actual = D.Log2.sqr().sqrt();
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'sqr2 (sqrt2 (x)) (diff=' + diff + ')');
  expected = D.Log2;
  actual = D.Log2.ln().exp();
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2,'exp2( ln2 (x)) (diff=' + diff + ')');
  expected = D.One;
  actual = D.Log2.cosh().sqr().sub(D.Log2.sinh().sqr());
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2,'cosh(x)² - sinh(x)² = 1 (diff=' + diff + ')');
});

test('double-single operations', t => {
  expected = D.Pi;
  actual = D.Pi.add(D.E.hi).add(-D.E.hi);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'add21 with inverted (diff=' + diff + ')');
  expected = D.Pi;
  actual = D.Pi.sub(D.E.hi).sub(-D.E.hi);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'sub21 with inverted (diff=' + diff + ')');
  expected = D.Pi;
  actual = D.mul22(D.mul21(D.Pi, D.E.hi), new D(D.E.hi).inv());
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'mul21 with inverted (diff=' + diff + ')');
  expected = D.Pi;
  actual = D.div22(D.div21(D.Pi, D.E.hi), new D(D.E.hi).inv());
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'div21 with inverted (diff=' + diff + ')');
  expected = D.E;
  actual = D.E.mul(D.Pi.hi).div(D.Pi.hi);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'mul21/div21 inverse (diff=' + diff + ')');
  expected = 1e20; expected2 = 1e-20;
  actual = new D([10, 0]).pown(20).toNumber(); actual2 = new D([10, 0]).pown(-20).toNumber();
  diff = abs(actual - expected); diff2 = abs(actual2 - expected2);
  t.ok(diff < eps2 && diff2 < eps2,'pow2n (diff=' + diff + ', diff2=' + diff2 + ')');
});

test('double-double operations', t => {
  expected = D.Log2;
  actual = D.Log2.add(D.E).sub(D.E);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'additive inverse (diff=' + diff + ')');
  expected = D.Pi;
  actual = D.Pi.mul(D.Log2).div(D.Log2);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'multiplicative inverse (diff=' + diff + ')');
  expected = D.Pi;
  actual = D.Pi.pow(D.E).pow(D.E.inv());
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'pow22 (diff=' + diff + ')');
});

test('fromSum11 / fromMul11 / fromSqr1', t => {
  expected = new D(1024);
  actual = D.fromSum11(512, 512);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'fromSum11 (diff=' + diff + ')');
  expected = new D(1024);
  actual = D.fromMul11(32, 32);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'fromMul11 (diff=' + diff + ')');
  expected = new D(1024);
  actual = D.fromSqr1(32);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'fromSqr1 (diff=' + diff + ')');
});

test('fromString', t => {
  expected = 123456789;
  actual = new D('123456789Q').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'integer numbers (diff=' + diff + ')');
  expected = -100;
  actual = new D(-100).toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'negative numbers (diff=' + diff + ')');
  expected = 654321.789;
  actual = new D(' 654321.789').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'fractional (diff=' + diff + ')');
  expected = 120;
  actual = new D('12e1').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'exponent format (diff=' + diff + ')');
  expected = 1.2;
  actual = new D('12e-1').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps1, 'negative exponent (diff=' + diff + ')');
  expected = -0.123;
  actual = new D('-.123R').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'short defenition (diff=' + diff + ')');
  expected = 123.12e6;
  actual = new D('123.12e6').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'scientific format (diff=' + diff + ')');
  expected = 123e12;
  actual = new D('123e12.6').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'mixed up (diff=' + diff + ')');
  expected = 456.12;
  actual = new D('456.12.6').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'two dot (diff=' + diff + ')');
  expected = 123e-12;
  actual = new D('123e-12e6').toNumber();
  diff = abs(expected - actual);
  t.ok(diff < eps2, 'two exp (diff=' + diff + ')');
  expected = 9e300;
  actual = new D('9e300');
  diff = abs(expected - actual.toNumber());
  t.ok(diff < Infinity, 'large exponent (diff=' + diff + ')');
  expected = 0;
  actual = new D('9e-322');
  diff = abs(expected - actual.toNumber());
  t.ok(diff < eps2, 'Tiny exponent (diff=' + diff + ')');
  actual = new D('1e500').toNumber();
  actual2 = new D('-1e500').toNumber();
  t.ok(actual === Infinity && actual2 === -Infinity, 'Giant exponent');
  actual = new D('1e-500').toNumber();
  actual2 = new D('-1e-500').toNumber();
  t.ok(actual === 0 && actual2 === 0, 'Insignificant exponent');
  actual = D.Zero.toNumber();
  t.ok(actual === 0, 'Zero number');
  actual = new D(Infinity).toNumber();
  actual2 = new D('-Infinity').toNumber();
  actual3 = new D('Infinity').toNumber();
  t.ok(actual === Infinity && actual2 === -Infinity && actual3 === Infinity, 'Infinity number');
  actual = D.NaN.toNumber();
  actual2 = new D('SDLFK').toNumber();
  actual3 = new D('  ').toNumber();
  t.ok(isNaN(actual) && isNaN(actual2) && isNaN(actual3), 'NaN number');
});

test('toExponential', t => {
  expected = new D('3.1415926535897932384626433832795');
  actual = new D(new D('3.1415926535897932384626433832795').toExponential());
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'double -> string -> double (diff=' + diff + ')');
  expected = 'NaN';
  actual = D.NaN.toExponential();
  t.ok(actual == expected, 'NaN');
  expected = 'Infinity';
  actual = D.Infinity.toExponential();
  t.ok(actual == expected, 'Infinity');
  expected = '0e+0'
  actual = new D(0).toExponential();
  t.ok(actual == expected, 'Zero');
  expected = '-';
  actual = new D(-0.5).toExponential().slice(0, 1);
  t.ok(actual == expected, 'Negative');
  expected = '9.007199254740993e+15';
  actual = new D('9007199254740992').add(new Double('1')).toExponential();
  t.ok(actual == expected, '2**53+1');
});

test('constants', t => {
  expected = D.Pi;
  actual = new D('3.1415926535897932384626433832795');
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'pi (diff=' + diff + ')');
  expected = D.X2Pi;
  actual = new D('6.2831853071795864769252867665590');
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'x2pi (diff=' + diff + ')');
  expected = D.E;
  actual = new D('2.7182818284590452353602874713526');
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'e (diff=' + diff + ')');
  expected = D.Log2;
  actual = new D('0.69314718055994530941723212145817');
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'ln(2) (diff=' + diff + ')');
  expected = D.Phi;
  actual = new D('1.6180339887498948482045868343656');
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'phi (diff=' + diff + ')');
  expected = new D('3.1415926535897932384626433832795');
  actual = new D('4.7123889803846898576939650749192').mul(new D('0.66666666666666666666666666666666'));
  diff = expected.sub(actual).abs().toNumber();
})

test('comparisons', t => {
  t.ok(D.Pi.eq(D.Pi.mul(D.One)) && D.Pi.ne(D.Log2) && D.Zero.eq(0) && D.One.ne(2), 'eq, ne (true)');
  t.ok(!D.Pi.eq(D.Log2) && !D.Pi.ne(D.Pi) && !D.Zero.eq(D.Log2) && !D.One.ne(1), 'eq, ne (false)');
  t.ok(D.Pi.lt(D.X2Pi) && D.Pi.le(D.X2Pi) && D.Pi.lt(4) && D.Pi.le(4), 'lt, le (true)');
  t.ok(!D.Pi.lt(D.Pi) && !D.Pi.le(D.One) && !D.One.lt(1) && !D.Pi.le(1), 'lt, le (false)');
  t.ok(D.X2Pi.gt(D.Pi) && D.X2Pi.ge(D.Pi) && D.Pi.gt(2) && D.Pi.ge(2), 'gt, ge (true)');
  t.ok(!D.One.gt(D.One) && !D.Pi.ge(4) && !D.Zero.gt(0) && !D.Pi.ge(4), 'gt, ge (false)');
});

test('exp2 / ln2', t => {
  expected = Double.One;
  actual = Double.Zero.exp();
  t.ok(expected.eq(actual), 'exp(0) = 1');
  expected = Double.E;
  actual = Double.One.exp();
  t.ok(expected.eq(actual), 'exp(1) = e');
  expected = Double.Zero;
  actual = Double.One.ln();
  t.ok(expected.eq(actual), 'ln(1) = 0');
  expected = Double.MinusInfinity;
  actual = Double.Zero.ln();
  t.ok(expected.eq(actual), 'ln(1) = 0');
});

test('extended tests', t => {
  let phi = new D([5, 0]).sqrt().add(1).div(2);
  expected = new D(phi).add(1);
  actual = new D(phi).sqr();
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'ϕ² = ϕ + 1 (diff=' + diff + ')');
  expected = new D(phi).inv();
  actual = phi.sub(1);
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, '1/ϕ = ϕ - 1 (diff=' + diff + ')');
  t.ok(diff < eps2, 'parsed mult (3*pi/2) * (2/3) (diff=' + diff + ')');
  expected = new D('5.8598744820488384738229308546321');
  actual = new D('3.1415926535897932384626433832795').add(new D('2.7182818284590452353602874713526'));
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'parsed add (e + pi) (diff=' + diff + ')');
  expected = new D('1.7724538509055160272981674833411');
  actual = new D('3.1415926535897932384626433832795').sqrt();
  diff = expected.sub(actual).abs().toNumber();
  t.ok(diff < eps2, 'parsed sqt (sqrt(pi)) (diff=' + diff + ')');
})
