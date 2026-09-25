/* ============================================================
   desk-scene.js — assembles the gaming-mode scene for desk.js:
   city layers (desk-city.js) behind the room (desk-room.js), the
   desk with its 5 interactive objects (.desk-item[data-action],
   each with a .desk-neon outline that pulses in turn), and "me" —
   the avatar chilling in a gaming chair, 3/4 back view, coffee in
   hand, looking out at the city. Avatar colours come from CSS vars
   (--av-*) and the shirt text from [data-avatar-text], both set by
   avatar.js, so customising never rebuilds the scene.
   Objects are drawn at their original design size and placed with
   a translate+scale (place: [tx, ty, s]); tags are placed unscaled
   so they stay readable.
   Pure markup: no events, no state.
   Exposes: window.DeskScene.build() → markup string
   ============================================================ */
(function () {
  "use strict";

  var S = DeskSvg, t = S.t, g = S.g, r1 = S.r1, C = S.C;
  var NEON_STAGGER_S = 1.2;       // delay between objects in the neon sweep

  function defs() {
    return "<defs>" + DeskCity.defs() + DeskRoom.defs() +
      S.lin("g-desk", [[0, "#7a5439"], [.6, "#5a3c28"], [1, "#3e2919"]]) +       // walnut top
      S.lin("g-edge", [[0, "#5c3f2a"], [1, "#22160d"]]) +
      S.lin("g-obj", [[0, "#34303d"], [1, "#16141c"]]) +
      S.lin("g-obj-dark", [[0, "#211e28"], [1, "#0c0b10"]]) +
      S.lin("g-metal", [[0, "#b9b9c2"], [.45, "#6c6c75"], [1, "#a3a3ad"]], "h") +
      S.lin("g-screen", [[0, "#0e0c1c"], [1, "#05050b"]]) +
      S.lin("g-hot", [[0, "#ff7a3a"], [1, "#d63a00"]]) +
      S.lin("g-paper", [[0, "#f2f0ea"], [1, "#cfcbc2"]]) +
      S.rad("r-screen", "#8fb4ff", .3) +
      S.rad("r-magenta", C.magenta, .3) + S.rad("r-cyan", C.cyan, .3) + S.rad("r-orange", C.orange, .3) +
      S.rad("r-shadow", "#000", .75) +
      "</defs>";
  }

  /** Neon outline of a clickable object: the given silhouettes stroked 3× (halo → core). */
  function neon(shapes) {
    var sil = shapes.map(function (s) { return t(s[0], s[1]); }).join("");
    return g({ class: "desk-neon", fill: "none", stroke: C.orange, "stroke-linejoin": "round" },
      g({ "stroke-width": 16, opacity: .18 }, sil) +
      g({ "stroke-width": 7, opacity: .35 }, sil) +
      g({ "stroke-width": 2.6, stroke: "#ffd2bd" }, sil));
  }

  function place(p, inner) { return g({ transform: "translate(" + p[0] + " " + p[1] + ") scale(" + p[2] + ")" }, inner); }

  /* ============================================================
     Desk + decor
     ============================================================ */
  /** Walnut desk — the brightest surface in the dark room, so it pops. Its LED strip is exempt
      from the room dimming (.desk-surface in gaming.css). */
  function desk() {
    var s = t("rect", { x: 430, y: 778, width: 22, height: 128, fill: "#1a120c" });
    s += t("rect", { x: 1548, y: 778, width: 22, height: 128, fill: "#1a120c" });
    s += t("ellipse", { cx: 1000, cy: 906, rx: 640, ry: 26, fill: "#000", opacity: .5 });
    s += t("polygon", { points: "440,690 1560,690 1600,760 400,760", fill: "url(#g-desk)" });
    [[700, 1540, 702], [455, 1320, 716], [620, 1575, 731], [430, 1180, 746]].forEach(function (v) {   // wood grain
      s += t("path", { d: "M" + v[0] + " " + v[2] + " C" + (v[0] + 200) + " " + (v[2] - 3) + " " + (v[1] - 200) + " " + (v[2] + 3) + " " + v[1] + " " + v[2],
        stroke: "#2a1a0f", "stroke-opacity": .45, "stroke-width": 1.5, fill: "none" });
    });
    s += t("path", { d: "M440 690 H1560", stroke: "#ffd9b0", "stroke-opacity": .35, "stroke-width": 2 });
    s += t("path", { d: "M400 760 H1600", stroke: "#ffd9b0", "stroke-opacity": .25, "stroke-width": 1.5 });
    s += t("rect", { x: 400, y: 760, width: 1200, height: 18, fill: "url(#g-edge)" });
    s += t("ellipse", { cx: 1120, cy: 715, rx: 320, ry: 36, fill: "url(#r-screen)" });
    return S.ledGlow(1120, 560, 330, 170) +                                   // monitor bias light on the glass
      g({ class: "desk-surface", "aria-hidden": "true" }, s + S.led("M404 779 H1596", 2));
  }

  function pcTower() {
    var s = t("rect", { x: 1440, y: 360, width: 180, height: 345, rx: 8, fill: "url(#g-obj-dark)", stroke: "#34303d" });
    s += t("rect", { x: 1454, y: 376, width: 152, height: 314, rx: 4, fill: "#08070d", stroke: "#fff", "stroke-opacity": .12 });
    [452, 540, 628].forEach(function (cy, i) {
      s += S.led("M1500 " + cy + " a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0", 2.5);
      // spin = two blade sets half a blade apart, alternating (opacity only)
      [0, 360 / 14].forEach(function (offset, set) {
        var blades = "";
        for (var k = 0; k < 7; k++) {
          blades += t("path", { d: "M1530 " + cy + " q12 -6 14 -26 q-10 4 -14 26Z", fill: "#3b3746",
            transform: "rotate(" + r1(offset + k * 360 / 7) + " 1530 " + cy + ")" });
        }
        s += g({ class: "fan fan--" + (set ? "b" : "a"), style: "animation-delay:" + (-i * .05) + "s" }, blades);
      });
      s += t("circle", { cx: 1530, cy: cy, r: 7, fill: "#1b1922" });
    });
    s += t("polygon", { points: "1456,378 1520,378 1470,688 1456,688", fill: "url(#g-glass)" });
    return g({ "aria-hidden": "true" }, place([457, 263, .62], s));
  }

  function rug() {
    return t("polygon", { points: "500,872 1060,872 1170,1052 390,1052", fill: "#15111c", stroke: C.orange, "stroke-opacity": .18, "stroke-width": 3,
      "aria-hidden": "true" }) +
      t("polygon", { points: "530,888 1030,888 1128,1036 432,1036", fill: "none", stroke: "#fff", "stroke-opacity": .05, "stroke-width": 2 });
  }

  /* ============================================================
     "Me": chair + avatar (3/4 back view, reclined, coffee in hand)
     ============================================================ */
  function chairBase() {
    var s = t("ellipse", { cx: 770, cy: 1004, rx: 150, ry: 20, fill: "url(#r-shadow)" });
    [[680, 1004], [860, 1004], [720, 1030], [822, 1032], [770, 996]].forEach(function (p) {
      s += t("path", { d: "M770 975 L" + p[0] + " " + p[1], stroke: "#1c1a22", "stroke-width": 9, "stroke-linecap": "round" });
      s += t("ellipse", { cx: p[0], cy: p[1] + 6, rx: 9, ry: 6, fill: "#0e0d12" });
    });
    s += t("rect", { x: 763, y: 900, width: 14, height: 78, fill: "url(#g-metal)" });
    s += t("ellipse", { cx: 770, cy: 904, rx: 100, ry: 16, fill: "#15131b" });
    return s;
  }

  function avatarBody() {
    var s = "";
    // torso (hoodie) + hood fold
    s += t("path", { class: "av-shirt", d: "M676 812 L680 700 Q684 652 722 640 Q770 628 818 640 Q858 652 862 700 L866 812Z" });
    s += t("path", { d: "M724 642 Q770 672 816 642 Q804 626 770 624 Q736 626 724 642Z", fill: "#000", opacity: .28 });
    s += t("text", { class: "av-text", x: 770, y: 706, "text-anchor": "middle", "data-avatar-text": "" }, "WORKHUB");
    // right arm resting on the armrest
    s += t("path", { class: "av-shirt", d: "M842 656 Q874 680 876 742 L880 814 L856 814 L852 744 Q846 702 830 672Z" });
    s += t("ellipse", { class: "av-skin", cx: 868, cy: 820, rx: 12, ry: 8 });
    // left arm raised, coffee near the face
    s += t("path", { class: "av-shirt", d: "M700 656 Q660 684 646 740 L664 752 Q690 716 712 676Z" });
    s += t("path", { class: "av-shirt", d: "M646 740 L664 752 Q690 694 704 646 L688 638 Q670 692 646 740Z" });
    s += t("circle", { class: "av-skin", cx: 696, cy: 634, r: 11 });
    s += t("path", { d: "M676 594 H708 V628 Q708 634 702 634 H682 Q676 634 676 628Z", fill: "#e9e4dc" });
    s += t("path", { d: "M676 602 q-12 0 -12 12 q0 12 12 12", stroke: "#e9e4dc", "stroke-width": 4, fill: "none" });
    s += t("ellipse", { cx: 692, cy: 594, rx: 16, ry: 3.5, fill: "#3b2417" });
    // steam = 3 wisps stacked upward, fading in turn (opacity only)
    [[688, 586], [698, 566], [688, 546]].forEach(function (p, i) {
      s += t("path", { class: "steam", d: "M" + p[0] + " " + p[1] + " q-7 -10 0 -20 q7 -9 0 -18", stroke: "#fff",
        "stroke-width": 2.5, "stroke-linecap": "round", fill: "none", style: "animation-delay:" + (i * .9) + "s" });
    });
    return s;
  }

  function avatarHead() {
    var s = t("rect", { class: "av-skin", x: 757, y: 610, width: 26, height: 32 });
    s += t("ellipse", { class: "av-skin", cx: 770, cy: 582, rx: 36, ry: 42 });
    // seen from behind: short hair covers the whole head down to the nape, ears stick out
    s += t("path", { class: "av-hair", d: "M732 596 Q722 534 770 530 Q820 534 809 596 Q807 616 792 622 Q770 628 748 622 Q734 616 732 596Z" });
    s += t("ellipse", { class: "av-skin", cx: 732, cy: 592, rx: 6, ry: 10 });
    s += t("ellipse", { class: "av-skin", cx: 809, cy: 592, rx: 6, ry: 10 });
    s += t("path", { d: "M748 546 Q770 540 794 548 M744 566 Q770 558 798 568", stroke: "#fff", "stroke-opacity": .08, fill: "none" });
    // glasses: temple arms over the ears + the right lens rim (head turned toward the window)
    s += g({ class: "av-glasses", fill: "none", stroke: "#0d0c10", "stroke-width": 3, "stroke-linecap": "round" },
      t("path", { d: "M727 580 L746 577 M813 580 L796 577" }) +
      t("path", { d: "M812 572 Q824 574 822 590 Q818 600 810 598", "stroke-width": 3.5 }));
    // headphones around the neck
    s += t("path", { d: "M732 632 Q770 664 808 632", stroke: "#1b1922", "stroke-width": 9, fill: "none" });
    s += t("ellipse", { cx: 730, cy: 636, rx: 10, ry: 13, fill: "#26222e", stroke: C.orange, "stroke-width": 1.5 });
    s += t("ellipse", { cx: 810, cy: 636, rx: 10, ry: 13, fill: "#26222e", stroke: C.orange, "stroke-width": 1.5 });
    // screen / city rim light on the right side
    s += t("path", { d: "M806 556 Q812 572 808 592 M846 660 Q862 690 864 740", stroke: "#8fb4ff", "stroke-opacity": .35, "stroke-width": 2.5, fill: "none" });
    return s;
  }

  function chairBack() {
    return t("path", { d: "M684 906 L688 754 Q692 738 712 736 L828 736 Q848 738 852 754 L856 906Z", fill: "url(#g-obj-dark)", stroke: "#34303d" }) +
      t("rect", { x: 716, y: 738, width: 12, height: 166, fill: C.orange }) +
      t("rect", { x: 812, y: 738, width: 12, height: 166, fill: C.orange }) +
      t("path", { d: "M692 752 Q700 740 720 739", stroke: "#fff", "stroke-opacity": .12, fill: "none" }) +
      // armrests
      t("rect", { x: 668, y: 822, width: 10, height: 80, fill: "#141218" }) +
      t("rect", { x: 646, y: 812, width: 54, height: 12, rx: 5, fill: "#221f2a" }) +
      t("rect", { x: 862, y: 822, width: 10, height: 80, fill: "#141218" }) +
      t("rect", { x: 840, y: 812, width: 54, height: 12, rx: 5, fill: "#221f2a" });
  }

  function me() {
    return g({ class: "decor-front avatar", "aria-hidden": "true" }, chairBase() + avatarBody() + avatarHead() + chairBack());
  }

  /* ============================================================
     Interactive objects — .desk-item > [placed: shadow + hit + .desk-lift(+neon)] + .desk-tag
     ============================================================ */
  function item(o) {
    return g({ class: "desk-item", "data-action": o.action, tabindex: 0, role: "button", "aria-label": o.label,
      style: "--neon-delay:" + r1(o.order * NEON_STAGGER_S) + "s" },
      place(o.place,
        t("ellipse", { class: "desk-shadow", cx: o.shadow[0], cy: o.shadow[1], rx: o.shadow[2], ry: o.shadow[3], fill: "url(#r-shadow)" }) +
        t("rect", { class: "desk-hit", x: o.hit[0], y: o.hit[1], width: o.hit[2], height: o.hit[3] }) +
        g({ class: "desk-lift" }, o.body)) +
      g({ class: "desk-tag" },
        t("rect", { x: o.tag[0] - o.tag[2] / 2, y: o.tag[1] - 25, width: o.tag[2], height: 42, rx: 2 }) +
        t("text", { x: o.tag[0], y: o.tag[1] + 3 }, o.tag[3])));
  }

  function monitor() {
    var bezel = "M640 262 Q960 236 1280 262 L1280 604 Q960 628 640 604Z";
    var screen = "M658 280 Q960 256 1262 280 L1262 586 Q960 608 658 586Z";
    var bars = "";
    [0.82, 0.55, 0.68, 0.34].forEach(function (p, i) {
      var y = 420 + i * 30;
      bars += t("rect", { x: 1040, y: y, width: 190, height: 8, rx: 4, fill: "#1a1728" });
      bars += t("rect", { x: 1040, y: y, width: Math.round(190 * p), height: 8, rx: 4, fill: i ? "#3a3450" : C.orange });
    });
    var body = S.led("M700 262 Q960 240 1220 262", 3) +
      t("rect", { x: 936, y: 600, width: 48, height: 104, fill: "url(#g-metal)" }) +
      t("path", { d: "M830 712 Q960 690 1090 712 L1100 722 Q960 704 820 722Z", fill: "url(#g-obj)" }) +
      t("path", { class: "desk-shape", d: bezel, fill: "url(#g-obj-dark)" }) +
      t("path", { d: screen, fill: "url(#g-screen)" }) +
      t("text", { class: "desk-screen__label", x: 692, y: 330 }, "&gt;_ TASK / FEATURE") +
      t("text", { class: "desk-screen__num", x: 684, y: 506, "data-count": "open" }, "–") +
      t("text", { class: "desk-screen__sub", x: 694, y: 556 }, "đang mở · tổng " + t("tspan", { "data-count": "tasks" }, "–")) +
      t("text", { class: "desk-screen__sub", x: 1040, y: 400 }, "SPRINT") + bars +
      t("rect", { class: "desk-cursor", x: 1216, y: 552, width: 18, height: 5 }) +
      t("path", { d: "M658 280 Q800 268 900 266 L760 586 L658 586Z", fill: "url(#g-glass)" }) +
      t("circle", { cx: 960, cy: 616, r: 3, fill: C.orange }) +
      neon([["path", { d: bezel }]]);
    return item({ action: "tasks", label: "Mở Task / Feature", order: 0, place: [525, 259, .62],
      hit: [630, 230, 660, 500], shadow: [960, 718, 190, 18], body: body, tag: [1120, 380, 170, "[ TASKS ]"] });
  }

  function binders() {
    var specs = [[232, 450, 58, "url(#g-obj)"], [294, 472, 58, "url(#g-obj)"], [356, 432, 70, "url(#g-hot)"]];
    var body = "", outline = [];
    specs.forEach(function (b, i) {
      var h = 712 - b[1];
      body += t("rect", { class: "desk-shape", x: b[0], y: b[1], width: b[2], height: h, rx: 4, fill: b[3] });
      body += t("rect", { x: b[0] + 4, y: b[1] + 4, width: 3, height: h - 8, fill: "#fff", opacity: .08 });
      body += t("rect", { x: b[0] + 10, y: b[1] + 34, width: b[2] - 20, height: 34, rx: 2, fill: "url(#g-paper)" });
      body += t("rect", { x: b[0] + 16, y: b[1] + 44, width: b[2] - 36, height: 3, fill: "#6d675c" });
      body += t("rect", { x: b[0] + 16, y: b[1] + 54, width: b[2] - 44, height: 3, fill: "#a19a8c" });
      body += t("circle", { cx: b[0] + b[2] / 2, cy: 712 - 44, r: 9, fill: "#0b0a10", stroke: i === 2 ? "#ffb08a" : "#4a4655", "stroke-width": 2 });
      outline.push(["rect", { x: b[0], y: b[1], width: b[2], height: h, rx: 4 }]);
    });
    body += t("text", { class: "desk-spine", x: 398, y: 640, transform: "rotate(-90 398 640)" }, "SOP") + neon(outline);
    return item({ action: "processes", label: "Mở Quy trình", order: 1, place: [331, 264, .62],
      hit: [210, 400, 240, 330], shadow: [330, 714, 130, 12], body: body,
      tag: [535, 505, 250, "[ QUY TRÌNH · " + t("tspan", { "data-count": "processes" }, "–") + " ]"] });
  }

  function inbox() {
    var tray = "1470,772 1660,772 1644,824 1486,824", paper = "1498,728 1630,720 1636,774 1502,780";
    var body = t("polygon", { points: paper, fill: "url(#g-paper)" }) +
      t("polygon", { points: "1492,742 1628,740 1630,788 1494,790", fill: "#e6e2d9" }) +
      t("rect", { x: 1510, y: 752, width: 70, height: 3, fill: "#8a8478" }) +
      t("rect", { x: 1510, y: 762, width: 90, height: 3, fill: "#b1ab9e" }) +
      t("polygon", { class: "desk-shape", points: tray, fill: "url(#g-obj)" }) +
      t("path", { d: "M1470 772 H1660", stroke: "#fff", "stroke-opacity": .15 }) +
      t("text", { class: "desk-ink", x: 1565, y: 806 }, "INBOX") +
      neon([["polygon", { points: tray }], ["polygon", { points: paper }]]);
    return item({ action: "import", label: "Import task từ file JSON", order: 2, place: [431, 193, .7],
      hit: [1450, 690, 230, 150], shadow: [1565, 830, 110, 10], body: body, tag: [1530, 668, 150, "[ IMPORT ]"] });
  }

  function controller() {
    var shell = "M20 10 Q110 -6 200 10 Q232 16 236 52 Q242 100 216 108 Q194 114 176 88 L64 88 Q46 114 24 108 Q-2 100 4 52 Q8 16 20 10Z";
    var body = g({ transform: "translate(462 794) rotate(-5)" },
      t("path", { class: "desk-shape", d: shell, fill: "url(#g-obj)" }) +
      t("path", { d: "M24 14 Q110 0 196 14", stroke: "#fff", "stroke-opacity": .12, fill: "none", "stroke-width": 2 }) +
      t("rect", { x: 40, y: 40, width: 34, height: 11, rx: 2, fill: "#0d0c12" }) +
      t("rect", { x: 51, y: 29, width: 12, height: 33, rx: 2, fill: "#0d0c12" }) +
      t("circle", { cx: 176, cy: 32, r: 8, fill: C.orange }) +
      t("circle", { cx: 194, cy: 48, r: 8, fill: C.cyan }) +
      t("circle", { cx: 158, cy: 48, r: 8, fill: C.magenta }) +
      t("circle", { cx: 176, cy: 64, r: 8, fill: "#e9e4dc" }) +
      t("circle", { cx: 90, cy: 70, r: 12, fill: "#0d0c12", stroke: "#3c3846" }) +
      t("circle", { cx: 140, cy: 70, r: 12, fill: "#0d0c12", stroke: "#3c3846" }) +
      t("rect", { x: 100, y: 34, width: 22, height: 4, rx: 2, fill: C.orange, opacity: .85 }) +
      neon([["path", { d: shell }]]));
    return item({ action: "mode", label: "Chuyển về chế độ Bình thường", order: 3, place: [656, 232, .6],
      hit: [440, 760, 290, 170], shadow: [582, 910, 120, 10], body: body, tag: [1040, 820, 240, "[ CHẾ ĐỘ THƯỜNG ]"] });
  }

  function floppy() {
    var body = g({ transform: "translate(292 770) rotate(-9)" },
      t("rect", { class: "desk-shape", x: 0, y: 0, width: 116, height: 116, rx: 5, fill: "#16151c" }) +
      t("path", { d: "M0 5 Q0 0 5 0 H111 Q116 0 116 5 V8 H0Z", fill: "#fff", opacity: .06 }) +
      t("rect", { x: 30, y: 0, width: 58, height: 36, fill: "url(#g-metal)" }) +
      t("rect", { x: 64, y: 6, width: 14, height: 24, fill: "#16151c" }) +
      t("rect", { x: 14, y: 52, width: 88, height: 56, rx: 2, fill: "url(#g-paper)" }) +
      t("rect", { x: 14, y: 52, width: 88, height: 8, fill: C.orange }) +
      t("text", { class: "desk-hand", x: 58, y: 90 }, "backup!") +
      t("rect", { x: 104, y: 104, width: 7, height: 7, fill: "#000" }) +
      neon([["rect", { x: 0, y: 0, width: 116, height: 116, rx: 5 }]]));
    return item({ action: "export", label: "Export toàn bộ task ra JSON", order: 4, place: [1065, 236, .6],
      hit: [270, 740, 170, 170], shadow: [352, 886, 80, 10], body: body, tag: [1300, 820, 150, "[ EXPORT ]"] });
  }

  /* ---------- assemble (back → front) ----------
     City layers, traffic and rain are separate stacked elements (same viewBox) moved
     only by CSS transforms on the elements themselves — composited by the GPU, so
     nothing is re-rasterised per frame. Inside the room <svg> only opacity animates.
     Gradient ids are document-global, so defs in the first <svg> serve all of them. */
  function svg(attrs, inner) {
    var v = S.VIEW;
    return '<svg viewBox="' + [v.x, v.y, v.w, v.h].join(" ") + '" preserveAspectRatio="xMidYMid meet" ' +
      'shape-rendering="geometricPrecision" text-rendering="geometricPrecision"' + attrs + ">" + inner + "</svg>";
  }

  function animSvg(a) { return svg(' class="desk-anim desk-anim--' + a.cls + '"', a.markup); }

  function build() {
    var rand = S.rng(20260925);
    var city = DeskCity.layers(rand).map(function (l, i) {
      return '<div class="desk-layer" aria-hidden="true" data-depth="' + l.depth + '">' +
        svg(' class="desk-svg"', (i ? "" : defs()) + l.markup) + (l.anims || []).map(animSvg).join("") + "</div>";
    }).join("");
    var rain = '<div class="desk-layer desk-layer--rain" aria-hidden="true">' + DeskCity.rain(rand).map(animSvg).join("") + "</div>";
    var curtains = '<div class="desk-layer" aria-hidden="true">' + DeskRoom.curtains().map(animSvg).join("") + "</div>";
    return city + rain + curtains + svg(' class="desk-svg desk-svg--room" role="group" aria-label="Bàn làm việc"',
      DeskCity.onGlass(rand) + DeskRoom.back() + rug() + desk() + pcTower() +
      binders() + monitor() + inbox() + controller() + floppy() + me() + DeskRoom.corners());
  }

  window.DeskScene = { build: build };
})();
