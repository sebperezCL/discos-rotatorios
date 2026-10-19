// Distribución: corta el dibujo en piezas y busca para cada pieza un ángulo de giro
// del disco en el que su ranura no choque con las demás.
//
// Convenciones (mm, y hacia arriba, origen = centro del disco):
//  - "papel": coordenadas fijas del dibujo bajo el disco.
//  - "disco": coordenadas del propio disco. Si el disco está girado θ (antihorario),
//    un punto del disco q aparece en el papel en R(θ)·q, así que la ranura de una pieza
//    asignada a θ es R(-θ)·pieza.
//  - La muesca de la posición con giro θ está en el ángulo 90°-θ del disco
//    (queda arriba, frente a la marca del soporte, cuando el disco está girado θ).
(function (root) {
  'use strict';
  var D2R = Math.PI / 180;

  function plen(p) { var s = 0; for (var i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }
  function rot(p, a) { var c = Math.cos(a), s = Math.sin(a); return [c * p[0] - s * p[1], s * p[0] + c * p[1]]; }

  // Re-muestrea una polilínea cada `step` mm (conserva extremos)
  function resample(p, step) {
    if (p.length < 2) return p.map(function (a) { return a.slice(); });
    var out = [p[0].slice()], acc = 0;
    for (var i = 1; i < p.length; i++) {
      var a = p[i - 1], b = p[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      var t = step - acc;
      while (t <= L) { out.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]); t += step; }
      acc = L - (t - step);
    }
    var last = p[p.length - 1], o = out[out.length - 1];
    if (Math.hypot(last[0] - o[0], last[1] - o[1]) > 1e-6) out.push(last.slice());
    return out;
  }

  // Corta la polilínea en la longitud de arco `at`
  function splitAt(p, at) {
    var acc = 0;
    for (var i = 1; i < p.length; i++) {
      var a = p[i - 1], b = p[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + L >= at) {
        var t = L > 0 ? (at - acc) / L : 0, m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        return [p.slice(0, i).concat([m]), [m].concat(p.slice(i))];
      }
      acc += L;
    }
    return [p, [p[p.length - 1]]];
  }
  function splitN(p, n) {
    var L = plen(p), out = [], rest = p;
    for (var k = 1; k < n; k++) {
      var parts = splitAt(rest, L / n);
      out.push(parts[0]); rest = parts[1];
    }
    out.push(rest);
    return out;
  }

  // ¿La pieza se toca a sí misma? (formaría una isla o una lengüeta frágil)
  // Devuelve la longitud de arco donde conviene cortarla, o -1.
  function selfContact(p, minDist) {
    var s = resample(p, 0.3), arc = [0];
    for (var i = 1; i < s.length; i++) arc.push(arc[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
    var sep = Math.max(2.2 * minDist, minDist + 1);
    var best = -1, bestD = Infinity;
    for (i = 0; i < s.length; i++) for (var j = i + 1; j < s.length; j++) {
      if (arc[j] - arc[i] < sep) continue;
      var d = Math.hypot(s[j][0] - s[i][0], s[j][1] - s[i][1]);
      if (d < minDist && d < bestD) { bestD = d; best = (arc[i] + arc[j]) / 2; }
    }
    return best;
  }

  // Rejilla espacial de puntos de ranuras ya colocadas
  function Grid(cell) { this.cell = cell; this.map = new Map(); }
  Grid.prototype.key = function (x, y) { return Math.floor(x / this.cell) * 73856093 ^ Math.floor(y / this.cell) * 19349663; };
  Grid.prototype.add = function (x, y, id) {
    var k = this.key(x, y), a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    a.push(x, y, id);
  };
  Grid.prototype.near = function (x, y, r) {
    // ¿hay algún punto a distancia < r?
    var c = this.cell, n = Math.ceil(r / c), cx = Math.floor(x / c), cy = Math.floor(y / c), r2 = r * r;
    for (var i = -n; i <= n; i++) for (var j = -n; j <= n; j++) {
      var a = this.map.get((cx + i) * 73856093 ^ (cy + j) * 19349663);
      if (!a) continue;
      for (var k = 0; k < a.length; k += 3) {
        var dx = a[k] - x, dy = a[k + 1] - y;
        if (dx * dx + dy * dy < r2) return true;
      }
    }
    return false;
  };

  // Une cadenas que se encuentran en un mismo nodo siguiendo la dirección más recta,
  // para evitar trocitos sueltos en los cruces.
  function mergeChains(polys, tol, tinyLen) {
    var chains = polys.filter(function (p) { return p.length >= 2; }).map(function (p) { return p.slice(); });
    var dots = polys.filter(function (p) { return p.length < 2; });
    function key(q) { return Math.round(q[0] / tol) + ',' + Math.round(q[1] / tol); }
    function dir(p, atStart) {
      // dirección saliendo del nodo, medida ~2 mm hacia dentro de la cadena
      var a = atStart ? p[0] : p[p.length - 1], acc = 0, i = atStart ? 1 : p.length - 2, b = a;
      while (i >= 0 && i < p.length) { b = p[i]; acc = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc > 2) break; i += atStart ? 1 : -1; }
      var l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    }
    var changed = true;
    while (changed) {
      changed = false;
      var ends = {};
      chains.forEach(function (c, i) {
        if (Math.hypot(c[0][0] - c[c.length - 1][0], c[0][1] - c[c.length - 1][1]) < tol) return; // lazo cerrado
        (ends[key(c[0])] = ends[key(c[0])] || []).push({ i: i, start: true });
        (ends[key(c[c.length - 1])] = ends[key(c[c.length - 1])] || []).push({ i: i, start: false });
      });
      var best = null;
      Object.keys(ends).forEach(function (k) {
        var e = ends[k];
        if (e.length < 2) return;
        for (var a = 0; a < e.length; a++) for (var b = a + 1; b < e.length; b++) {
          if (e[a].i === e[b].i) continue;
          var da = dir(chains[e[a].i], e[a].start), db = dir(chains[e[b].i], e[b].start);
          var straight = -(da[0] * db[0] + da[1] * db[1]);    // 1 = continúan en línea recta
          // los trocitos muy cortos se pegan al vecino aunque formen esquina
          var tiny = plen(chains[e[a].i]) < tinyLen || plen(chains[e[b].i]) < tinyLen;
          var sc = tiny ? straight + 2 : straight;
          if ((straight > 0.35 || tiny) && (!best || sc > best.s)) best = { s: sc, a: e[a], b: e[b] };
        }
      });
      if (best) {
        var A = chains[best.a.i], B = chains[best.b.i];
        if (best.a.start) A = A.slice().reverse();
        if (!best.b.start) B = B.slice().reverse();
        var merged = A.concat(B.slice(1));
        chains = chains.filter(function (_, k) { return k !== best.a.i && k !== best.b.i; });
        chains.push(merged);
        changed = true;
      }
    }
    return chains.concat(dots);
  }

  // Rejilla raster de ocupación (para números)
  function Occ(R, cell) { this.cell = cell; this.n = Math.ceil(2 * R / cell) + 2; this.R = R; this.a = new Uint8Array(this.n * this.n); }
  Occ.prototype.idx = function (x, y) {
    var i = Math.floor((x + this.R) / this.cell), j = Math.floor((y + this.R) / this.cell);
    return (i < 0 || j < 0 || i >= this.n || j >= this.n) ? -1 : j * this.n + i;
  };
  Occ.prototype.get = function (x, y) { var k = this.idx(x, y); return k >= 0 && this.a[k] === 1; };
  Occ.prototype.markDisk = function (x, y, r) {
    var c = this.cell;
    for (var yy = y - r - c; yy <= y + r + c; yy += c) for (var xx = x - r - c; xx <= x + r + c; xx += c) {
      if ((xx - x) * (xx - x) + (yy - y) * (yy - y) > (r + c) * (r + c)) continue;
      var k = this.idx(xx, yy); if (k >= 0) this.a[k] = 1;
    }
  };
  Occ.prototype.boxPoints = function (cx, cy, ang, bw, bh) {
    var c = Math.cos(ang), s = Math.sin(ang), st = this.cell * 0.7, out = [];
    for (var v = -bh / 2; v <= bh / 2 + 1e-9; v += st) for (var u = -bw / 2; u <= bw / 2 + 1e-9; u += st) out.push([cx + c * u - s * v, cy + s * u + c * v]);
    return out;
  };
  Occ.prototype.boxFree = function (cx, cy, ang, bw, bh, rLimit, extraOk) {
    var P = this.boxPoints(cx, cy, ang, bw, bh);
    for (var i = 0; i < P.length; i++) {
      var x = P[i][0], y = P[i][1];
      if (x * x + y * y > rLimit * rLimit) return false;
      if (this.get(x, y)) return false;
      if (extraOk && !extraOk(x, y)) return false;
    }
    return true;
  };
  Occ.prototype.markBox = function (cx, cy, ang, bw, bh) {
    var self = this;
    this.boxPoints(cx, cy, ang, bw, bh).forEach(function (q) { var k = self.idx(q[0], q[1]); if (k >= 0) self.a[k] = 1; });
  };

  /**
   * Coloca el dibujo (polilíneas en px de imagen) en el papel.
   * p: { sizeMm, rMax, dirDeg, offsetMm (null=auto) }
   */
  function placeDrawing(polylines, p) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    polylines.forEach(function (pl) { pl.forEach(function (q) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); }); });
    var w = maxX - minX, h = maxY - minY, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    if (p.autoSize) {
      // el mayor tamaño que deja el dibujo dentro del anillo [rMin, rMax]
      var lo = 5, hi = 2 * p.rMax;
      for (var it0 = 0; it0 < 30; it0++) {
        var mid0 = (lo + hi) / 2, t = placeDrawing(polylines, Object.assign({}, p, { autoSize: false, sizeMm: mid0, offsetMm: null }));
        if (!t.warn && t.rMinActual >= p.rMin) lo = mid0; else hi = mid0;
      }
      return placeDrawing(polylines, Object.assign({}, p, { autoSize: false, sizeMm: Math.floor(lo * 2) / 2, offsetMm: null }));
    }
    var size = p.sizeMm, s = size / Math.max(w, h, 1e-9);
    // centrado en el origen, y hacia arriba
    var base = polylines.map(function (pl) { return pl.map(function (q) { return [(q[0] - cx) * s, -(q[1] - cy) * s]; }); });
    var u = [Math.cos(p.dirDeg * D2R), Math.sin(p.dirDeg * D2R)];
    function maxR(d) {
      var m = 0;
      base.forEach(function (pl) { pl.forEach(function (q) { m = Math.max(m, Math.hypot(q[0] + u[0] * d, q[1] + u[1] * d)); }); });
      return m;
    }
    var scaleFix = 1, warn = null;
    var r0 = maxR(0) + p.slotW / 2;
    if (r0 > p.rMax) {
      scaleFix = (p.rMax - p.slotW / 2) / maxR(0);
      base = base.map(function (pl) { return pl.map(function (q) { return [q[0] * scaleFix, q[1] * scaleFix]; }); });
      warn = 'El dibujo no cabía: se redujo a ' + (size * scaleFix).toFixed(1) + ' mm.';
    }
    var d;
    if (p.offsetMm == null) {
      var lo = 0, hi = p.rMax;
      for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (maxR(mid) + p.slotW / 2 <= p.rMax) lo = mid; else hi = mid; }
      d = lo;
    } else {
      d = p.offsetMm;
      if (maxR(d) + p.slotW / 2 > p.rMax + 1e-6) warn = (warn ? warn + ' ' : '') + 'Con ese desplazamiento el dibujo se sale de la zona útil (r ≤ ' + p.rMax.toFixed(1) + ' mm).';
    }
    var placed = base.map(function (pl) { return pl.map(function (q) { return [q[0] + u[0] * d, q[1] + u[1] * d]; }); });
    var bw = w * s * scaleFix, bh = h * s * scaleFix, rMinActual = Infinity;
    placed.forEach(function (pl) { pl.forEach(function (q) { rMinActual = Math.min(rMinActual, Math.hypot(q[0], q[1])); }); });
    rMinActual -= p.slotW / 2;
    return {
      polylines: placed, offset: d, sizeMm: size * scaleFix, warn: warn, rMinActual: rMinActual,
      bbox: [u[0] * d - bw / 2, u[1] * d - bh / 2, u[0] * d + bw / 2, u[1] * d + bh / 2]
    };
  }

  /**
   * Corta en piezas y asigna giros.
   * p: { slotW, gap, maxLen, angleStep, minSepDeg, maxPerPos (0 = sin límite), rMax }
   */
  function layout(polylines, p) {
    var minD = p.slotW + p.gap;                       // distancia mínima entre ejes de ranuras
    var pieces = [];
    polylines = mergeChains(polylines, 0.25, 2 * p.slotW);
    polylines.forEach(function (pl) {
      if (pl.length === 1 || plen(pl) < 0.05) { pieces.push([pl[0]]); return; }
      var L = plen(pl), closed = Math.hypot(pl[0][0] - pl[pl.length - 1][0], pl[0][1] - pl[pl.length - 1][1]) < minD;
      var n = Math.max(closed ? 2 : 1, Math.ceil(L / p.maxLen));
      splitN(pl, n).forEach(function (q) { pieces.push(q); });
    });
    // cortar piezas que se tocan a sí mismas
    var queue = pieces.slice(), ok = [];
    while (queue.length) {
      var pc = queue.pop();
      if (pc.length > 1) {
        var at = selfContact(pc, minD);
        if (at > 0) { var sp = splitAt(pc, at); queue.push(sp[0], sp[1]); continue; }
      }
      ok.push(pc);
    }
    var removed = {};
    pieces = ok.map(function (q) { return { pts: q, len: plen(q), samples: resample(q, 0.35) }; });
    // Piezas diminutas ya cubiertas por los extremos redondeados de sus vecinas → fuera
    var cov = new Grid(p.slotW);
    pieces.forEach(function (pc, i) { pc.samples.forEach(function (q) { cov.add(q[0], q[1], i); }); });
    pieces = pieces.filter(function (pc, i) {
      if (pc.len > p.slotW * 0.9) return true;
      var covered = pc.samples.every(function (q) {
        var c = cov.cell, cx = Math.floor(q[0] / c), cy = Math.floor(q[1] / c);
        for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
          var arr = cov.map.get((cx + a) * 73856093 ^ (cy + b) * 19349663);
          if (!arr) continue;
          for (var k = 0; k < arr.length; k += 3) if (arr[k + 2] !== i && !removed[arr[k + 2]] && Math.hypot(arr[k] - q[0], arr[k + 1] - q[1]) < p.slotW * 0.3) return true;
        }
        return false;
      });
      if (covered) removed[i] = true;
      return !covered;
    });
    pieces.sort(function (a, b) { return b.len - a.len; });

    var grid = new Grid(minD), used = [], nA = Math.round(360 / p.angleStep);
    var R = p.diameter / 2, rLab = R - p.rimZone, lm = p.slotW / 2 + p.labelMargin;
    var occSlot = new Occ(R, 0.25), occLab = new Occ(R, 0.25);
    var lbw = p.labelBox[0], lbh = p.labelBox[1];
    var placedList = [], failed = [], queue2 = pieces.slice();
    function angDist(a, b) { var d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); }
    function rotS(pc, th) {
      var a = -th * D2R, c = Math.cos(a), s = Math.sin(a);
      return pc.samples.map(function (q) { return [c * q[0] - s * q[1], s * q[0] + c * q[1]]; });
    }
    function fits(S, dist) {
      for (var i = 0; i < S.length; i++) {
        if (grid.near(S[i][0], S[i][1], dist)) return false;
        if (occLab.get(S[i][0], S[i][1])) return false;
      }
      return true;
    }
    // Busca un sitio para el número junto a la ranura (girado para leerse derecho
    // cuando esa posición está arriba).
    function findLabel(S, th) {
      var ang = -th * D2R, ax = [Math.cos(ang), Math.sin(ang)], ay = [-Math.sin(ang), Math.cos(ang)];
      var L = S.length, cands = [], idxs = [];
      for (var j = 0; j < L; j += 2) idxs.push(j);
      if (idxs[idxs.length - 1] !== L - 1) idxs.push(L - 1);
      idxs.forEach(function (i) {
        var a = S[Math.max(0, i - 1)], b = S[Math.min(L - 1, i + 1)];
        var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty);
        var normals = tl < 1e-9 ? [[1, 0], [0, 1], [-1, 0], [0, -1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]] : [[-ty / tl, tx / tl], [ty / tl, -tx / tl]];
        if (tl >= 1e-9 && (i === 0 || i === L - 1)) {
          var sg = i === 0 ? -1 : 1;
          normals = normals.concat([[sg * tx / tl, sg * ty / tl]]);
        }
        normals.forEach(function (n) {
          var ext = Math.abs(n[0] * ax[0] + n[1] * ax[1]) * lbw / 2 + Math.abs(n[0] * ay[0] + n[1] * ay[1]) * lbh / 2;
          [0, 0.7, 1.6, 2.8].forEach(function (extra) {
            var d = lm + ext + 0.15 + extra;
            cands.push({ x: S[i][0] + n[0] * d, y: S[i][1] + n[1] * d, cost: Math.abs(i - (L - 1) / 2) * 0.35 * 0.3 + extra * 2 });
          });
        });
      });
      cands.sort(function (u, v) { return u.cost - v.cost; });
      var own = new Grid(lm * 2); S.forEach(function (q) { own.add(q[0], q[1], 0); });
      for (var k = 0; k < cands.length; k++) {
        var c = cands[k];
        if (occSlot.boxFree(c.x, c.y, ang, lbw, lbh, rLab, function (x, y) { return !own.near(x, y, lm); })) return { x: c.x, y: c.y, ang: ang };
      }
      return null;
    }
    var id = 0, noLabel = 0, perPos = {};
    var maxPer = p.maxPerPos > 0 ? p.maxPerPos : Infinity;
    while (queue2.length) {
      var pc = queue2.shift(), cands = [];
      for (var k = 0; k < nA; k++) {
        var th = k * p.angleStep, nearest = 360, isUsed = false;
        for (var u = 0; u < used.length; u++) { var ad = angDist(th, used[u]); if (ad < 1e-9) isUsed = true; nearest = Math.min(nearest, ad); }
        if (!isUsed && nearest < p.minSepDeg - 1e-9) continue;
        if (isUsed && (perPos[th] || 0) >= maxPer) continue;
        var S = rotS(pc, th);
        if (!fits(S, minD)) continue;
        var room = (fits(S, minD * 1.6) ? 1 : 0) + (fits(S, minD * 2.5) ? 1 : 0);
        var score = p.strategy === 'tight' ? -room : p.strategy === 'spread' ? nearest / 30 : room;
        if (isUsed) score += p.reuseBonus;
        else score += Math.min(nearest, 30) / 300;
        if (p.jitter) score += p.rand() * p.jitter;
        cands.push({ th: th, S: S, score: score });
      }
      cands.sort(function (a, b) { return b.score - a.score; });
      var chosen = null, lab = null;
      for (k = 0; k < cands.length && k < 60; k++) {
        lab = findLabel(cands[k].S, cands[k].th);
        if (lab) { chosen = cands[k]; break; }
      }
      if (!chosen && cands.length) {
        if (pc.len > Math.max(4, 3 * minD)) chosen = null;   // mejor partirla para que quepa su número
        else { chosen = cands[0]; lab = null; noLabel++; }
      }
      if (!chosen) {
        if (pc.len > 2 * p.slotW) {
          var halves = splitAt(pc.pts, pc.len / 2);
          queue2.unshift({ pts: halves[1], len: plen(halves[1]), samples: resample(halves[1], 0.35) });
          queue2.unshift({ pts: halves[0], len: plen(halves[0]), samples: resample(halves[0], 0.35) });
        } else failed.push(pc);
        continue;
      }
      if (used.indexOf(chosen.th) < 0) used.push(chosen.th);
      perPos[chosen.th] = (perPos[chosen.th] || 0) + 1;
      var a = -chosen.th * D2R, c = Math.cos(a), s = Math.sin(a);
      pc.theta = chosen.th; pc.id = id++; pc.label = lab;
      pc.disc = pc.pts.map(function (q) { return [c * q[0] - s * q[1], s * q[0] + c * q[1]]; });
      chosen.S.forEach(function (q) { grid.add(q[0], q[1], pc.id); occSlot.markDisk(q[0], q[1], lm); });
      if (lab) { occLab.markBox(lab.x, lab.y, lab.ang, lbw + 2 * lm, lbh + 2 * lm); occSlot.markBox(lab.x, lab.y, lab.ang, lbw + 0.6, lbh + 0.6); }
      placedList.push(pc);
    }
    // Un trozo que no cupo pero que ya queda pintado por las ranuras vecinas
    // (sus extremos redondeados lo cubren) no hace falta
    if (failed.length) {
      var ink = new Grid(p.slotW);
      placedList.forEach(function (pc) { pc.samples.forEach(function (q) { ink.add(q[0], q[1], 0); }); });
      failed = failed.filter(function (pc) {
        return !pc.samples.every(function (q) { return ink.near(q[0], q[1], p.slotW * 0.5); });
      });
    }
    // numerar posiciones: girando el disco en sentido horario aparecen 1, 2, 3...
    // (θ decreciente). La 1 es la más cercana a la marca superior.
    used.sort(function (a, b) { return b - a; });
    var startIdx = 0, bestA = 999;
    used.forEach(function (th, i) { var v = ((th % 360) + 360) % 360; if (v < bestA) { bestA = v; startIdx = i; } });
    var positions = [];
    for (var i = 0; i < used.length; i++) {
      var th2 = used[(startIdx + i) % used.length];
      positions.push({ n: i + 1, theta: th2, tickDeg: 90 - th2 });
    }
    var byTheta = {};
    positions.forEach(function (ps) { byTheta[ps.theta] = ps.n; });
    placedList.forEach(function (pc) { pc.pos = byTheta[pc.theta]; });
    return { pieces: placedList, positions: positions, failed: failed, noLabel: noLabel };
  }

  // Varias pasadas con pequeñas variaciones; se queda con la mejor
  function layoutBest(polylines, p, tries) {
    var best = null, seed = 12345;
    function rand() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (var t = 0; t < (tries || 1); t++) {
      var strat = ['roomy', 'tight', 'spread'][t % 3];
      var q = Object.assign({}, p, { rand: rand, jitter: t < 3 ? 0 : 0.8, strategy: strat });
      var r = layout(polylines, q);
      var failLen = r.failed.reduce(function (a, f) { return a + f.len + 1; }, 0);
      r.score = failLen * 1000 + r.noLabel * 20 + r.positions.length;
      r.strategy = strat;
      if (!best || r.score < best.score) best = r;
    }
    return best;
  }

  // Dibuja la "imagen" que queda en el papel tras trazar todas las posiciones (para verificar)
  function reconstruct(pieces, positions) {
    var th = {}; positions.forEach(function (p) { th[p.n] = p.theta; });
    return pieces.map(function (pc) {
      var a = th[pc.pos] * D2R;
      return { pos: pc.pos, pts: pc.disc.map(function (q) { return rot(q, a); }) };
    });
  }

  var api = { placeDrawing: placeDrawing, layout: layout, layoutBest: layoutBest, reconstruct: reconstruct, resample: resample, plen: plen, rot: rot };
  root.DDLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
