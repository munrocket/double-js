/* Basic error-free transformation algorithms */

type float = number;
type int = number;
const splitter = 134217729.; // Veltkamp’s splitter (= 2^27+1 for 64-bit float)

// Møller's and Knuth's summation (algorithm 2 from [1], reordered to work on gpu)
function twoSum(a: float, b: float) {
  let s = a + b;
  let b1  = s - a;
  return { hi: s, lo: (b - b1) + (a - (s - b1)) };
}

// Dekker’s multiplication (algorithm 4.7 with inlined 4.6 from [2])
function twoProd(a: float, b: float) {
  let t = splitter * a;
  let ah = t + (a - t), al = a - ah;
  t = splitter * b;
  let bh = t + (b - t), bl = b - bh;
  t = a * b;
  return { hi: t, lo: ((ah * bh - t) + ah * bl + al * bh) + al * bl };
}
function oneSqr(a: float) {
  let t = splitter * a;
  let ah = t + (a - t), al = a - ah;
  t = a * a;
  let hl = al * ah;
  return { hi: t, lo: ((ah * ah - t) + hl + hl) + al * al };
}

/* Main class for double-word arithmetic */

class Double {

  hi: float;
  lo: float;

  constructor(obj?: any) {
    if (obj instanceof Double) {
      this.hi = obj.hi;
      this.lo = obj.lo;
      return this;
    }

    switch (typeof obj) {
      case 'number':
        this.hi = obj;
        this.lo = 0;
        break;

      case 'string': {
        const d = Double.fromString(obj);
        this.hi = d.hi;
        this.lo = d.lo;
        break;
      }

      case 'object':
        if (Array.isArray(obj)) {
          this.hi = +obj[0];
          this.lo = +obj[1];
        }
        else {
          this.hi = +obj.hi;
          this.lo = +obj.lo;
        }
        break;

      default:
        this.hi = NaN;
        this.lo = NaN;
        // or throw TypeError
    }

  }

  /* Static constructors */
    
  static clone(X: Double): Double { let d = new Double(); d.hi = X.hi; d.lo = X.lo; return d; }
  static fromSum11(a: float, b: float): Double { return new Double(twoSum(a, b)); }
  static fromMul11(a: float, b: float): Double { return new Double(twoProd(a, b)); }
  static fromSqr1(a: float): Double { return new Double(oneSqr(a)); }
  static fromString(s: string): Double {
    s = s.trim();
    let first = s[0]
    let isPositive = first != '-';
    if (first == '+' || first == '-') s = s.slice(1);
    if (s.includes('Infinity')) return (isPositive) ? Double.Infinity : Double.neg2(Double.Infinity);
    let rex = /^(\d*\.?\d+)(?:[eE]([-+]?\d+))?/.exec(s);
    if (!rex) return Double.NaN;

    let digits = rex[1].replace('.', '');
    let exp = (rex[2] !== undefined) ? parseInt(rex[2]) : 0;
    let dotId = rex[0].indexOf('.');
    if (dotId == -1) dotId = digits.length;
    if (exp + dotId - 1. < -300.) return isPositive ? Double.Zero : Double.neg2(Double.Zero);
    if (exp + dotId - 1. > 300.) return isPositive ? Double.Infinity : Double.neg2(Double.Infinity);

    let nextDigs: string, shift: Double, result = Double.Zero;
    for (let i = 0; i < digits.length; i += 15) {
      nextDigs = digits.slice(i, i + 15);
      shift = Double.pow2n(new Double(10.), exp + dotId - i - nextDigs.length);
      Double.add22(result, Double.mul21(shift, parseInt(nextDigs)));
    }
    return (isPositive) ? result : Double.neg2(result);
  }

  /* Convertations */

  toNumber(): float {
    return this.hi + this.lo;
  }

  toExponential(precision: int): string {
    if (isNaN(this.hi)) return 'NaN';
    if (!isFinite(this.hi) || this.toNumber() == 0.) return this.hi.toExponential(precision);
    let remainder = Double.clone(this);
    let str = remainder.hi.toExponential(precision).split('e');
    if (str[0].length > 16) str[0] = str[0].slice(0, 16)
    let result = str[0];
    let i = str[0].length - str[0].indexOf('.') - 1;
    if (str[0].indexOf('.') < 0) i--;
    Double.sub22(remainder, new Double(result + 'e' + str[1]))
    if (remainder.hi < 0.) Double.mul21(remainder, -1.0);
    if (precision !== undefined && precision > 33) precision = 33;
    while (true) {
      let nextPrecision = undefined;
      if (precision === undefined) {
        if (remainder.toNumber() <= 0.) break;
      } else {
        if (i >= precision) break;
        if (remainder.toNumber() <= 0.) {
          result += '0';
          i++;
          continue;
        }
        nextPrecision = precision - i;
        if (nextPrecision > 14) nextPrecision = 14;
      }
      let next = remainder.hi.toExponential(nextPrecision).split('e');
      let nextDigs = next[0].replace(/^0\.|\./, '');
      let nextLength = nextDigs.length;
      if (nextLength > 15) nextLength = 15;
      if (precision === undefined) {
        if ((nextLength + i) > 33) nextLength = 33 - i;
      } else {
        if ((nextLength + i) > precision) nextLength = precision - i;
      }
      nextDigs = nextDigs.slice(0, nextLength);
      result += nextDigs;
      i += nextLength;
      if (i >= 33) break;
      let sub = nextDigs[0] + '.' + nextDigs.slice(1)
      Double.sub22(remainder, new Double(sub + 'e' + next[1]))
    }
    return result + 'e' + str[1];
  }

  /* Arithmetic operations with two double */

  // AccurateDWPlusDW (6 with inlined 1 from [1])
  static add22(X: Double, Y: Double): Double {
    let S = twoSum(X.hi, Y.hi);
    let E = twoSum(X.lo, Y.lo);
    let c = S.lo + E.hi;
    let vh  = S.hi + c, vl = c - (vh - S.hi);
    c = vl + E.lo;
    X.hi = vh + c;
    X.lo = c - (X.hi - vh);
    return X;
  }

  // AccurateDWPlusDW with negated Y
  static sub22(X: Double, Y: Double): Double {
    let S = twoSum(X.hi, -Y.hi);
    let E = twoSum(X.lo, -Y.lo);
    let c = S.lo + E.hi;
    let vh  = S.hi + c, vl = c - (vh - S.hi);
    c = vl + E.lo;
    X.hi = vh + c;
    X.lo = c - (X.hi - vh);
    return X;
  }

  // DWTimesDW1 (10 with inlined 1 from [1])
  static mul22(X: Double, Y: Double): Double {
    let S = twoProd(X.hi, Y.hi);
    S.lo += X.hi * Y.lo + X.lo * Y.hi;
    X.hi = S.hi + S.lo;
    X.lo = S.lo - (X.hi - S.hi);
    return X;
  }

  // Dekker division (div2 from [3])
  static div22(X: Double, Y: Double): Double {
    let s = X.hi / Y.hi;
    let T = twoProd(s, Y.hi);
    let e = ((((X.hi - T.hi) - T.lo) + X.lo) - s * Y.lo) / Y.hi;
    X.hi = s + e;
    X.lo = e - (X.hi - s);
    return X;
  }

  /* Arithmetic operations with double and single */

  // DWPlusFP (4 with inlined 1 from [1])
  static add21(X: Double, f: float): Double {
    let S = twoSum(X.hi, f);
    S.lo += X.lo;
    X.hi = S.hi + S.lo;
    X.lo = S.lo - (X.hi - S.hi);
    return X;
  }

  static sub21(X: Double, f: float): Double {
    let S = twoSum(X.hi, -f);
    S.lo += X.lo;
    X.hi = S.hi + S.lo;
    X.lo = S.lo - (X.hi - S.hi);
    return X;
  }

  // DWTimesFP1 (7 with inlined 1 from [1])
  static mul21(X: Double, f: float): Double {
    let C = twoProd(X.hi, f);
    let cl = X.lo * f;
    let th = C.hi + cl;
    X.lo = cl - (th - C.hi);
    cl = X.lo + C.lo;
    X.hi = th + cl;
    X.lo = cl - (X.hi - th);
    return X;
  }

  // DWDivFP1 (13 with inlined 1 from [1])
  static div21(X: Double, f: float): Double {
    let th = X.hi / f;
    let P = twoProd(th, f);
    let D = twoSum(X.hi, -P.hi);
    let tl = (D.hi + (D.lo + (X.lo - P.lo))) / f;
    X.hi = th + tl;
    X.lo = tl - (X.hi - th);
    return X;
  }

  /* Unar operators with double */

  static abs2(X: Double): Double {
    if (X.hi < 0.) {
      X.hi = -X.hi;
      X.lo = -X.lo;
    }
    return X;
  }

  static neg2(X: Double): Double {
    X.hi = -X.hi;
    X.lo = -X.lo;
    return X;
  }

  static inv2(X: Double): Double {
    var xh = X.hi;
    let s = 1. / xh;
    Double.mul21(X, s);
    let zl = (1. - X.hi - X.lo) / xh;
    X.hi = s + zl;
    X.lo = zl - (X.hi - s);
    return X;
  }

  static sqr2(X: Double): Double {
    let S = oneSqr(X.hi);
    let c = X.hi * X.lo;
    S.lo += c + c;
    X.hi = S.hi + S.lo;
    X.lo = S.lo - (X.hi - S.hi);
    return X;
  }

  static sqrt2(X: Double): Double {
    let s = Math.sqrt(X.hi);
    let T = oneSqr(s);
    let e = (X.hi - T.hi - T.lo + X.lo) * 0.5 / s;
    X.hi = s + e;
    X.lo = e - (X.hi - s);
    return X;
  }

  /* Comparisons */

  static eq22(X: Double, Y: Double): boolean { return (X.hi === Y.hi && X.lo === Y.lo); }
  static ne22(X: Double, Y: Double): boolean { return (X.hi !== Y.hi || X.lo !== Y.lo); }
  static gt22(X: Double, Y: Double): boolean { return (X.hi > Y.hi || (X.hi === Y.hi && X.lo > Y.lo)); }
  static lt22(X: Double, Y: Double): boolean { return (X.hi < Y.hi || (X.hi === Y.hi && X.lo < Y.lo)); }
  static ge22(X: Double, Y: Double): boolean { return (X.hi > Y.hi || (X.hi === Y.hi && X.lo >= Y.lo)); }
  static le22(X: Double, Y: Double): boolean { return (X.hi < Y.hi || (X.hi === Y.hi && X.lo <= Y.lo)); }
  static eq21(X: Double, f: float): boolean { return (X.hi === f && X.lo === 0.); }
  static ne21(X: Double, f: float): boolean { return (X.hi !== f || X.lo !== 0.); }
  static gt21(X: Double, f: float): boolean { return (X.hi > f || (X.hi === f && X.lo > 0.)); }
  static lt21(X: Double, f: float): boolean { return (X.hi < f || (X.hi === f && X.lo < 0.)); }
  static ge21(X: Double, f: float): boolean { return (X.hi > f || (X.hi === f && X.lo >= 0.)); }
  static le21(X: Double, f: float): boolean { return (X.hi < f || (X.hi === f && X.lo <= 0.)); }

  /* Double constants */

  static get One(): Double {  let d = new Double();     d.hi = 1.; d.lo = 0.; return d; }
  static get Zero(): Double { let d = new Double();     d.hi = 0.; d.lo = 0.; return d; }
  static get Infinity(): Double { let d = new Double(); d.hi = Infinity; d.lo = Infinity; return d; }
  static get MinusInfinity() { let d = new Double(); d.hi = -Infinity; d.lo = -Infinity; return d; }
  static get NaN(): Double { let d = new Double();      d.hi = NaN; d.lo = NaN; return d; }
  static get Pi(): Double { let d = new Double();       d.hi = 3.141592653589793; d.lo = 1.2246467991473532e-16; return d; }
  static get X2Pi(): Double { let d = new Double();     d.hi = 6.283185307179586; d.lo = 2.4492935982947064e-16; return d; }
  static get E(): Double { let d = new Double();        d.hi = 2.718281828459045; d.lo = 1.4456468917292502e-16; return d; }
  static get Log2(): Double { let d = new Double();     d.hi = 0.6931471805599453; d.lo = 2.319046813846299e-17; return d; }
  static get Phi(): Double { let d = new Double();      d.hi = 1.618033988749895; d.lo = -5.432115203682505e-17; return d; }

  /* Elementary functions with double */

  // [16/16] pade of exp(x)
  static exp2(X: Double): Double {
    if (Double.eq21(X, 0.)) return Double.One;
    if (Double.eq21(X, 1.)) return Double.E;
    let n = Math.floor(X.hi / Double.Log2.hi + 0.5);
    Double.sub22(X, Double.mul21(Double.Log2, n));
    let U = Double.One, V = Double.One;
    let padeCoef = [1, 272, 36720, 3255840, 211629600, 10666131840, 430200650880, 14135164243200,
      381649434566400, 8481098545920000, 154355993535744030, 2273242813890047700, 26521166162050560000,
      236650405753681870000, 1.5213240369879552e+21, 6.288139352883548e+21, 1.2576278705767096e+22 ];
    for (let i = 0, cLen = padeCoef.length; i < cLen; i++) Double.add21(Double.mul22(U, X), padeCoef[i]);
    for (let i = 0, cLen = padeCoef.length; i < cLen; i++) Double.add21(Double.mul22(V, X), padeCoef[i] * ((i % 2) ? -1 : 1));
    X = Double.mul21pow2(Double.div22(U, V), n);
    return X;
  }

  static ln2(X: Double): Double {
    if (Double.le21(X, 0)) return Double.MinusInfinity;
    if (Double.eq21(X, 1)) return Double.Zero;
    let Z = new Double(Math.log(X.hi));
    Double.sub21(Double.add22(Double.mul22(X, Double.exp2(Double.neg2(Double.clone(Z)))), Z), 1.);
    return X;
  }

  static sinh2(X: Double): Double {
    var exp = Double.exp2(X);
    X = Double.mul21pow2(Double.sub22(new Double(exp), Double.inv2(exp)), -1.);
    return X;
  }

  static cosh2(X: Double): Double {
    var exp = Double.exp2(X);
    X = Double.mul21pow2(Double.add22(new Double(exp), Double.inv2(exp)), -1.);
    return X;
  }

  static pow22(base: Double, exp: Double): Double {
    return Double.exp2(Double.mul22(Double.ln2(base), exp));
  }

  static mul21pow2(X: Double, n: int): Double {
    let c = 1. << Math.abs(n);
    if (n < 0) c = 1 / c;
    X.hi = X.hi * c;
    X.lo = X.lo * c;
    return X;
  }

  static pow2n(X: Double, n: int): Double {
    if (n === 0) return Double.One;
    if (n == 1) return X;
    let isPositive = n > 0;
    if (!isPositive) n = -n;
    let i = 31 - Math.clz32(n | 1)
    let j = Math.floor(n - (1 << i));
    let X0 = Double.clone(X);
    while (i--) Double.sqr2(X);
    while (j--) Double.mul22(X, X0);
    return isPositive ? X : Double.inv2(X);
  }

  /* Repeating static methods to instance */

  add(other: any): Double {
    if (other instanceof Double) return Double.add22(Double.clone(this), other);
    else if (typeof other == 'number') return Double.add21(Double.clone(this), other);
  }
  sub(other: any): Double {
    if (other instanceof Double) return Double.sub22(Double.clone(this), other);
    else if (typeof other == 'number') return Double.sub21(Double.clone(this), other);
  }
  mul(other: any): Double {
    if (other instanceof Double) return Double.mul22(Double.clone(this), other);
    else if (typeof other == 'number') return Double.mul21(Double.clone(this), other);
  }
  div(other: any): Double {
    if (other instanceof Double) return Double.div22(Double.clone(this), other);
    else if (typeof other == 'number') return Double.div21(Double.clone(this), other);
  }
  eq(other: any): boolean {
    if (other instanceof Double) return Double.eq22(this, other);
    else if (typeof other == 'number') return Double.eq21(this, other);
  }
  ne(other: any): boolean {
    if (other instanceof Double) return Double.ne22(this, other);
    else if (typeof other == 'number') return Double.ne21(this, other);
  }
  gt(other: any): boolean {
    if (other instanceof Double) return Double.gt22(this, other);
    else if (typeof other == 'number') return Double.gt21(this, other);
  }
  lt(other: any): boolean {
    if (other instanceof Double) return Double.lt22(this, other);
    else if (typeof other == 'number') return Double.lt21(this, other);
  }
  ge(other: any): boolean {
    if (other instanceof Double) return Double.ge22(this, other);
    else if (typeof other == 'number') return Double.ge21(this, other);
  }
  le(other: any): boolean {
    if (other instanceof Double) return Double.le22(this, other);
    else if (typeof other == 'number') return Double.le21(this, other);
  }
  abs(): Double { return Double.abs2(Double.clone(this)); }
  neg(): Double { return Double.neg2(Double.clone(this)); }
  inv(): Double { return Double.inv2(Double.clone(this)); }
  sqr(): Double { return Double.sqr2(Double.clone(this)); }
  sqrt(): Double { return Double.sqrt2(Double.clone(this)); }
  exp(): Double { return Double.exp2(Double.clone(this)); }
  ln(): Double { return Double.ln2(Double.clone(this)); }
  sinh(): Double { return Double.sinh2(Double.clone(this)); }
  cosh(): Double { return Double.cosh2(Double.clone(this)); }
  pow(exp: Double): Double { return Double.pow22(Double.clone(this), exp); }
  pown(exp: float): Double { return Double.pow2n(Double.clone(this), exp); }
}

export default Double;
export { Double };
