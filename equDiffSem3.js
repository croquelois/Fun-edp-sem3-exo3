var fs  = require('fs');
var sys = require('sys');
var Png = require('png').Png;
var Buffer = require('buffer').Buffer;
var max = Math.max;
var min = Math.min;
var ln = Math.log;
var sqrt = Math.sqrt;
var abs = Math.abs;
var cos = Math.cos;
var sin = Math.sin;

var SIZE = 600;
var rgb = new Buffer(SIZE*SIZE*3);

function drawLine (x1,y1,x2,y2,set) {
  var dx = Math.abs(x2 - x1);
  var dy = Math.abs(y2 - y1);
  var sx = (x1 < x2) ? 1 : -1;
  var sy = (y1 < y2) ? 1 : -1;
  var err = dx - dy;
  set(x1, y1);
  while (!((x1 == x2) && (y1 == y2))) {
    var e2 = err << 1;
    if(e2 > -dy){
      err -= dy;
      x1 += sx;
    }
    if(e2 < dx){
      err += dx;
      y1 += sy;
    }
    set(x1, y1);
  }
}

function drawArrow(x,y,a,r,set){
  var sx = x;
  var sy = y;
  var ex = sx + r*Math.cos(a);
  var ey = sy + r*Math.sin(a);
  var ra = a + Math.PI/8;
  var rx = ex - r/4*Math.cos(ra);
  var ry = ey - r/4*Math.sin(ra);
  var la = a - Math.PI/8;
  var lx = ex - r/4*Math.cos(la);
  var ly = ey - r/4*Math.sin(la);
  sx = Math.round(sx);
  sy = Math.round(sy);
  ex = Math.round(ex);
  ey = Math.round(ey);
  rx = Math.round(rx);
  ry = Math.round(ry);
  lx = Math.round(lx);
  ly = Math.round(ly);
  drawLine(sx,sy,ex,ey,set);
  drawLine(ex,ey,rx,ry,set);
  drawLine(ex,ey,lx,ly,set);
}

function drawRect(ox0,ox1,oy0,oy1,set){
  if(ox0 > ox1) throw Error("ox0 need to be less than ox1");
  if(oy0 > oy1) throw Error("oy0 need to be less than oy1");
  for (var ox=ox0; ox<=ox1; ox++)
    for (var oy=oy0; oy<=oy1; oy++)
      set(ox,oy);
}


function callFctOnRect(ix0,ix1,iy0,iy1,ox0,ox1,oy0,oy1,f,set){
  if(ox0 > ox1) throw Error("ox0 need to be less than ox1");
  if(oy0 > oy1) throw Error("oy0 need to be less than oy1");
  for (var ox=ox0; ox<=ox1; ox++) {
    for (var oy=oy0; oy<=oy1; oy++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      set(ox,oy,v[0],v[1]);
    }
  }
}

function drawZeroCrossing(ix0,ix1,iy0,iy1,ox0,ox1,oy0,oy1,f,set){
  var oldv;
  if(ox0 > ox1) throw Error("ox0 need to be less than ox1");
  if(oy0 > oy1) throw Error("oy0 need to be less than oy1");
  for (var ox=ox0; ox<=ox1; ox++) {
    for (var oy=oy0; oy<=oy1; oy++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      if(oy > oy0 && oldv*v <= 0) set(ox,oy);
      oldv = v;
    }
  }
  for (var oy=oy0; oy<=oy1; oy++) {
    for (var ox=ox0; ox<=ox1; ox++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      if(oy > oy0 && oldv*v <= 0) set(ox,oy);
      oldv = v;
    }
  }
}

function drawContour(ix0,ix1,iy0,iy1,ox0,ox1,oy0,oy1,lvl,f,set){
  var oldv;
  if(ox0 > ox1) throw Error("ox0 need to be less than ox1");
  if(oy0 > oy1) throw Error("oy0 need to be less than oy1");
  for (var ox=ox0; ox<=ox1; ox++) {
    for (var oy=oy0; oy<=oy1; oy++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      if((oy > oy0) && (Math.floor(oldv/lvl) != Math.floor(v/lvl))) set(ox,oy);
      oldv = v;
    }
  }
  for (var oy=oy0; oy<=oy1; oy++) {
    for (var ox=ox0; ox<=ox1; ox++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      if((oy > oy0) && (Math.floor(oldv/lvl) != Math.floor(v/lvl))) set(ox,oy);
      oldv = v;
    }
  }
}

function drawVectorField(ix0,ix1,iy0,iy1,ox0,ox1,oy0,oy1,hArray,f,set){
  var nbx = Math.floor((ox1-ox0)/hArray);
  var nby = Math.floor((oy1-oy0)/hArray);
  var restx = (ox1-ox0) - nbx*hArray;
  var resty = (oy1-oy0) - nby*hArray;
  for (var i=0; i<nbx; i++) {
    for (var j=0; j<nby; j++) {
      var px = restx/2 + i*hArray;
      var py = resty/2 + j*hArray;
      var ax = (px-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (py-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      var r = norm(v);
      if(r < 10e-12) continue;
      var dx = v[0]/r;
      var dy = v[1]/r;
      var a = (dy>0?-1:1)*Math.acos(dx);
      drawArrow(Math.round(px),Math.round(py),a,hArray/2,setBlack);
    }
  }
}

function norm(v){
  var x = v[0], y = v[1];
  return sqrt(x*x+y*y);
}
function compose(f,g){ return function(x){ return f(g(x)); }; }
function normFct(f){ return function(x){ return norm(f(x)); } }
function logNormFct(f){ return function(x){ return ln(norm(f(x))); } }

function setColorFct(r,g,b){ return function(x,y){ rgb[y*SIZE*3 + x*3 + 0] = r; rgb[y*SIZE*3 + x*3 + 1] = g; rgb[y*SIZE*3 + x*3 + 2] = b; }};
function setWhite(x,y){ rgb[y*SIZE*3 + x*3 + 0] = rgb[y*SIZE*3 + x*3 + 1] = rgb[y*SIZE*3 + x*3 + 2] = 255; }
function setBlack(x,y){ rgb[y*SIZE*3 + x*3 + 0] = rgb[y*SIZE*3 + x*3 + 1] = rgb[y*SIZE*3 + x*3 + 2] = 0; }
var setRed = setColorFct(255,192,192);
var setYellow = setColorFct(255,255,192);
var setGreen = setColorFct(192,255,192);
var setBlue = setColorFct(192,192,255);
function writeBuffer(name){
  var png = new Png(rgb, SIZE, SIZE, 'rgb');
  fs.writeFileSync('./'+name+'.png', png.encodeSync().toString('binary'), 'binary');
}

function f(v,t){
  var x = v[0];
  var y = v[1];
  var fx = 0.5*sin(x+y)+t-1;
  var fy = 0.5*cos(x-y)-t+0.5;
  return [fx,fy];
}

function fMove(v,t){
  var v2 = f(v,t);
  return [v2[0]-v[0],v2[1]-v[1]];
}

var fFactory = function(t){ return function(v){ return fMove(v,t); }; };


function setAngle(x,y,dx,dy){ 
  if(dx > 0 && dy > 0) setRed(x,y);
  else if(dx < 0 && dy > 0) setYellow(x,y);
  else if(dx > 0 && dy < 0) setGreen(x,y);
  else if(dx < 0 && dy < 0) setBlue(x,y);
}

for(var i=0;i<200;i++){
  var V = fFactory(i*0.1-10);
  var contourLvl = 0.25;
  var h = 10;
  drawRect(0,SIZE,0,SIZE,setWhite);
  drawZeroCrossing(-h,h,h,-h,0,SIZE,0,SIZE,function(x){ return V(x)[0]; },setBlack);
  drawZeroCrossing(-h,h,h,-h,0,SIZE,0,SIZE,function(x){ return V(x)[1]; },setBlack);
  callFctOnRect(-h,h,h,-h,0,SIZE,0,SIZE,V,setAngle);
  drawVectorField(-h,h,h,-h,0,SIZE,0,SIZE,25,V,setBlack);
  drawContour(-h,h,h,-h,0,SIZE,0,SIZE,contourLvl,logNormFct(V),setBlack);
  writeBuffer("exo3-2-"+ ("000"+i).slice(-3));

}


