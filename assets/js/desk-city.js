/* ============================================================
   desk-city.js — the night city seen DOWN from a high-rise, through
   the glass wall (GLASS) of the room. Horizon sits high; rows of
   rooftops (roof face + front face) step down toward the viewer,
   with a river + bridge far out and lit avenues between the rows.
   Four parallax layers (sky / far / mid / near — each its own
   element, moved by desk.js), looping traffic strips, rain sheets,
   and static droplets + reflections on the glass.
   Layers overhang the glass by 60 units sideways; the room <svg>
   (walls, ceiling, floor) covers everything outside the glass.
   Exposes: window.DeskCity.defs(), .layers(rand), .rain(rand), .onGlass(rand)
   ============================================================ */
(function () {
  "use strict";

  var S = DeskSvg, t = S.t, g = S.g, between = S.between, r1 = S.r1;
  var GLASS = { x: 300, y: 70, w: 1320, h: 630 };
  var X0 = GLASS.x - 60, X1 = GLASS.x + GLASS.w + 60;   // parallax overhang
  var HORIZON = 262;

  function defs() {
    return S.lin("g-sky", [[0, "#05041c"], [.55, "#1a0f3d"], [.85, "#4a1d55"], [1, "#9c3b48"]]) +
      S.lin("g-river", [[0, "#1b2240"], [1, "#0a0d1c"]]) +
      S.lin("g-roof", [[0, "#2a2340"], [1, "#1c1730"]]) +
      S.lin("g-front", [[0, "#140f22"], [1, "#07050d"]]) +
      S.lin("g-pool", [[0, "#5ff2ff"], [1, "#1a8fb0"]]) +
      S.lin("g-glass", [[0, "#fff", 0], [.5, "#fff", .05], [1, "#fff", 0]], "d") +
      S.rad("r-halo", "#ffb38a", .25) + S.rad("r-horizon", "#ff6a3a", .45) + S.rad("r-street", "#ff9a4a", .22) +
      t("clipPath", { id: "c-glass" }, t("rect", { x: GLASS.x, y: GLASS.y, width: GLASS.w, height: GLASS.h }));
  }

  function sky(rand) {
    var s = t("rect", { x: X0, y: 0, width: X1 - X0, height: HORIZON + 20, fill: "url(#g-sky)" });
    for (var i = 0; i < 80; i++) {
      var tw = i % 4 === 0;
      s += t("circle", { class: tw ? "tw" : null, cx: r1(between(rand, X0, X1)), cy: r1(between(rand, 80, 200)),
        r: r1(between(rand, .5, 1.4)), fill: "#fff", opacity: r1(between(rand, .25, .8)),
        style: tw ? "animation-delay:" + r1(-rand() * 6) + "s" : null });
    }
    s += t("circle", { cx: 1430, cy: 135, r: 80, fill: "url(#r-halo)" });
    s += t("circle", { cx: 1430, cy: 135, r: 24, fill: "#f7e6cf" });
    s += t("circle", { cx: 1438, cy: 130, r: 21, fill: "#e9d3b6", opacity: .5 });
    s += t("ellipse", { cx: 960, cy: HORIZON, rx: 900, ry: 90, fill: "url(#r-horizon)" });
    return s;
  }

  // Lit windows merged into 4 <path>s (warm/cool × bright/dim) instead of thousands of <rect>s.
  var WIN_BUCKETS = [["#ffcf8a", .9], ["#ffcf8a", .45], ["#9fd8ff", .85], ["#9fd8ff", .4]];
  function litPaths() { return { paths: ["", "", "", ""], twinkle: "" }; }
  function flushLit(lit) {
    return WIN_BUCKETS.map(function (b, i) { return t("path", { d: lit.paths[i], fill: b[0], opacity: b[1] }); }).join("") + lit.twinkle;
  }
  function windows(rand, x, y, w, h, win, chance, lit) {
    for (var yy = y + 4; yy < y + h - win[1]; yy += win[1] + win[3]) {
      for (var xx = x + 4; xx < x + w - win[0] - 3; xx += win[0] + win[2]) {
        if (rand() > chance) continue;
        var b = (rand() < .7 ? 0 : 2) + (rand() < .5 ? 0 : 1);
        if (rand() < .03) {
          lit.twinkle += t("rect", { class: "tw", x: xx, y: yy, width: win[0], height: win[1], fill: WIN_BUCKETS[b][0],
            style: "animation-delay:" + r1(-rand() * 7) + "s" });
        } else lit.paths[b] += "M" + xx + " " + yy + "h" + win[0] + "v" + win[1] + "h-" + win[0] + "z";
      }
    }
  }

  function far(rand) {
    var s = "", lit = litPaths(), x = X0;
    while (x < X1) {                                   // distant skyline on the horizon
      var w = Math.round(between(rand, 12, 40)), h = Math.round(between(rand, 12, 70));
      s += t("rect", { x: x, y: HORIZON - h, width: w, height: h, fill: "#1c1535" });
      windows(rand, x, HORIZON - h, w, h, [2, 2, 3, 3], .22, lit);
      x += w + Math.round(between(rand, 0, 4));
    }
    // river with light streaks + bridge
    s += t("rect", { x: X0, y: HORIZON, width: X1 - X0, height: 30, fill: "url(#g-river)" });
    for (var i = 0; i < 26; i++) {
      s += t("rect", { x: r1(between(rand, X0, X1)), y: r1(between(rand, HORIZON + 4, HORIZON + 26)),
        width: r1(between(rand, 8, 30)), height: 1.4, fill: rand() < .6 ? "#ffcf8a" : "#9fd8ff", opacity: .35 });
    }
    s += t("rect", { x: X0, y: HORIZON + 10, width: X1 - X0, height: 3, fill: "#0b0916" });
    for (x = X0 + 30; x < X1; x += 90) s += t("rect", { x: x, y: HORIZON + 13, width: 3, height: 14, fill: "#0b0916" });
    for (x = X0; x < X1; x += 26) s += t("circle", { cx: x, cy: HORIZON + 9, r: 1.2, fill: "#ffc47a", opacity: .85 });
    return s + flushLit(lit);
  }

  /** One row of city blocks seen from above: lighter roof face on top, lit front face below. */
  function blockRow(rand, o, lit) {
    var s = "", roofs = [], x = X0 + Math.round(between(rand, -20, 0));
    while (x < X1) {
      var w = Math.round(between(rand, o.minW, o.maxW)), d = Math.round(between(rand, o.minD, o.maxD));
      var h = Math.round(between(rand, o.minH, o.maxH)), y = o.y + Math.round(between(rand, -o.jitter, o.jitter));
      s += t("rect", { x: x, y: y, width: w, height: d, fill: "url(#g-roof)" });
      s += t("rect", { x: x, y: y, width: w, height: 1.2, fill: "#fff", opacity: .12 });
      s += t("rect", { x: x, y: y + d, width: w, height: h, fill: "url(#g-front)" });
      windows(rand, x, y + d, w, h, o.win, o.lit, lit);
      roofs.push({ x: x, y: y, w: w, d: d });
      x += w + Math.round(between(rand, o.gapMin, o.gapMax));
    }
    return { markup: s, roofs: roofs };
  }

  function street(y) {
    return t("rect", { x: X0, y: y - 3, width: X1 - X0, height: 6, fill: "#2a1a24" }) +
      t("ellipse", { cx: 960, cy: y, rx: 900, ry: 18, fill: "url(#r-street)" });
  }

  function mid(rand) {
    var lit = litPaths(), s = street(HORIZON + 38);
    [HORIZON + 44, HORIZON + 78, HORIZON + 116].forEach(function (y, i) {
      s += blockRow(rand, { y: y, minW: 30, maxW: 80, minD: 6, maxD: 12, minH: 16, maxH: 34 + i * 8, jitter: 3,
        gapMin: 6, gapMax: 16, win: [2, 3, 3, 3], lit: .22 }, lit).markup;
    });
    return s + street(HORIZON + 160) + flushLit(lit);
  }

  function near(rand) {
    var lit = litPaths(), s = "", extra = "";
    [HORIZON + 176, HORIZON + 250].forEach(function (y, row) {
      var r = blockRow(rand, { y: y, minW: 90, maxW: 190, minD: 20 + row * 8, maxD: 36 + row * 10, minH: 60, maxH: 260,
        jitter: 8, gapMin: 12, gapMax: 30, win: [4, 6, 5, 6], lit: .2 }, lit);
      s += r.markup;
      r.roofs.forEach(function (b, i) { extra += rooftop(rand, b, row * 10 + i); });
    });
    return s + flushLit(lit) + extra;
  }

  /** Rooftop details: glowing pools, helipads, AC units, blinking beacons. */
  function rooftop(rand, b, i) {
    var s = "", k = i % 4;
    if (k === 0 && b.w > 110) {
      s += t("rect", { x: b.x + b.w * .2, y: b.y + b.d * .25, width: b.w * .45, height: b.d * .5, rx: 2, fill: "url(#g-pool)", opacity: .9 });
    } else if (k === 1 && b.w > 100) {
      s += t("ellipse", { cx: b.x + b.w / 2, cy: b.y + b.d / 2, rx: b.d * .7, ry: b.d * .38, fill: "none", stroke: "#e9e4dc", "stroke-opacity": .5 });
      s += t("text", { x: b.x + b.w / 2, y: b.y + b.d / 2 + 4, "text-anchor": "middle", "font-size": 11, "font-family": "sans-serif", fill: "#e9e4dc", opacity: .5 }, "H");
    } else {
      for (var j = 0; j < 3; j++) {
        s += t("rect", { x: r1(b.x + 8 + rand() * (b.w - 24)), y: r1(b.y + 3 + rand() * (b.d - 9)), width: 10, height: 6, fill: "#3a3350" });
      }
    }
    if (i % 3 === 0) s += t("circle", { class: "beacon", cx: b.x + 6, cy: b.y + 4, r: 2.4, fill: "#ff2a2a", style: "animation-delay:" + (-i * .4) + "s" });
    return s;
  }

  /* Moving things are separate <svg>s animated as whole elements (compositor-only).
     Each strip holds its content twice, one LOOP apart, for a seamless loop. */
  var CAR_LOOP = 2040, RAIN_LOOP = 900;

  function carStrip(rand, color, cy) {
    var c = "";
    for (var i = 0; i < 44; i++) {
      var cx = X0 + Math.round(between(rand, 0, CAR_LOOP));
      c += t("rect", { x: cx, y: cy, width: 5, height: 1.8, rx: .9, fill: color });
      c += t("rect", { x: cx + CAR_LOOP, y: cy, width: 5, height: 1.8, rx: .9, fill: color });
    }
    return c;
  }

  function rainSheet(rand, count) {
    var s = "";
    for (var i = 0; i < count; i++) {
      var x = r1(between(rand, GLASS.x, GLASS.x + GLASS.w)), y = r1(between(rand, GLASS.y, GLASS.y + RAIN_LOOP));
      var a = { width: 1.2, height: r1(between(rand, 8, 22)), rx: .6, fill: "#cfe8ff", opacity: r1(between(rand, .1, .32)) };
      s += t("rect", Object.assign({ x: x, y: y }, a)) + t("rect", Object.assign({ x: x, y: y - RAIN_LOOP }, a));
    }
    return s;
  }

  function droplets(rand) {
    var s = "";
    for (var i = 0; i < 36; i++) {
      s += t("circle", { cx: r1(between(rand, GLASS.x, GLASS.x + GLASS.w)), cy: r1(between(rand, GLASS.y, GLASS.y + GLASS.h)),
        r: r1(between(rand, 1, 2.8)), fill: "#dff0ff", opacity: r1(between(rand, .08, .2)) });
    }
    return s;
  }

  function reflections() {
    return [[520, 220], [1030, 140], [1420, 90]].map(function (b) {
      var x = b[0], w = b[1];
      return t("polygon", { points: [x, GLASS.y, x + w, GLASS.y, x + w - 380, GLASS.y + GLASS.h, x - 380, GLASS.y + GLASS.h].join(" "),
        fill: "url(#g-glass)" });
    }).join("");
  }

  /** Parallax layers (back → front); anims = looping <svg>s inside a layer (class → CSS animation). */
  function layers(rand) {
    return [
      { depth: 4, markup: sky(rand) },
      { depth: 8, markup: far(rand) },
      { depth: 14, markup: mid(rand), anims: [
        { cls: "cars-l", markup: carStrip(rand, "#ff3b3b", HORIZON + 36) + carStrip(rand, "#ff3b3b", HORIZON + 158) },
        { cls: "cars-r", markup: carStrip(rand, "#fff4d6", HORIZON + 39) + carStrip(rand, "#fff4d6", HORIZON + 161) }] },
      { depth: 22, markup: near(rand) },
    ];
  }

  /** Two rain sheets falling at different speeds (behind the room, visible through the glass). */
  function rain(rand) {
    return [{ cls: "rain-a", markup: rainSheet(rand, 40) }, { cls: "rain-b", markup: rainSheet(rand, 30) }];
  }

  /** Static things ON the glass (move with the room): droplets + reflections. */
  function onGlass(rand) {
    return g({ "clip-path": "url(#c-glass)", "aria-hidden": "true" }, droplets(rand) + reflections());
  }

  window.DeskCity = { defs: defs, layers: layers, rain: rain, onGlass: onGlass, GLASS: GLASS, CAR_LOOP: CAR_LOOP, RAIN_LOOP: RAIN_LOOP };
})();
