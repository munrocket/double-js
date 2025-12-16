"use strict";
(() => {
  // src/double.ts
  var splitter = 134217729;
  function twoSum(a, b) {
    let s = a + b;
    let b1 = s - a;
    return { hi: s, lo: b - b1 + (a - (s - b1)) };
  }
  function twoProd(a, b) {
    let t = splitter * a;
    let ah = t + (a - t), al = a - ah;
    t = splitter * b;
    let bh = t + (b - t), bl = b - bh;
    t = a * b;
    return { hi: t, lo: ah * bh - t + ah * bl + al * bh + al * bl };
  }
  function oneSqr(a) {
    let t = splitter * a;
    let ah = t + (a - t), al = a - ah;
    t = a * a;
    let hl = al * ah;
    return { hi: t, lo: ah * ah - t + hl + hl + al * al };
  }
  var MethodArgTypeError = new TypeError("Double method parameter must be a Double instance or a number");
  var Double = class _Double {
    hi;
    lo;
    constructor(obj) {
      if (obj instanceof _Double) {
        this.hi = obj.hi;
        this.lo = obj.lo;
        return this;
      }
      switch (typeof obj) {
        case "number":
          this.hi = obj;
          this.lo = 0;
          break;
        case "string": {
          const d = _Double.fromString(obj);
          this.hi = d.hi;
          this.lo = d.lo;
          break;
        }
        case "object":
          if (Array.isArray(obj)) {
            this.hi = +obj[0];
            this.lo = +obj[1];
          } else {
            this.hi = +obj.hi;
            this.lo = +obj.lo;
          }
          break;
        default:
          this.hi = NaN;
          this.lo = NaN;
      }
    }
    /* Static constructors */
    static clone(X) {
      let d = new _Double();
      d.hi = X.hi;
      d.lo = X.lo;
      return d;
    }
    static fromSum11(a, b) {
      return new _Double(twoSum(a, b));
    }
    static fromMul11(a, b) {
      return new _Double(twoProd(a, b));
    }
    static fromSqr1(a) {
      return new _Double(oneSqr(a));
    }
    static fromString(s) {
      s = s.trim();
      let first = s[0];
      let isPositive = first != "-";
      if (first == "+" || first == "-") s = s.slice(1);
      if (s.includes("Infinity")) return isPositive ? _Double.Infinity : _Double.neg2(_Double.Infinity);
      let rex = /^(\d*\.?\d+)(?:[eE]([-+]?\d+))?/.exec(s);
      if (!rex) return _Double.NaN;
      let digits = rex[1].replace(".", "");
      let exp = rex[2] !== void 0 ? parseInt(rex[2]) : 0;
      let dotId = rex[0].indexOf(".");
      if (dotId == -1) dotId = digits.length;
      if (exp + dotId - 1 < -300) return isPositive ? _Double.Zero : _Double.neg2(_Double.Zero);
      if (exp + dotId - 1 > 300) return isPositive ? _Double.Infinity : _Double.neg2(_Double.Infinity);
      let nextDigs, shift, result = _Double.Zero;
      for (let i = 0; i < digits.length; i += 15) {
        nextDigs = digits.slice(i, i + 15);
        shift = _Double.pow2n(new _Double(10), exp + dotId - i - nextDigs.length);
        _Double.add22(result, _Double.mul21(shift, parseInt(nextDigs)));
      }
      return isPositive ? result : _Double.neg2(result);
    }
    /* Convertations */
    toNumber() {
      return this.hi + this.lo;
    }
    toExponential(precision) {
      if (isNaN(this.hi)) return "NaN";
      if (!isFinite(this.hi) || this.toNumber() == 0) return this.hi.toExponential(precision);
      let remainder = _Double.clone(this);
      let str = remainder.hi.toExponential(precision).split("e");
      if (str[0].length > 16) str[0] = str[0].slice(0, 16);
      let result = str[0];
      let i = str[0].length - str[0].indexOf(".") - 1;
      if (str[0].indexOf(".") < 0) i--;
      _Double.sub22(remainder, new _Double(result + "e" + str[1]));
      if (remainder.hi < 0) _Double.mul21(remainder, -1);
      if (precision !== void 0 && precision > 33) precision = 33;
      while (true) {
        let nextPrecision = void 0;
        if (precision === void 0) {
          if (remainder.toNumber() <= 0) break;
        } else {
          if (i >= precision) break;
          if (remainder.toNumber() <= 0) {
            result += "0";
            i++;
            continue;
          }
          nextPrecision = precision - i;
          if (nextPrecision > 14) nextPrecision = 14;
        }
        let next = remainder.hi.toExponential(nextPrecision).split("e");
        let nextDigs = next[0].replace(/^0\.|\./, "");
        let nextLength = nextDigs.length;
        if (nextLength > 15) nextLength = 15;
        if (precision === void 0) {
          if (nextLength + i > 33) nextLength = 33 - i;
        } else {
          if (nextLength + i > precision) nextLength = precision - i;
        }
        nextDigs = nextDigs.slice(0, nextLength);
        result += nextDigs;
        i += nextLength;
        if (i >= 33) break;
        let sub = nextDigs[0] + "." + nextDigs.slice(1);
        _Double.sub22(remainder, new _Double(sub + "e" + next[1]));
      }
      return result + "e" + str[1];
    }
    /* Arithmetic operations with two double */
    // AccurateDWPlusDW (6 with inlined 1 from [1])
    static add22(X, Y) {
      let S = twoSum(X.hi, Y.hi);
      let E = twoSum(X.lo, Y.lo);
      let c = S.lo + E.hi;
      let vh = S.hi + c, vl = c - (vh - S.hi);
      c = vl + E.lo;
      X.hi = vh + c;
      X.lo = c - (X.hi - vh);
      return X;
    }
    // AccurateDWPlusDW with negated Y
    static sub22(X, Y) {
      let S = twoSum(X.hi, -Y.hi);
      let E = twoSum(X.lo, -Y.lo);
      let c = S.lo + E.hi;
      let vh = S.hi + c, vl = c - (vh - S.hi);
      c = vl + E.lo;
      X.hi = vh + c;
      X.lo = c - (X.hi - vh);
      return X;
    }
    // DWTimesDW1 (10 with inlined 1 from [1])
    static mul22(X, Y) {
      let S = twoProd(X.hi, Y.hi);
      S.lo += X.hi * Y.lo + X.lo * Y.hi;
      X.hi = S.hi + S.lo;
      X.lo = S.lo - (X.hi - S.hi);
      return X;
    }
    // Dekker division (div2 from [3])
    static div22(X, Y) {
      let s = X.hi / Y.hi;
      let T = twoProd(s, Y.hi);
      let e = (X.hi - T.hi - T.lo + X.lo - s * Y.lo) / Y.hi;
      X.hi = s + e;
      X.lo = e - (X.hi - s);
      return X;
    }
    /* Arithmetic operations with double and single */
    // DWPlusFP (4 with inlined 1 from [1])
    static add21(X, f) {
      let S = twoSum(X.hi, f);
      S.lo += X.lo;
      X.hi = S.hi + S.lo;
      X.lo = S.lo - (X.hi - S.hi);
      return X;
    }
    static sub21(X, f) {
      let S = twoSum(X.hi, -f);
      S.lo += X.lo;
      X.hi = S.hi + S.lo;
      X.lo = S.lo - (X.hi - S.hi);
      return X;
    }
    // DWTimesFP1 (7 with inlined 1 from [1])
    static mul21(X, f) {
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
    static div21(X, f) {
      let th = X.hi / f;
      let P = twoProd(th, f);
      let D = twoSum(X.hi, -P.hi);
      let tl = (D.hi + (D.lo + (X.lo - P.lo))) / f;
      X.hi = th + tl;
      X.lo = tl - (X.hi - th);
      return X;
    }
    /* Unar operators with double */
    static abs2(X) {
      if (X.hi < 0) {
        X.hi = -X.hi;
        X.lo = -X.lo;
      }
      return X;
    }
    static neg2(X) {
      X.hi = -X.hi;
      X.lo = -X.lo;
      return X;
    }
    static inv2(X) {
      var xh = X.hi;
      let s = 1 / xh;
      _Double.mul21(X, s);
      let zl = (1 - X.hi - X.lo) / xh;
      X.hi = s + zl;
      X.lo = zl - (X.hi - s);
      return X;
    }
    static sqr2(X) {
      let S = oneSqr(X.hi);
      let c = X.hi * X.lo;
      S.lo += c + c;
      X.hi = S.hi + S.lo;
      X.lo = S.lo - (X.hi - S.hi);
      return X;
    }
    static sqrt2(X) {
      let s = Math.sqrt(X.hi);
      let T = oneSqr(s);
      let e = (X.hi - T.hi - T.lo + X.lo) * 0.5 / s;
      X.hi = s + e;
      X.lo = e - (X.hi - s);
      return X;
    }
    /* Comparisons */
    static eq22(X, Y) {
      return X.hi === Y.hi && X.lo === Y.lo;
    }
    static ne22(X, Y) {
      return X.hi !== Y.hi || X.lo !== Y.lo;
    }
    static gt22(X, Y) {
      return X.hi > Y.hi || X.hi === Y.hi && X.lo > Y.lo;
    }
    static lt22(X, Y) {
      return X.hi < Y.hi || X.hi === Y.hi && X.lo < Y.lo;
    }
    static ge22(X, Y) {
      return X.hi > Y.hi || X.hi === Y.hi && X.lo >= Y.lo;
    }
    static le22(X, Y) {
      return X.hi < Y.hi || X.hi === Y.hi && X.lo <= Y.lo;
    }
    static eq21(X, f) {
      return X.hi === f && X.lo === 0;
    }
    static ne21(X, f) {
      return X.hi !== f || X.lo !== 0;
    }
    static gt21(X, f) {
      return X.hi > f || X.hi === f && X.lo > 0;
    }
    static lt21(X, f) {
      return X.hi < f || X.hi === f && X.lo < 0;
    }
    static ge21(X, f) {
      return X.hi > f || X.hi === f && X.lo >= 0;
    }
    static le21(X, f) {
      return X.hi < f || X.hi === f && X.lo <= 0;
    }
    /* Double constants */
    static get One() {
      let d = new _Double();
      d.hi = 1;
      d.lo = 0;
      return d;
    }
    static get Zero() {
      let d = new _Double();
      d.hi = 0;
      d.lo = 0;
      return d;
    }
    static get Infinity() {
      let d = new _Double();
      d.hi = Infinity;
      d.lo = Infinity;
      return d;
    }
    static get MinusInfinity() {
      let d = new _Double();
      d.hi = -Infinity;
      d.lo = -Infinity;
      return d;
    }
    static get NaN() {
      let d = new _Double();
      d.hi = NaN;
      d.lo = NaN;
      return d;
    }
    static get Pi() {
      let d = new _Double();
      d.hi = 3.141592653589793;
      d.lo = 12246467991473532e-32;
      return d;
    }
    static get X2Pi() {
      let d = new _Double();
      d.hi = 6.283185307179586;
      d.lo = 24492935982947064e-32;
      return d;
    }
    static get E() {
      let d = new _Double();
      d.hi = 2.718281828459045;
      d.lo = 14456468917292502e-32;
      return d;
    }
    static get Log2() {
      let d = new _Double();
      d.hi = 0.6931471805599453;
      d.lo = 2319046813846299e-32;
      return d;
    }
    static get Phi() {
      let d = new _Double();
      d.hi = 1.618033988749895;
      d.lo = -5432115203682505e-32;
      return d;
    }
    /* Elementary functions with double */
    // [16/16] pade of exp(x)
    static exp2(X) {
      if (_Double.eq21(X, 0)) return _Double.One;
      if (_Double.eq21(X, 1)) return _Double.E;
      let n = Math.floor(X.hi / _Double.Log2.hi + 0.5);
      _Double.sub22(X, _Double.mul21(_Double.Log2, n));
      let U = _Double.One, V = _Double.One;
      let padeCoef = [
        1,
        272,
        36720,
        3255840,
        211629600,
        10666131840,
        430200650880,
        14135164243200,
        381649434566400,
        848109854592e4,
        154355993535744030,
        2273242813890047700,
        2652116616205056e4,
        23665040575368187e4,
        15213240369879552e5,
        6288139352883548e6,
        12576278705767096e6
      ];
      for (let i = 0, cLen = padeCoef.length; i < cLen; i++) _Double.add21(_Double.mul22(U, X), padeCoef[i]);
      for (let i = 0, cLen = padeCoef.length; i < cLen; i++) _Double.add21(_Double.mul22(V, X), padeCoef[i] * (i % 2 ? -1 : 1));
      X = _Double.mul21pow2(_Double.div22(U, V), n);
      return X;
    }
    static ln2(X) {
      if (_Double.le21(X, 0)) return _Double.MinusInfinity;
      if (_Double.eq21(X, 1)) return _Double.Zero;
      let Z = new _Double(Math.log(X.hi));
      _Double.sub21(_Double.add22(_Double.mul22(X, _Double.exp2(_Double.neg2(_Double.clone(Z)))), Z), 1);
      return X;
    }
    static sinh2(X) {
      var exp = _Double.exp2(X);
      X = _Double.mul21pow2(_Double.sub22(new _Double(exp), _Double.inv2(exp)), -1);
      return X;
    }
    static cosh2(X) {
      var exp = _Double.exp2(X);
      X = _Double.mul21pow2(_Double.add22(new _Double(exp), _Double.inv2(exp)), -1);
      return X;
    }
    static pow22(base, exp) {
      return _Double.exp2(_Double.mul22(_Double.ln2(base), exp));
    }
    static mul21pow2(X, n) {
      let c = 1 << Math.abs(n);
      if (n < 0) c = 1 / c;
      X.hi = X.hi * c;
      X.lo = X.lo * c;
      return X;
    }
    static pow2n(X, n) {
      if (n === 0) return _Double.One;
      if (n == 1) return X;
      let isPositive = n > 0;
      if (!isPositive) n = -n;
      let i = 31 - Math.clz32(n | 1);
      let j = Math.floor(n - (1 << i));
      let X0 = _Double.clone(X);
      while (i--) _Double.sqr2(X);
      while (j--) _Double.mul22(X, X0);
      return isPositive ? X : _Double.inv2(X);
    }
    /* Repeating static methods to instance */
    add(other) {
      if (other instanceof _Double) return _Double.add22(_Double.clone(this), other);
      else if (typeof other == "number") return _Double.add21(_Double.clone(this), other);
      throw MethodArgTypeError;
    }
    sub(other) {
      if (other instanceof _Double) return _Double.sub22(_Double.clone(this), other);
      else if (typeof other == "number") return _Double.sub21(_Double.clone(this), other);
      throw MethodArgTypeError;
    }
    mul(other) {
      if (other instanceof _Double) return _Double.mul22(_Double.clone(this), other);
      else if (typeof other == "number") return _Double.mul21(_Double.clone(this), other);
      throw MethodArgTypeError;
    }
    div(other) {
      if (other instanceof _Double) return _Double.div22(_Double.clone(this), other);
      else if (typeof other == "number") return _Double.div21(_Double.clone(this), other);
      throw MethodArgTypeError;
    }
    eq(other) {
      if (other instanceof _Double) return _Double.eq22(this, other);
      else if (typeof other == "number") return _Double.eq21(this, other);
      throw MethodArgTypeError;
    }
    ne(other) {
      if (other instanceof _Double) return _Double.ne22(this, other);
      else if (typeof other == "number") return _Double.ne21(this, other);
      throw MethodArgTypeError;
    }
    gt(other) {
      if (other instanceof _Double) return _Double.gt22(this, other);
      else if (typeof other == "number") return _Double.gt21(this, other);
      throw MethodArgTypeError;
    }
    lt(other) {
      if (other instanceof _Double) return _Double.lt22(this, other);
      else if (typeof other == "number") return _Double.lt21(this, other);
      throw MethodArgTypeError;
    }
    ge(other) {
      if (other instanceof _Double) return _Double.ge22(this, other);
      else if (typeof other == "number") return _Double.ge21(this, other);
      throw MethodArgTypeError;
    }
    le(other) {
      if (other instanceof _Double) return _Double.le22(this, other);
      else if (typeof other == "number") return _Double.le21(this, other);
      throw MethodArgTypeError;
    }
    abs() {
      return _Double.abs2(_Double.clone(this));
    }
    neg() {
      return _Double.neg2(_Double.clone(this));
    }
    inv() {
      return _Double.inv2(_Double.clone(this));
    }
    sqr() {
      return _Double.sqr2(_Double.clone(this));
    }
    sqrt() {
      return _Double.sqrt2(_Double.clone(this));
    }
    exp() {
      return _Double.exp2(_Double.clone(this));
    }
    ln() {
      return _Double.ln2(_Double.clone(this));
    }
    sinh() {
      return _Double.sinh2(_Double.clone(this));
    }
    cosh() {
      return _Double.cosh2(_Double.clone(this));
    }
    pow(exp) {
      return _Double.pow22(_Double.clone(this), exp);
    }
    pown(exp) {
      return _Double.pow2n(_Double.clone(this), exp);
    }
  };
  var double_default = Double;
})();
