/* ============================================================
   desk-room.js — the luxury high-rise room around the desk, drawn in
   one-point perspective (vanishing point VP): ceiling with downlights
   and cove LED, two side walls, a polished marble floor, and the
   floor-to-ceiling glass wall (slim black mullions, smoky tint,
   balcony glass railing outside, curtain rod; the two sheer drapes are
   separate animated panels, see curtains()). Corners: an arc
   floor lamp (left) and a monstera (right).
   Everything outside the glass is opaque, so the city layers behind
   show through the glass only.
   Exposes: window.DeskRoom.defs(), .back() (behind the desk), .corners() (front), .curtains()
   ============================================================ */
(function () {
  "use strict";

  var S = DeskSvg, t = S.t, g = S.g, r1 = S.r1;
  var GL = DeskCity.GLASS;                           // 300,70 → 1620,700
  var VP = { x: 960, y: 470 };
  var FLOOR_Y = GL.y + GL.h;                         // where glass meets the floor
  var R = GL.x + GL.w;                               // glass right edge
  var V = S.VIEW, TOP = V.y, BOTTOM = V.y + V.h, LEFT = V.x, RIGHT = V.x + V.w;   // shell must cover the whole camera frame

  /** x where the perspective ray from VP through (x, y0) reaches y. */
  function rayX(x, y0, y) { return r1(x + (x - VP.x) * (y - y0) / (y0 - VP.y)); }

  function defs() {
    return S.lin("g-wall-l", [[0, "#050408"], [1, "#0d0b13"]], "h") +
      S.lin("g-wall-r", [[0, "#0d0b13"], [1, "#050408"]], "h") +
      S.lin("g-ceiling", [[0, "#030305"], [1, "#0b0910"]]) +
      S.lin("g-marble", [[0, "#110e17"], [.5, "#09080d"], [1, "#030304"]]) +
      S.lin("g-floor-glow", [[0, "#ffb070", .08], [1, "#ffb070", 0]]) +
      S.lin("g-sheer", [[0, "#e9e4f2", .1], [.5, "#e9e4f2", .32], [1, "#e9e4f2", .12]], "h") +
      S.lin("g-rail", [[0, "#9fd8ff", .1], [1, "#9fd8ff", .03]]) +
      S.lin("g-leaf", [[0, "#2f6a4a"], [1, "#0f2a1c"]]) +
      S.rad("r-lamp", "#e8a860", .19) + S.rad("r-down", "#ffe2b8", .28);
  }

  /* ---------- shell: walls, ceiling, floor ---------- */
  function shell() {
    var lb = rayX(GL.x, FLOOR_Y, BOTTOM), rb = rayX(R, FLOOR_Y, BOTTOM);  // floor corners at the bottom edge
    var lt = rayX(GL.x, GL.y, TOP), rt = rayX(R, GL.y, TOP);              // ceiling corners at the top edge
    var s = t("polygon", { points: [lt, TOP, rt, TOP, R, GL.y, GL.x, GL.y].join(" "), fill: "url(#g-ceiling)" });
    s += t("polygon", { points: [LEFT, TOP, lt, TOP, GL.x, GL.y, GL.x, FLOOR_Y, lb, BOTTOM, LEFT, BOTTOM].join(" "), fill: "url(#g-wall-l)" });
    s += t("polygon", { points: [RIGHT, TOP, rt, TOP, R, GL.y, R, FLOOR_Y, rb, BOTTOM, RIGHT, BOTTOM].join(" "), fill: "url(#g-wall-r)" });
    s += t("polygon", { points: [GL.x, FLOOR_Y, R, FLOOR_Y, rb, BOTTOM, lb, BOTTOM].join(" "), fill: "url(#g-marble)" });
    // skirting + wall/ceiling edges
    s += t("path", { d: "M" + GL.x + " " + FLOOR_Y + " L" + lb + " " + BOTTOM + " M" + R + " " + FLOOR_Y + " L" + rb + " " + BOTTOM,
      stroke: "#1c1924", "stroke-width": 3 });
    s += t("path", { d: "M" + lt + " " + TOP + " L" + GL.x + " " + GL.y + " M" + rt + " " + TOP + " L" + R + " " + GL.y, stroke: "#16131c", "stroke-width": 2 });
    return s + floorDetail() + downlights();
  }

  function floorDetail() {
    var s = "";
    // light from the glass pooling on the polished floor
    s += t("polygon", { points: [GL.x, FLOOR_Y, R, FLOOR_Y, rayX(R, FLOOR_Y, 900), 900, rayX(GL.x, FLOOR_Y, 900), 900].join(" "),
      fill: "url(#g-floor-glow)" });
    // mullion reflections running toward the viewer
    [GL.x, 630, 960, 1290, R].forEach(function (x) {
      s += t("path", { d: "M" + x + " " + FLOOR_Y + " L" + rayX(x, FLOOR_Y, BOTTOM) + " " + BOTTOM, stroke: "#000", "stroke-opacity": .35, "stroke-width": 6 });
    });
    // marble veins
    ["M380 820 C560 800 700 860 900 840 S1250 800 1500 860", "M200 960 C420 930 640 1010 980 980 S1480 930 1760 1000",
      "M1100 760 C1200 780 1300 750 1420 780"].forEach(function (d) {
      s += t("path", { d: d, stroke: "#fff", "stroke-opacity": .028, "stroke-width": 2, fill: "none" });
    });
    return s;
  }

  function downlights() {
    var s = "";
    [[560, 34], [960, 34], [1360, 34], [300, 20], [1620, 20]].forEach(function (p) {
      s += t("ellipse", { cx: p[0], cy: p[1], rx: 16, ry: 4, fill: "#b9a88c" });
      s += t("ellipse", { cx: p[0], cy: p[1] + 30, rx: 90, ry: 40, fill: "url(#r-down)", opacity: .35 });
    });
    return s;
  }

  /* ---------- glass wall ---------- */
  function railing() {
    var top = 588, s = t("rect", { x: GL.x, y: top, width: GL.w, height: FLOOR_Y - top, fill: "url(#g-rail)" });
    for (var x = GL.x + 110; x < R; x += 220) s += t("rect", { x: x, y: top, width: 3, height: FLOOR_Y - top, fill: "#0d0c12", opacity: .8 });
    s += t("rect", { x: GL.x, y: top - 4, width: GL.w, height: 5, fill: "#8e8e98" });
    s += t("rect", { x: GL.x, y: top - 4, width: GL.w, height: 1.5, fill: "#fff", opacity: .5 });
    return s;
  }

  function glassFrame() {
    var f = "#0b0a0f", s = t("rect", { x: GL.x, y: GL.y, width: GL.w, height: GL.h, fill: "#04060e", opacity: .4 });
    [GL.x, 630, 960, 1290, R].forEach(function (x) {
      s += t("rect", { x: x - 4, y: GL.y, width: 8, height: GL.h, fill: f });
      s += t("rect", { x: x - 4, y: GL.y, width: 1.2, height: GL.h, fill: "#fff", opacity: .12 });
    });
    s += t("rect", { x: GL.x - 4, y: GL.y - 4, width: GL.w + 8, height: 8, fill: f });
    s += t("rect", { x: GL.x - 4, y: FLOOR_Y - 5, width: GL.w + 8, height: 7, fill: f });
    return s + S.led("M" + GL.x + " " + (GL.y + 6) + " H" + R, 2.5);
  }

  /* ---------- curtains: two sheer drapes meeting at the top centre, swept back to the sides
     at the floor → a triangular opening in the middle. Each drape is rendered in its own <svg>
     by desk-scene.js and "blown outward" by CSS (skew/scale of the whole element, pivot = its
     outer top corner). Drawn for the left side; the right one is mirrored around the centre. */
  var DRAPE = { top: GL.y + 6, bottom: FLOOR_Y - 4, outer: GL.x + 4, meet: 975, foot: 560, folds: 10 };
  var MID = GL.x + GL.w / 2;

  /** Fold line k (0 = outer edge … folds = inner edge) as cubic points [P0, C1, C2, P3]. */
  function fold(k) {
    var d = DRAPE, f = k / d.folds;
    var xt = d.outer + (d.meet - d.outer) * f, xb = d.outer + (d.foot - d.outer) * f, span = xt - xb;
    return [[xt, d.top], [xt - span * .1, d.top + 220], [xb + span * .25, d.top + 460], [xb, d.bottom]];
  }

  function drape(side) {
    var mx = side === "l" ? function (x) { return r1(x); } : function (x) { return r1(2 * MID - x); };
    function pt(p) { return mx(p[0]) + " " + r1(p[1]); }
    function curve(c) { return "M" + pt(c[0]) + " C" + pt(c[1]) + " " + pt(c[2]) + " " + pt(c[3]); }
    function back(c) { return " L" + pt(c[3]) + " C" + pt(c[2]) + " " + pt(c[1]) + " " + pt(c[0]); }
    var d = DRAPE, s = "", edge = fold(d.folds), outer = fold(0);
    // whole drape (base tint)
    s += t("path", { d: curve(outer) + back(edge) + "Z", fill: "#e9e4f2", opacity: .09 });
    // pleat strips between neighbouring folds, alternating density, with a shadow line per fold
    for (var k = 0; k < d.folds; k++) {
      var a = fold(k), b = fold(k + 1);
      s += t("path", { d: curve(a) + back(b) + "Z", fill: "url(#g-sheer)", opacity: k % 2 ? .7 : 1 });
      if (k) s += t("path", { d: curve(a), stroke: "#000", "stroke-opacity": .18, "stroke-width": 2, fill: "none" });
    }
    // soft highlight on the swept inner edge + hem gathered at the side
    s += t("path", { d: curve(edge), stroke: "#fff", "stroke-opacity": .16, "stroke-width": 2.5, fill: "none" });
    s += t("path", { d: "M" + mx(d.outer) + " " + (d.bottom - 3) + " Q" + mx((d.outer + d.foot) / 2) + " " + (d.bottom + 5) + " " + mx(d.foot) + " " + (d.bottom - 3),
      stroke: "#fff", "stroke-opacity": .14, "stroke-width": 3, fill: "none" });
    return s;
  }

  /** The two drapes; desk-scene.js wraps each in an animated <svg>. */
  function curtains() {
    return [{ cls: "curtain-l", markup: drape("l") }, { cls: "curtain-r", markup: drape("r") }];
  }

  function curtainRods() {
    return t("rect", { x: GL.x, y: GL.y + 2, width: GL.w, height: 5, rx: 2, fill: "#3a3644" }) +
      t("rect", { x: GL.x, y: GL.y + 2, width: GL.w, height: 1.2, fill: "#fff", opacity: .15 });
  }

  /* ---------- corners ---------- */
  function floorLamp() {
    return t("ellipse", { cx: 330, cy: 400, rx: 300, ry: 260, fill: "url(#r-lamp)" }) +
      t("ellipse", { cx: 300, cy: 930, rx: 150, ry: 30, fill: "url(#r-lamp)", opacity: .35 }) +
      t("path", { d: "M170 930 V330 Q170 250 280 256 Q340 262 348 318", stroke: "url(#g-metal)", "stroke-width": 6, fill: "none" }) +
      t("path", { d: "M306 314 Q348 280 390 314 L398 344 H298Z", fill: "#16141c", stroke: "#3a3644" }) +
      t("ellipse", { cx: 348, cy: 346, rx: 48, ry: 7, fill: "#a8743c" }) +
      t("path", { d: "M300 348 H396 L520 900 H170Z", fill: "#e8a860", opacity: .02 }) +
      t("ellipse", { cx: 170, cy: 932, rx: 60, ry: 10, fill: "#07060a" });
  }

  function leaf(cx, cy, len, angle, w) {
    var d = "M0 0 C" + r1(w) + " " + r1(-len * .3) + " " + r1(w * .8) + " " + r1(-len * .8) + " 0 " + (-len) +
      " C" + r1(-w * .8) + " " + r1(-len * .8) + " " + r1(-w) + " " + r1(-len * .3) + " 0 0Z";
    var tr = "translate(" + cx + " " + cy + ") rotate(" + angle + ")";
    return t("path", { d: d, fill: "url(#g-leaf)", stroke: "#0a1a12", transform: tr }) +
      t("path", { d: "M0 0 V" + r1(-len * .9), stroke: "#4f8a68", "stroke-opacity": .5, transform: tr });
  }

  function plant() {
    var leaves = [[-48, 220, 60], [-24, 280, 72], [-4, 310, 78], [18, 290, 74], [40, 240, 66], [62, 190, 54]];
    return t("ellipse", { cx: 1760, cy: 1004, rx: 90, ry: 14, fill: "#000", opacity: .55 }) +
      leaves.map(function (l) { return leaf(1760, 890, l[1], l[0], l[2]); }).join("") +
      t("path", { d: "M1690 880 H1830 L1815 1000 H1705Z", fill: "#1d1a22", stroke: "#34303d" }) +
      t("rect", { x: 1685, y: 874, width: 150, height: 14, rx: 3, fill: "#26222d" });
  }

  /** Room behind the desk: shell, glass (railing → tint/frames → curtains), room light. */
  function back() {
    return g({ "aria-hidden": "true" },
      shell() + railing() + glassFrame() + curtainRods() + floorLamp());
  }

  /** Foreground corner pieces (drawn over the desk layer). */
  function corners() {
    return g({ class: "decor-front", "aria-hidden": "true" }, plant());
  }

  window.DeskRoom = { defs: defs, back: back, corners: corners, curtains: curtains, VP: VP, FLOOR_Y: FLOOR_Y };
})();
