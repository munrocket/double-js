import Double from "../../dist/double.js";
import * as DD from "https://esm.sh/double-double";
import Decimal from "https://esm.sh/decimal.js";
import BigNumber from "https://esm.sh/bignumber.js";
import Big from "https://esm.sh/big.js";
import { BigFloat32 } from "https://esm.sh/bigfloat";

/* initialization */

let wasm;
window.onload = function() {

  // set params
  let maxIter = 1000;
  let target = { x: -1.7490863748149415, y: -1e-25, dx: 3e-15, dy: 2e-15};

  // load wasm
  let imports = { env: { abort() { console.error("abort called");}}};
  fetch('../bench/bench.wasm').then(response =>
    response.arrayBuffer()
  ).then(bytes => WebAssembly.instantiate(bytes, imports)).then(results => {
    wasm = results.instance.exports;
    let el = [2.718281828459045, 1.4456468917292502e-16, 0.6931471805599453, 2.319046813846299e-17];
    console.log('wasm loaded, test=' + wasm.test(...el));
  }).catch(() => {
    wasm = { mandelbrot: () => 1 };
    console.log('wasm not supported or some error!');
  }).finally(() => {

    document.getElementById('title').innerHTML = 'Drawing split test...';
    // draw split test
    setTimeout(() => {
      drawSplitTest(withDoubleJs, withNumber, maxIter, target);
      document.getElementById('title').innerHTML = 'Benchmarking...';

      setTimeout(() => {

        // set equal precision and params
        Big.DP = 31;
        Decimal.set({ precision: 31 });
        BigNumber.set({ DECIMAL_PLACES: 31 });

        // benchmark
        let popups = document.getElementsByClassName('bench-popup');
        popups[0].style.display = 'block';
        let now = () => (typeof performance != 'undefined') ? performance.now() : Date.now();
        let calculators = [
          withDoubleJs,
          //withDoubleJs_Ver01,
          withDoubleJs_Wasm,
          withDoubleDouble,
          withBigNumberJs,
          withDecimalJs,
          withBigJs,
          withBigFloat32,
          //withFractionJs //completely broken thing
          //withBigFloat53 //broken for some reason
        ];
        calculators.forEach(calculator => {
          let start = now();
          let end = start;
          let counter = 0;
          while (end < start + 1000) {
            counter++;
            draw(calculator, maxIter, target);
            end = now();
          };
          calculator.benchmark = (end - start) / counter;
        });

        // draw charts
        drawCharts(calculators);
        document.getElementById('title').innerHTML = 'Split test and benchmark';
      }, 10);
    }, 10);
  });
}

/* different calculators */

function withNumber(maxIter, target, buffer, pixel) {
  let iter = 0;
  let x = 0, y = 0;
  let xx = 0, xy = 0, yy = 0;
  let cx = target.x - target.dx + 2 * target.dx * pixel.i / buffer.width;
  let cy = target.y + target.dy - 2 * target.dy * pixel.j / buffer.height;
  while (iter++ < maxIter && xx + yy < 4) {
    x = xx - yy + cx;
    y = xy + xy + cy;
    xx = x * x;
    yy = y * y;
    xy = x * y;
  }
  colorizer(maxIter, iter - 1, buffer, pixel)
}

function withDoubleJs(maxIter, target, buffer, pixel) {
  const D = Double;
  let iter = 0;
  let x = D.Zero, y = D.Zero;
  let xx = D.Zero, xy = D.Zero, yy = D.Zero;
  let tx = new D(target.x), ty = new D(target.y);
  let tdx = new D(target.dx), tdy = new D(target.dy);
  let cx = tx.sub(tdx).add(tdx.mul(new D(2 * pixel.i)).div(new D(buffer.width)));
  let cy = ty.add(tdy).sub(tdy.mul(new D(2 * pixel.j)).div(new D(buffer.height)));
  while (iter++ < maxIter && xx.add(yy).lt(4)) {
    x = xx.sub(yy).add(cx);
    y = xy.add(xy).add(cy);
    xx = x.sqr();
    yy = y.sqr();
    xy = x.mul(y);
  }
  colorizer(maxIter, iter - 1, buffer, pixel);
}

function withDoubleDouble(maxIter, target, buffer, pixel) {
  const { ddAddDd, ddDiffDd, ddMultDd, ddDivDd, ddSqrt, ddLt } = DD;
  let iter = 0;
  let x = [0, 0], y = [0, 0];
  let xx = [0, 0], xy = [0, 0], yy = [0, 0];
  let tx = [0, target.x], ty = [0, target.y];
  let tdx = [0, target.dx], tdy = [0, target.dy];
  // let cx = tx.sub(tdx).add( tdx.mul(new D(2 * pixel.i)).div(new D(buffer.width)) );
  let cx = ddAddDd(ddDiffDd(tx, tdx), ddDivDd(ddMultDd(tdx, [0, 2 * pixel.i]), [0, buffer.width]));
  // let cy = ty.add(tdy).sub( tdy.mul(new D(2 * pixel.j)).div(new D(buffer.height)) );
  let cy = ddDiffDd(ddAddDd(ty, tdy), ddDivDd(ddMultDd(tdy, [0, 2 * pixel.j]), [0, buffer.height]));
  // while (iter++ < maxIter && xx.add(yy).lt(4)) {
  while (iter++ < maxIter && ddLt(ddAddDd(xx, yy), [0, 4])) {
    x = ddAddDd(ddDiffDd(xx, yy), cx);  // xx.sub(yy).add(cx);
    y = ddAddDd(ddAddDd(xy, xy), cy);   // xy.add(xy).add(cy);
    xx = ddMultDd(x, x);                // x.sqr();
    yy = ddMultDd(y, y);                // y.sqr();
    xy = ddMultDd(x, y);                // x.mul(y);
  }
  colorizer(maxIter, iter - 1, buffer, pixel);
}

function withDoubleJs_Ver01(maxIter, target, buffer, pixel) {
  let D = D01;
  let iter = 0;
  let x = D.Zero, y = D.Zero;
  let xx = D.Zero, xy = D.Zero, yy = D.Zero;
  let tx = new D(target.x), ty = new D(target.y);
  let tdx = new D(target.dx), tdy = new D(target.dy);
  let cx = tx.sub(tdx).add(tdx.mul(2 * pixel.i).div(buffer.width));
  let cy = ty.add(tdy).sub(tdy.mul(2 * pixel.j).div(buffer.height));
  while (iter++ < maxIter && xx.add(yy).lt(4)) {
    x = xx.sub(yy).add(cx);
    y = xy.add(xy).add(cy);
    xx = x.sqr();
    yy = y.sqr();
    xy = x.mul(y);
  }
  colorizer(maxIter, iter - 1, buffer, pixel);
}

function withDoubleJs_Wasm(maxIter, target, buffer, pixel) {
  let iter = wasm.mandelbrot(
    maxIter,
    buffer.width,
    buffer.height,
    target.x,
    target.y,
    target.dx,
    target.dy,
    pixel.i,
    pixel.j);
  colorizer(maxIter, iter - 1, buffer, pixel);
}

function withDecimalJs(maxIter, target, buffer, pixel) {
  let iter = 0;
  let x = new Decimal(0), y = new Decimal(0);
  let xx = new Decimal(0), xy = new Decimal(0), yy = new Decimal(0);
  let tx = new Decimal(target.x), ty = new Decimal(target.y);
  let tdx = new Decimal(target.dx), tdy = new Decimal(target.dy);
  let cx = tx.sub(tdx).add(tdx.mul(2 * pixel.i).div(buffer.width));
  let cy = ty.add(tdy).sub(tdy.mul(2 * pixel.j).div(buffer.height));
  while (iter++ < maxIter && xx.add(yy).lt(4)) {
    x = xx.sub(yy).add(cx);
    y = xy.add(xy).add(cy);
    xx = x.mul(x);
    yy = y.mul(y);
    xy = x.mul(y);
  }
  colorizer(maxIter, iter - 1, buffer, pixel);
}

function withBigNumberJs(maxIter, target, buffer, pixel) {
  let BN = BigNumber;
  let iter = 0;
  let x = new BN(0), y = new BN(0);
  let xx = new BN(0), xy = new BN(0), yy = new BN(0);
  let tx = new BN(target.x), ty = new BN(target.y);
  let tdx = new BN(target.dx), tdy = new BN(target.dy);
  let cx = tx.minus(tdx).plus(tdx.times(2 * pixel.i).div(buffer.width)).dp(31);
  let cy = ty.plus(tdy).minus(tdy.times(2 * pixel.j).div(buffer.height)).dp(31);
  while (iter++ < maxIter && xx.plus(yy).lt(4)) {
    x = xx.minus(yy).plus(cx);
    y = xy.plus(xy).plus(cy);
    xx = x.times(x).dp(31);
    yy = y.times(y).dp(31);
    xy = x.times(y).dp(31);
  }
  colorizer(maxIter, iter - 1, buffer, pixel);
}

function withBigJs(maxIter, target, buffer, pixel) {
  let iter = 0;
  let x = new Big(0), y = new Big(0);
  let xx = new Big(0), xy = new Big(0), yy = new Big(0);
  let tx = new Big(target.x), ty = new Big(target.y);
  let tdx = new Big(target.dx), tdy = new Big(target.dy);
  let cx = tx.sub(tdx).add(tdx.mul(2 * pixel.i).div(buffer.width)).round(31);
  let cy = ty.add(tdy).sub(tdy.mul(2 * pixel.j).div(buffer.height)).round(31);
  while (iter++ < maxIter && xx.add(yy).lt(4)) {
    x = xx.sub(yy).add(cx);
    y = xy.add(xy).add(cy);
    xx = x.mul(x).round(31);
    yy = y.mul(y).round(31);
    xy = x.mul(y).round(31);
  }
  colorizer(maxIter, iter - 1, buffer, pixel);
}

function withBigFloat32(maxIter, target, buffer, pixel) {
  let BF = BigFloat32;
  let iter = 0;
  let x = new BF(0), y = new BF(0);
  let xx = new BF(0), xy = new BF(0), yy = new BF(0);
  let tx = new BF(target.x), ty = new BF(target.y);
  let tdx = new BF(target.dx), tdy = new BF(target.dy);
  let cx = tx.sub(tdx).add(tdx.mul(2 * pixel.i).mul(1/buffer.width)).round(31);
  let cy = ty.add(tdy).sub(tdy.mul(2 * pixel.j).mul(1/buffer.height)).round(31);
  while (iter++ < maxIter && xx.add(yy).cmp(4) < 0) {
    x = xx.sub(yy).add(cx);
    y = xy.add(xy).add(cy);
    xx = x.mul(x).round(31);
    yy = y.mul(y).round(31);
    xy = x.mul(y).round(31);
  }
  colorizer(maxIter, iter - 1, buffer, pixel);
}

function withFractionJs(maxIter, target, buffer, pixel) {
  let iter = 0;
  let x = new Fraction(0), y = new Fraction(0);
  let xx = new Fraction(0), xy = new Fraction(0), yy = new Fraction(0);
  let tx = new Fraction(target.x), ty = new Fraction(target.y);
  let tdx = new Fraction(target.dx), tdy = new Fraction(target.dy);
  let cx = tx.sub(tdx).add(tdx.mul(2 * pixel.i).div(buffer.width));
  let cy = ty.add(tdy).sub(tdy.mul(2 * pixel.j).div(buffer.height));
  while (iter++ < maxIter && xx.add(yy).compare(4) < 0) {
    x = xx.sub(yy).add(cx);
    y = xy.add(xy).add(cy);
    xx = x.mul(x);
    yy = y.mul(y);
    xy = x.mul(y);
  }
  colorizer(maxIter, iter - 1, buffer, pixel);
}

/* mandelbrot drawing */

function colorizer(maxIter, iter, buffer, pixel) {
  const color = (iter == maxIter) ? 0 : 256 * (maxIter - (iter * 25) % maxIter) / maxIter;
  buffer.data[pixel.id++] = color;
  buffer.data[pixel.id++] = color;
  buffer.data[pixel.id++] = color;
  buffer.data[pixel.id++] = 255;
}

function mandelbrot(calculator, maxIter, target, buffer, pixel) {
  for (pixel.j = 0; pixel.j < buffer.height; pixel.j++) {
    for (pixel.i = 0; pixel.i < buffer.width; pixel.i++) {
      calculator(maxIter, target, buffer, pixel);
    }
  }
}

function mandelbrotSplitTest(calculator1, calculator2, maxIter, target, buffer, pixel) {
  for (pixel.j = 0; pixel.j < buffer.height; pixel.j++) {
    for (pixel.i = 0; pixel.i < buffer.width; pixel.i++) {
      if (pixel.i / buffer.width > pixel.j / buffer.height) {
        calculator1(maxIter, target, buffer, pixel);
      } else {
        calculator2(maxIter, target, buffer, pixel);
      }
    }
  }
}

function draw(calculator, maxIter, target) {
  let canvas = document.getElementById(calculator.name);
  let buffer = canvas.getContext('2d').createImageData(canvas.width, canvas.height);
  let pixel = { i: 0, j: 0, id: 0 };
  mandelbrot(calculator, maxIter, target, buffer, pixel);
  canvas.getContext('2d').putImageData(buffer, 0, 0);
}

function drawSplitTest(calc1, calc2, maxIter, target) {
  let canvas = document.getElementById("split-test");
  let ctx = canvas.getContext('2d');
  let pixel = { i: 0, j: 0, id: 0 };
  let buffer = ctx.createImageData(canvas.width, canvas.height);
  mandelbrotSplitTest(calc1, calc2, maxIter, target, buffer, pixel);
  ctx.putImageData(buffer, 0, 0);
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(buffer.width, buffer.height);
  ctx.stroke();
  ctx.font = 'bold 12px Open Sans';
  ctx.fillStyle = '#FFF';
  ctx.fillText(calc1.name.slice(4), canvas.width - 56, 15);
  ctx.fillText(calc2.name.slice(4), 6, canvas.height - 8);
}

/* chart drawing */

function drawCharts(calculators) {
  google.charts.load('current', {'packages':['bar']});
  google.charts.setOnLoadCallback(drawChart);
  function drawChart() {
    let array = [['', 'ms']];
    calculators.forEach(calc => array.push([ calc.name.slice(4), calc.benchmark]));
    let data = google.visualization.arrayToDataTable(array);
    let options = { bars: 'horizontal' };
    let chart = new google.charts.Bar(document.getElementById('bar-chart'));
    chart.draw(data, google.charts.Bar.convertOptions(options));
  };

  document.getElementById('title').innerHTML = 'Split test and benchmark';
}
