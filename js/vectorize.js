// Vectorización: imagen de línea (negro sobre blanco) → polilíneas del esqueleto.
// Todo trabaja en píxeles; la conversión a mm se hace en layout.js.
(function (root) {
  'use strict';

  // Distancia euclídea exacta (Felzenszwalb & Huttenlocher). mask[i]=1 → distancia al 0 más cercano.
  function edt(mask, W, H) {
    var INF = 1e20, f = new Float64Array(Math.max(W, H)), d = new Float64Array(Math.max(W, H));
    var v = new Int32Array(Math.max(W, H)), z = new Float64Array(Math.max(W, H) + 1);
    var g = new Float64Array(W * H);
    for (var i = 0; i < W * H; i++) g[i] = mask[i] ? INF : 0;
    function dt1(n) {
      var k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (var q = 1; q < n; q++) {
        var s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
    }
    for (var x = 0; x < W; x++) {
      for (var y = 0; y < H; y++) f[y] = g[y * W + x];
      dt1(H);
      for (y = 0; y < H; y++) g[y * W + x] = d[y];
    }
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) f[x] = g[y * W + x];
      dt1(W);
      for (x = 0; x < W; x++) g[y * W + x] = Math.sqrt(d[x]);
    }
    return g;
  }

  function components(mask, W, H) {
    var lab = new Int32Array(W * H), n = 0, stack = [], sizes = [0];
    for (var i = 0; i < W * H; i++) {
      if (!mask[i] || lab[i]) continue;
      n++; var sz = 0; lab[i] = n; stack.push(i);
      while (stack.length) {
        var p = stack.pop(), px = p % W, py = (p - px) / W; sz++;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var qx = px + dx, qy = py + dy;
          if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
          var q = qy * W + qx;
          if (mask[q] && !lab[q]) { lab[q] = n; stack.push(q); }
        }
      }
      sizes.push(sz);
    }
    return { lab: lab, n: n, sizes: sizes };
  }

  // Adelgazamiento Zhang-Suen
  function thin(m, W, H) {
    var changed = true, del = [];
    function P(x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? 0 : m[y * W + x]; }
    while (changed) {
      changed = false;
      for (var step = 0; step < 2; step++) {
        del.length = 0;
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          var p2 = P(x, y - 1), p3 = P(x + 1, y - 1), p4 = P(x + 1, y), p5 = P(x + 1, y + 1),
            p6 = P(x, y + 1), p7 = P(x - 1, y + 1), p8 = P(x - 1, y), p9 = P(x - 1, y - 1);
          var B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          var A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
          if (A !== 1) continue;
          if (step === 0) { if (p2 * p4 * p6 || p4 * p6 * p8) continue; }
          else { if (p2 * p4 * p8 || p2 * p6 * p8) continue; }
          del.push(y * W + x);
        }
        for (var i = 0; i < del.length; i++) m[del[i]] = 0;
        if (del.length) changed = true;
      }
    }
    // Quitar píxeles de "escalera" para dejar líneas 8-conexas de 1 px
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      var n = P(x, y - 1), e = P(x + 1, y), s = P(x, y + 1), w = P(x - 1, y);
      if ((n && e && !P(x - 1, y + 1)) || (e && s && !P(x - 1, y - 1)) || (s && w && !P(x + 1, y - 1)) || (w && n && !P(x + 1, y + 1))) {
        // sólo si al quitarlo no se desconecta el vecindario
        m[y * W + x] = 0;
        if (nbComponents(m, W, H, x, y) !== 1) m[y * W + x] = 1;
      }
    }
    return m;
  }

  var NB = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  function nbComponents(m, W, H, x, y) {
    // número de componentes 8-conexas entre los vecinos de (x,y)
    var on = [];
    for (var k = 0; k < 8; k++) {
      var qx = x + NB[k][0], qy = y + NB[k][1];
      on.push(qx >= 0 && qy >= 0 && qx < W && qy < H && m[qy * W + qx] ? 1 : 0);
    }
    var seen = [0, 0, 0, 0, 0, 0, 0, 0], c = 0;
    for (k = 0; k < 8; k++) {
      if (!on[k] || seen[k]) continue;
      c++; var st = [k]; seen[k] = 1;
      while (st.length) {
        var a = st.pop();
        for (var b = 0; b < 8; b++) {
          if (!on[b] || seen[b]) continue;
          var dx = Math.abs(NB[a][0] - NB[b][0]), dy = Math.abs(NB[a][1] - NB[b][1]);
          if (dx <= 1 && dy <= 1) { seen[b] = 1; st.push(b); }
        }
      }
    }
    return c;
  }

  // Convierte el esqueleto en un grafo y lo recorre en polilíneas
  function traceSkeleton(m, W, H) {
    var N = W * H, deg = new Uint8Array(N);
    function on(x, y) { return x >= 0 && y >= 0 && x < W && y < H && m[y * W + x]; }
    for (var i = 0; i < N; i++) {
      if (!m[i]) continue;
      var x = i % W, y = (i - x) / W, c = 0;
      for (var k = 0; k < 8; k++) if (on(x + NB[k][0], y + NB[k][1])) c++;
      deg[i] = c;
    }
    // nodos: grado != 2; se agrupan en clústeres
    var isNode = new Uint8Array(N);
    for (i = 0; i < N; i++) if (m[i] && deg[i] !== 2) isNode[i] = 1;
    var cl = components(isNode, W, H), cx = new Float64Array(cl.n + 1), cy = new Float64Array(cl.n + 1), cn = new Float64Array(cl.n + 1);
    for (i = 0; i < N; i++) if (cl.lab[i]) { var L = cl.lab[i]; cx[L] += i % W; cy[L] += Math.floor(i / W); cn[L]++; }
    for (L = 1; L <= cl.n; L++) { cx[L] /= cn[L]; cy[L] /= cn[L]; }

    var visited = new Uint8Array(N), edges = [], linkSeen = {};
    function walk(startIdx, firstIdx) {
      var startCl = cl.lab[startIdx];
      var pts = [[cx[startCl], cy[startCl]]];
      var prev = startIdx, cur = firstIdx;
      while (true) {
        if (isNode[cur]) {
          var Lc = cl.lab[cur];
          pts.push([cx[Lc], cy[Lc]]);
          return { pts: pts, a: startCl, b: Lc };
        }
        visited[cur] = 1;
        var x = cur % W, y = (cur - x) / W;
        pts.push([x, y]);
        var next = -1, nextNode = -1;
        for (var k = 0; k < 8; k++) {
          var qx = x + NB[k][0], qy = y + NB[k][1];
          if (!on(qx, qy)) continue;
          var q = qy * W + qx;
          if (q === prev) continue;
          if (isNode[q]) { if (nextNode < 0) nextNode = q; }
          else if (!visited[q]) { if (next < 0 || (k % 2 === 0)) next = q; }
        }
        if (nextNode >= 0 && !(cl.lab[nextNode] === startCl && pts.length < 3)) { prev = cur; cur = nextNode; continue; }
        if (next < 0) return { pts: pts, a: startCl, b: -1 };
        prev = cur; cur = next;
      }
    }
    for (i = 0; i < N; i++) {
      if (!isNode[i]) continue;
      x = i % W; y = (i - x) / W;
      for (k = 0; k < 8; k++) {
        var qx = x + NB[k][0], qy = y + NB[k][1];
        if (!on(qx, qy)) continue;
        var q = qy * W + qx;
        if (isNode[q]) {
          var la = cl.lab[i], lb = cl.lab[q];
          if (la !== lb) {
            var key = Math.min(la, lb) + '_' + Math.max(la, lb);
            if (!linkSeen[key]) { linkSeen[key] = 1; edges.push({ pts: [[cx[la], cy[la]], [cx[lb], cy[lb]]], a: la, b: lb }); }
          }
        } else if (!visited[q]) {
          edges.push(walk(i, q));
        }
      }
    }
    // nodos aislados (puntos sueltos)
    var nodeDeg = new Int32Array(cl.n + 1);
    edges.forEach(function (e) { nodeDeg[e.a]++; if (e.b > 0) nodeDeg[e.b]++; });
    for (L = 1; L <= cl.n; L++) if (!nodeDeg[L]) edges.push({ pts: [[cx[L], cy[L]]], a: L, b: L, dot: true });
    // lazos puros (sin nodos)
    for (i = 0; i < N; i++) {
      if (!m[i] || visited[i] || isNode[i]) continue;
      var pts = [], cur = i, prev = -1;
      while (cur >= 0) {
        visited[cur] = 1; x = cur % W; y = (cur - x) / W; pts.push([x, y]);
        var nx = -1;
        for (k = 0; k < 8; k++) {
          qx = x + NB[k][0]; qy = y + NB[k][1];
          if (!on(qx, qy)) continue;
          q = qy * W + qx;
          if (q !== prev && !visited[q]) { nx = q; break; }
        }
        prev = cur; cur = nx;
      }
      pts.push(pts[0].slice());
      edges.push({ pts: pts, a: -1, b: -1, loop: true });
    }
    return { edges: edges, nNodes: cl.n };
  }

  function plen(p) { var s = 0; for (var i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }

  // Quita ramitas cortas y une cadenas a través de nodos de grado 2
  function cleanGraph(edges, spurLen) {
    for (var iter = 0; iter < 3; iter++) {
      var deg = {};
      edges.forEach(function (e) { if (e.a > 0) deg[e.a] = (deg[e.a] || 0) + 1; if (e.b > 0) deg[e.b] = (deg[e.b] || 0) + 1; });
      edges = edges.filter(function (e) {
        if (e.loop || e.dot) return true;
        var da = deg[e.a] || 0, db = e.b > 0 ? (deg[e.b] || 0) : 1;
        var leaf = (da === 1 && db >= 3) || (db === 1 && da >= 3);
        return !(leaf && plen(e.pts) < spurLen);
      });
    }
    // unir cadenas en nodos de grado 2
    var changed = true;
    while (changed) {
      changed = false;
      var inc = {};
      edges.forEach(function (e, idx) {
        if (e.loop || e.dot) return;
        if (e.a > 0) (inc[e.a] = inc[e.a] || []).push(idx);
        if (e.b > 0 && e.b !== e.a) (inc[e.b] = inc[e.b] || []).push(idx);
      });
      for (var nd in inc) {
        if (inc[nd].length !== 2) continue;
        var i1 = inc[nd][0], i2 = inc[nd][1];
        if (i1 === i2) continue;
        var e1 = edges[i1], e2 = edges[i2], n = +nd;
        var p1 = e1.b === n ? e1.pts : e1.pts.slice().reverse(), o1 = e1.b === n ? e1.a : e1.b;
        var p2 = e2.a === n ? e2.pts : e2.pts.slice().reverse(), o2 = e2.a === n ? e2.b : e2.a;
        var merged = { pts: p1.concat(p2.slice(1)), a: o1, b: o2 };
        if (o1 === o2 && o1 > 0) { merged.loop = true; merged.a = merged.b = -1; }
        edges = edges.filter(function (_, k) { return k !== i1 && k !== i2; });
        edges.push(merged);
        changed = true;
        break;
      }
    }
    return edges;
  }

  function smooth(p, iters) {
    var closed = p.length > 3 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1];
    for (var it = 0; it < iters; it++) {
      var q = p.map(function (a) { return a.slice(); });
      for (var i = 1; i < p.length - 1; i++) {
        q[i][0] = (p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4;
        q[i][1] = (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4;
      }
      if (closed) {
        var n = p.length - 1;
        q[0][0] = q[n][0] = (p[n - 1][0] + 2 * p[0][0] + p[1][0]) / 4;
        q[0][1] = q[n][1] = (p[n - 1][1] + 2 * p[0][1] + p[1][1]) / 4;
      }
      p = q;
    }
    return p;
  }

  function rdp(p, eps) {
    if (p.length < 3) return p;
    var keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
    var st = [[0, p.length - 1]];
    while (st.length) {
      var s = st.pop(), a = s[0], b = s[1], dmax = 0, idx = -1;
      var ax = p[a][0], ay = p[a][1], bx = p[b][0], by = p[b][1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      for (var i = a + 1; i < b; i++) {
        var d = L < 1e-9 ? Math.hypot(p[i][0] - ax, p[i][1] - ay) : Math.abs(dx * (ay - p[i][1]) - dy * (ax - p[i][0])) / L;
        if (d > dmax) { dmax = d; idx = i; }
      }
      if (dmax > eps) { keep[idx] = 1; st.push([a, idx], [idx, b]); }
    }
    return p.filter(function (_, i) { return keep[i]; });
  }

  /**
   * gray: Uint8Array (0=negro..255=blanco), W,H
   * opts: threshold, fillToOutline, minSpeck (px)
   * Devuelve { polylines: [[[x,y]...]], lineWidth (px), mask, skeleton }
   */
  function vectorize(gray, W, H, opts) {
    opts = opts || {};
    var thr = opts.threshold != null ? opts.threshold : 128;
    var N = W * H, ink = new Uint8Array(N);
    for (var i = 0; i < N; i++) ink[i] = gray[i] < thr ? 1 : 0;
    // borde de 1 px en blanco
    for (var x = 0; x < W; x++) { ink[x] = 0; ink[(H - 1) * W + x] = 0; }
    for (var y = 0; y < H; y++) { ink[y * W] = 0; ink[y * W + W - 1] = 0; }
    // quitar manchas pequeñas
    var minSpeck = opts.minSpeck != null ? opts.minSpeck : Math.max(4, Math.round(N * 2e-5));
    var cc = components(ink, W, H);
    for (i = 0; i < N; i++) if (ink[i] && cc.sizes[cc.lab[i]] < minSpeck) ink[i] = 0;

    // grosor típico de línea
    var dt = edt(ink, W, H);
    var sk0 = thin(ink.slice(), W, H), vals = [];
    for (i = 0; i < N; i++) if (sk0[i]) vals.push(dt[i]);
    vals.sort(function (a, b) { return a - b; });
    var halfW = vals.length ? vals[Math.floor(vals.length * 0.5)] : 2;
    var lineWidth = 2 * halfW;

    var work = ink;
    if (opts.fillToOutline !== false) {
      // zonas rellenas (mucho más gruesas que la línea) → sólo su contorno
      var core = new Uint8Array(N), anyCore = false, tCore = Math.max(halfW * 2.2, halfW + 3);
      for (i = 0; i < N; i++) if (dt[i] > tCore) { core[i] = 1; anyCore = true; }
      if (anyCore) {
        var notCore = new Uint8Array(N);
        for (i = 0; i < N; i++) notCore[i] = core[i] ? 0 : 1;
        var dCore = edt(notCore, W, H);
        work = new Uint8Array(N);
        for (i = 0; i < N; i++) {
          if (!ink[i]) continue;
          var blob = dCore[i] <= tCore + 1.5;
          work[i] = (!blob || dt[i] <= lineWidth) ? 1 : 0;
        }
      }
    }
    var sk = thin(work.slice(), W, H);
    var g = traceSkeleton(sk, W, H);
    var edges = cleanGraph(g.edges, Math.max(lineWidth * 1.5, 3));
    var polylines = edges.map(function (e) {
      var p = e.pts;
      if (p.length > 2) p = smooth(p, 2);
      p = rdp(p, 0.5);
      return p;
    });
    return { polylines: polylines, lineWidth: lineWidth, mask: work, skeleton: sk, W: W, H: H };
  }

  var api = { vectorize: vectorize, edt: edt, rdp: rdp };
  root.DDVectorize = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
