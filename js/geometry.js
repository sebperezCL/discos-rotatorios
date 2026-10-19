// 2D/3D disc geometry: slots, numbers, notches, frame and extrusion into meshes.
// Requires ClipperLib (lib/clipper.js) and earcut (lib/earcut.min.js).
(function (root) {
  'use strict';
  var ClipperLib = root.ClipperLib || (typeof require !== 'undefined' ? require('../lib/clipper.js') : null);
  var earcut = root.earcut || (typeof require !== 'undefined' ? require('../lib/earcut.min.js') : null);
  var SC = 1000; // Clipper works with integers: 1 unit = 1 µm
  var D2R = Math.PI / 180;

  // ---------- Stroke font for digits (box 0..0.6 x 0..1, y up) ----------
  function arc(cx, cy, rx, ry, a0, a1, n) {
    var out = []; n = n || 24;
    for (var i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * D2R; out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return out;
  }
  function quad(p0, c, p1, n) {
    var out = []; n = n || 12;
    for (var i = 0; i <= n; i++) { var t = i / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); }
    return out;
  }
  var GLYPHS = {
    '0': [{ closed: true, pts: arc(0.3, 0.5, 0.3, 0.5, 0, 360, 40).slice(0, -1) }],
    '1': [{ pts: [[0.1, 0.78], [0.34, 1.0], [0.34, 0.0]] }],
    '2': [{ pts: arc(0.3, 0.7, 0.29, 0.3, 165, -40, 20).concat([[0.0, 0.0], [0.6, 0.0]]) }],
    '3': [{ pts: arc(0.29, 0.75, 0.25, 0.25, 150, -90, 20).concat(arc(0.29, 0.27, 0.29, 0.27, 90, -150, 22).slice(1)) }],
    '4': [{ pts: [[0.46, 0.0], [0.46, 1.0], [0.0, 0.3], [0.62, 0.3]] }],
    '5': [{ pts: [[0.56, 1.0], [0.08, 1.0], [0.05, 0.54]].concat(arc(0.3, 0.33, 0.3, 0.33, 140, -145, 24)) }],
    '6': [{ pts: quad([0.52, 0.98], [0.02, 0.8], [0.0, 0.3]).concat(arc(0.3, 0.3, 0.3, 0.3, 180, 540, 32).slice(1)) }],
    '7': [{ pts: [[0.0, 1.0], [0.6, 1.0], [0.18, 0.0]] }],
    '8': [{ closed: true, pts: arc(0.3, 0.765, 0.235, 0.235, 0, 360, 28).slice(0, -1) },
          { closed: true, pts: arc(0.3, 0.27, 0.285, 0.27, 0, 360, 32).slice(0, -1) }],
    '9': null
  };
  GLYPHS['9'] = GLYPHS['6'].map(function (s) { return { pts: s.pts.map(function (p) { return [0.6 - p[0], 1 - p[1]]; }) }; });
  var ADV = 0.6, SPACING = 0.32;

  function textWidth(str, h, sw) { var hh = h - sw; return str.length * ADV * hh + (str.length - 1) * SPACING * hh + sw; }

  // Strokes (centerlines) of a text centered at (cx,cy), rotated `ang` rad, total height h
  function textStrokes(str, cx, cy, ang, h, sw) {
    var hh = h - sw, tw = str.length * ADV * hh + (str.length - 1) * SPACING * hh;
    var c = Math.cos(ang), s = Math.sin(ang), out = [];
    for (var i = 0; i < str.length; i++) {
      var g = GLYPHS[str[i]]; if (!g) continue;
      var ox = -tw / 2 + i * (ADV + SPACING) * hh, oy = -hh / 2;
      g.forEach(function (st) {
        out.push({ closed: !!st.closed, pts: st.pts.map(function (p) {
          var x = ox + p[0] * hh, y = oy + p[1] * hh;
          return [cx + c * x - s * y, cy + s * x + c * y];
        }) });
      });
    }
    return out;
  }

  // ---------- Clipper helpers ----------
  function toPath(pts) { return pts.map(function (p) { return { X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }; }); }
  function offsetStrokes(strokes, width) {
    var co = new ClipperLib.ClipperOffset(2, 0.01 * SC);
    strokes.forEach(function (st) {
      co.AddPath(toPath(st.pts), ClipperLib.JoinType.jtRound, st.closed ? ClipperLib.EndType.etClosedLine : ClipperLib.EndType.etOpenRound);
    });
    var sol = new ClipperLib.Paths();
    co.Execute(sol, width / 2 * SC);
    return sol;
  }
  function circlePath(r, n) {
    var p = []; for (var i = 0; i < n; i++) { var a = 2 * Math.PI * i / n; p.push({ X: Math.round(r * Math.cos(a) * SC), Y: Math.round(r * Math.sin(a) * SC) }); }
    return p;
  }
  function boolOp(type, subj, clip) {
    var c = new ClipperLib.Clipper(), sol = new ClipperLib.Paths();
    c.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
    if (clip && clip.length) c.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
    c.Execute(type, sol, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    return sol;
  }
  function boolTree(type, subj, clip) {
    var c = new ClipperLib.Clipper(), tree = new ClipperLib.PolyTree();
    c.StrictlySimple = true;
    c.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
    if (clip && clip.length) c.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
    c.Execute(type, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    var ex = ClipperLib.JS.PolyTreeToExPolygons(tree);
    // clean up nearly collinear/duplicate vertices (avoids degenerate mesh edges)
    ex.forEach(function (e) {
      e.outer = ClipperLib.Clipper.CleanPolygon(e.outer, 2);
      e.holes = (e.holes || []).map(function (h) { return ClipperLib.Clipper.CleanPolygon(h, 2); }).filter(function (h) { return h.length >= 3; });
    });
    return ex.filter(function (e) { return e.outer.length >= 3; });
  }
  var CT = function () { return ClipperLib.ClipType; };

  /**
   * Builds all the 2D geometry.
   * lay: result of DDLayout.layout; p: parameters (see app.js)
   */
  function build2D(lay, drawingBBox, p) {
    var R = p.diameter / 2;
    var disc = [circlePath(R, 360)];

    // Slots
    var slotStrokes = lay.pieces.map(function (pc) { return { pts: pc.disc }; });
    var slots = boolOp(CT().ctUnion, offsetStrokes(slotStrokes, p.slotW));
    var body = boolOp(CT().ctDifference, disc, slots);

    // Numbers next to each slot (already placed by the layout)
    var labels = [], missing = [];
    lay.pieces.forEach(function (pc) {
      if (pc.label) labels.push({ txt: String(pc.pos), x: pc.label.x, y: pc.label.y, ang: pc.label.ang });
      else missing.push(pc.pos);
    });

    // Rim notches and numbers
    var rimStrokes = [], tickStrokes = [];
    lay.positions.forEach(function (ps) {
      var a = ps.tickDeg * D2R, u = [Math.cos(a), Math.sin(a)];
      tickStrokes.push({ pts: [[u[0] * (R - p.tickLen - 0.6), u[1] * (R - p.tickLen - 0.6)], [u[0] * (R - 0.9), u[1] * (R - 0.9)]] });
      var rn = R - p.tickLen - 1.4 - p.rimNumH / 2;
      rimStrokes = rimStrokes.concat(textStrokes(String(ps.n), u[0] * rn, u[1] * rn, -ps.theta * D2R, p.rimNumH, p.labelStroke));
    });
    var labelStrokes = [];
    labels.forEach(function (lb) { labelStrokes = labelStrokes.concat(textStrokes(lb.txt, lb.x, lb.y, lb.ang, p.labelH, p.labelStroke)); });

    var numbers = boolOp(CT().ctUnion, offsetStrokes(labelStrokes.concat(rimStrokes), p.labelStroke).concat(offsetStrokes(tickStrokes, p.tickW)));
    numbers = boolOp(CT().ctIntersection, numbers, body);

    // Reference frame (position 1): shallow groove on the top face
    var frame = null;
    if (p.frame && lay.positions.length && drawingBBox) {
      var th = lay.positions[0].theta * D2R, m = p.slotW / 2 + 1;
      var bb = [[drawingBBox[0] - m, drawingBBox[1] - m], [drawingBBox[2] + m, drawingBBox[1] - m], [drawingBBox[2] + m, drawingBBox[3] + m], [drawingBBox[0] - m, drawingBBox[3] + m]];
      var rp = bb.map(function (q) { return DDLayout.rot(q, -th); });
      frame = boolOp(CT().ctIntersection, offsetStrokes([{ closed: true, pts: rp }], p.frameW), [circlePath(R - 0.8, 360)]);
      frame = boolOp(CT().ctDifference, frame, offsetStrokes(labelStrokes.concat(rimStrokes), p.labelStroke + 0.6));
    }
    return { R: R, disc: disc, slots: slots, body: body, numbers: numbers, frame: frame, labels: labels, missingLabels: missing };
  }

  // earcut can leave zero-area triangles when there are collinear vertices between
  // holes; that creates T-junctions. Each flat triangle (a,m,b) is removed by splitting
  // the neighboring triangle that uses edge (a,b).
  function fixDegenerate(tri, flat) {
    function area(a, b, c) { return (flat[2 * b] - flat[2 * a]) * (flat[2 * c + 1] - flat[2 * a + 1]) - (flat[2 * b + 1] - flat[2 * a + 1]) * (flat[2 * c] - flat[2 * a]); }
    function d2(a, b) { var dx = flat[2 * a] - flat[2 * b], dy = flat[2 * a + 1] - flat[2 * b + 1]; return dx * dx + dy * dy; }
    var T = [];
    for (var i = 0; i < tri.length; i += 3) T.push([tri[i], tri[i + 1], tri[i + 2]]);
    for (var guard = 0; guard < 1000; guard++) {
      var di = -1;
      for (i = 0; i < T.length; i++) if (T[i] && Math.abs(area(T[i][0], T[i][1], T[i][2])) < 1e-9) { di = i; break; }
      if (di < 0) break;
      var t = T[di]; T[di] = null;
      // m = the middle vertex (the one that isn't an end of the longest side)
      var e = [[0, 1, 2], [1, 2, 0], [2, 0, 1]].sort(function (x, y) { return d2(t[y[0]], t[y[1]]) - d2(t[x[0]], t[x[1]]); })[0];
      var a = t[e[0]], b = t[e[1]], m = t[e[2]];
      for (i = 0; i < T.length; i++) {
        var u = T[i]; if (!u) continue;
        var ia = u.indexOf(a), ib = u.indexOf(b);
        if (ia < 0 || ib < 0) continue;
        var x = u[3 - ia - ib];
        T[i] = null;
        T.push([a, m, x], [m, b, x]);
        break;
      }
    }
    // T-junctions: if a vertex lies on a triangle's side, the triangle is split
    var cell = 1, grid = new Map(), nV = flat.length / 2;
    for (i = 0; i < nV; i++) {
      var k = Math.floor(flat[2 * i] / cell) + ',' + Math.floor(flat[2 * i + 1] / cell);
      (grid.get(k) || (grid.set(k, []), grid.get(k))).push(i);
    }
    function onEdge(a, b) {
      var ax = flat[2 * a], ay = flat[2 * a + 1], bx = flat[2 * b], by = flat[2 * b + 1];
      var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      if (L2 < 1e-12) return -1;
      var x0 = Math.floor(Math.min(ax, bx) / cell), x1 = Math.floor(Math.max(ax, bx) / cell);
      var y0 = Math.floor(Math.min(ay, by) / cell), y1 = Math.floor(Math.max(ay, by) / cell);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 400) return -1;
      for (var gx = x0; gx <= x1; gx++) for (var gy = y0; gy <= y1; gy++) {
        var arr = grid.get(gx + ',' + gy); if (!arr) continue;
        for (var j = 0; j < arr.length; j++) {
          var m = arr[j]; if (m === a || m === b) continue;
          var px = flat[2 * m] - ax, py = flat[2 * m + 1] - ay, t = (px * dx + py * dy) / L2;
          if (t <= 1e-9 || t >= 1 - 1e-9) continue;
          var cr = (px * dy - py * dx); if (cr * cr / L2 > 1e-10) continue;
          return m;
        }
      }
      return -1;
    }
    var stack = T.filter(Boolean), res = [];
    while (stack.length) {
      var tt = stack.pop(), split = false;
      for (var ei = 0; ei < 3 && !split; ei++) {
        var a2 = tt[ei], b2 = tt[(ei + 1) % 3], c2 = tt[(ei + 2) % 3], mm = onEdge(a2, b2);
        if (mm >= 0) { stack.push([a2, mm, c2], [mm, b2, c2]); split = true; }
      }
      if (!split) res.push(tt);
    }
    var out = [];
    res.forEach(function (t) { out.push(t[0], t[1], t[2]); });
    return out;
  }

  // ---------- Extrusion ----------
  function Mesh() { this.v = []; this.t = []; }
  Mesh.prototype.addPrism = function (expolys, z0, z1) {
    var self = this;
    expolys.forEach(function (ex) {
      var rings = [ex.outer].concat(ex.holes || []);
      rings = rings.map(function (r, i) {
        var pts = r.map(function (p) { return [p.X / SC, p.Y / SC]; });
        var area = 0;
        for (var k = 0; k < pts.length; k++) { var a = pts[k], b = pts[(k + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
        if ((i === 0 && area < 0) || (i > 0 && area > 0)) pts.reverse();
        return pts;
      }).filter(function (r) { return r.length >= 3; });
      if (!rings.length) return;
      var flat = [], holes = [], base0 = self.v.length;
      rings.forEach(function (r, i) { if (i > 0) holes.push(flat.length / 2); r.forEach(function (p) { flat.push(p[0], p[1]); }); });
      var n = flat.length / 2;
      for (var k = 0; k < n; k++) self.v.push([flat[2 * k], flat[2 * k + 1], z0]);
      for (k = 0; k < n; k++) self.v.push([flat[2 * k], flat[2 * k + 1], z1]);
      var tri = fixDegenerate(earcut(flat, holes), flat);
      for (k = 0; k < tri.length; k += 3) {
        var a = tri[k], b = tri[k + 1], c = tri[k + 2];
        var cr = (flat[2 * b] - flat[2 * a]) * (flat[2 * c + 1] - flat[2 * a + 1]) - (flat[2 * b + 1] - flat[2 * a + 1]) * (flat[2 * c] - flat[2 * a]);
        if (cr < 0) { var tmp = b; b = c; c = tmp; }
        self.t.push([base0 + n + a, base0 + n + b, base0 + n + c]);   // top cap (normal +z)
        self.t.push([base0 + a, base0 + c, base0 + b]);               // bottom cap (normal -z)
      }
      var off = 0;
      rings.forEach(function (r) {
        var m = r.length;
        for (var i = 0; i < m; i++) {
          var a0 = base0 + off + i, b0 = base0 + off + (i + 1) % m, a1 = a0 + n, b1 = b0 + n;
          self.t.push([a0, b0, b1]); self.t.push([a0, b1, a1]);
        }
        off += m;
      });
    });
    return this;
  };
  Mesh.prototype.append = function (o) {
    var b = this.v.length;
    this.v = this.v.concat(o.v);
    this.t = this.t.concat(o.t.map(function (t) { return [t[0] + b, t[1] + b, t[2] + b]; }));
    return this;
  };

  // 10 µm morphological opening + closing: removes zero-thickness walls and merges
  // regions that touch only along a line or at a point (avoids non-closed meshes)
  function closeTiny(paths) {
    function off(src, d) {
      var co = new ClipperLib.ClipperOffset(2, 1), out = new ClipperLib.Paths();
      co.AddPaths(src, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon); co.Execute(out, d);
      return out;
    }
    return off(off(off(paths, -10), 20), -10);
  }
  function toEx(paths) { return boolTree(CT().ctUnion, closeTiny(paths)); }

  function build3D(g, p) {
    var tb = p.thickness, body = new Mesh();
    if (g.frame && g.frame.length) {
      body.addPrism(toEx(g.body), 0, tb - p.frameDepth);
      body.addPrism(toEx(boolOp(CT().ctDifference, g.body, g.frame)), tb - p.frameDepth - 0.02, tb);
    } else body.addPrism(toEx(g.body), 0, tb);
    var nums = new Mesh().addPrism(toEx(g.numbers), tb, tb + p.numH);
    return { body: body, numbers: nums };
  }

  var api = { build2D: build2D, build3D: build3D, Mesh: Mesh, SC: SC, textStrokes: textStrokes, textWidth: textWidth };
  root.DDGeometry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
