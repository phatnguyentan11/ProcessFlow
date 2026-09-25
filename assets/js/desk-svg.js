/* ============================================================
   desk-svg.js — tiny SVG markup helpers, seeded RNG and RGB LED
   builders shared by desk-city.js, desk-room.js and desk-scene.js.
   All markup is static strings built
   from our own constants (no user data), so no escaping is needed.
   Exposes: window.DeskSvg
   ============================================================ */
(function () {
  "use strict";

  function attrs(o) {
    var s = "";
    for (var k in o) if (o[k] != null) s += " " + k + '="' + o[k] + '"';
    return s;
  }

  /** <name attrs>inner</name>, or self-closing when inner is null. */
  function t(name, o, inner) {
    return "<" + name + attrs(o || {}) + (inner == null ? "/>" : ">" + inner + "</" + name + ">");
  }
  function g(o, inner) { return t("g", o, inner); }

  /** mulberry32 — deterministic pseudo-random, so the scene is identical on every load. */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function between(rand, a, b) { return a + rand() * (b - a); }
  function r1(n) { return Math.round(n * 10) / 10; }

  /* gradients */
  function grad(kind, id, stops, dir) {
    var d = { v: [0, 0, 0, 1], h: [0, 0, 1, 0], d: [0, 0, 1, 1] }[dir || "v"];
    var o = kind === "linearGradient" ? { id: id, x1: d[0], y1: d[1], x2: d[2], y2: d[3] } : { id: id };
    return t(kind, o, stops.map(function (s) {
      return t("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] == null ? 1 : s[2] });
    }).join(""));
  }
  function lin(id, stops, dir) { return grad("linearGradient", id, stops, dir); }
  function rad(id, color, a) { return grad("radialGradient", id, [[0, color, a], [1, color, 0]]); }

  var C = { orange: "#ff4d00", magenta: "#ff2bd6", cyan: "#22e4ff" };
  var LED_COLORS = [C.magenta, C.cyan, C.orange];

  /* RGB LED strip: 3 colour copies cross-fading (.led__c, opacity only). Glow = stacked
     translucent strokes, not a blur filter — a filtered element is re-blurred every repaint. */
  function led(d, width) {
    return g({ class: "led", "aria-hidden": "true" }, LED_COLORS.map(function (col, i) {
      return g({ class: "led__c", style: "animation-delay:" + (-i * 3) + "s", fill: "none", stroke: col, "stroke-linecap": "round" },
        t("path", { d: d, "stroke-width": width * 7, opacity: .08 }) +
        t("path", { d: d, "stroke-width": width * 3.5, opacity: .18 }) +
        t("path", { d: d, "stroke-width": width }));
    }).join(""));
  }
  /** Soft RGB wash (needs r-magenta / r-cyan / r-orange gradients in defs). */
  function ledGlow(cx, cy, rx, ry) {
    return g({ class: "led", "aria-hidden": "true" }, ["r-magenta", "r-cyan", "r-orange"].map(function (id, i) {
      return t("ellipse", { class: "led__c", cx: cx, cy: cy, rx: rx, ry: ry, fill: "url(#" + id + ")",
        style: "animation-delay:" + (-i * 3) + "s" });
    }).join(""));
  }

  window.DeskSvg = {
    W: 1920, H: 1080, C: C,
    // camera frame (every scene <svg>'s viewBox): wider than the 1920×1080 design space = zoomed out
    VIEW: { x: -170, y: -95, w: 2260, h: 1270 },
    t: t, g: g, rng: rng, between: between, r1: r1, lin: lin, rad: rad, led: led, ledGlow: ledGlow,
  };
})();
