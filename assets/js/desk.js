/* ============================================================
   desk.js — gaming-mode landing: the gaming-room desk whose objects
   are the navigation (monitor → tasks, binders → processes, …).
   Markup comes from DeskScene (desk-scene.js). Owns no app logic:
   every object calls a handler passed in by app.js.
   Also drives the city parallax: each city layer is its own <svg>
   ([data-depth] = max shift in scene units) moved with translate3d,
   so the GPU composites it and nothing is repainted. rAF loop with
   time-based easing (same smoothness at 60 Hz and 144 Hz); idle when still.
   Exposes: window.Desk
   ============================================================ */
(function () {
  "use strict";

  var EASE_PER_FRAME = 0.08;      // fraction of the remaining distance per 60 Hz frame
  var FRAME_MS = 1000 / 60;
  // Wider than this → scene covers the screen (edges cropped, objects are laid out
  // inside the safe centre); narrower (portrait) → whole scene shown, letterboxed.
  var COVER_MIN_ASPECT = 1.5;

  var host = null;
  var unitPx = 1;                 // screen px per scene unit, kept current by fit()

  /**
   * @param {HTMLElement} el   container for the scene
   * @param {Object<string, function>} handlers  keyed by data-action
   */
  function init(el, handlers) {
    host = el;
    host.innerHTML = DeskScene.build();
    host.querySelectorAll(".desk-item").forEach(function (item) {
      var fn = handlers[item.getAttribute("data-action")];
      item.addEventListener("click", function () { fn(); });
      item.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); fn(); }
      });
    });
    wireFit();
    wireParallax();
  }

  function wireFit() {
    var svgs = host.querySelectorAll("svg");
    function fit() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;                         // desk hidden
      var cover = w / h >= COVER_MIN_ASPECT;
      var sx = w / DeskSvg.VIEW.w, sy = h / DeskSvg.VIEW.h;
      unitPx = cover ? Math.max(sx, sy) : Math.min(sx, sy);
      host.style.setProperty("--u", unitPx.toFixed(4) + "px");   // for the CSS loop distances
      host.classList.toggle("is-letterbox", !cover);
      svgs.forEach(function (s) { s.setAttribute("preserveAspectRatio", cover ? "xMidYMid slice" : "xMidYMid meet"); });
    }
    new ResizeObserver(fit).observe(host);
  }

  function wireParallax() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    var layers = Array.prototype.map.call(host.querySelectorAll("[data-depth]"), function (el) {
      return { el: el, depth: Number(el.getAttribute("data-depth")) };
    });
    var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0, last = 0;

    function step(now) {
      var dt = last ? Math.min(now - last, 100) : FRAME_MS;
      last = now;
      var k = 1 - Math.pow(1 - EASE_PER_FRAME, dt / FRAME_MS);
      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;
      layers.forEach(function (l) {
        var px = l.depth * unitPx;
        l.el.style.transform = "translate3d(" + (-cur.x * px).toFixed(2) + "px," + (-cur.y * px * 0.5).toFixed(2) + "px,0)";
      });
      if (Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.0005) raf = requestAnimationFrame(step);
      else { raf = 0; last = 0; }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }

    host.addEventListener("pointermove", function (ev) {
      var r = host.getBoundingClientRect();
      target.x = ((ev.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((ev.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    });
    host.addEventListener("pointerleave", function () { target.x = 0; target.y = 0; kick(); });
  }

  /** @param {{tasks:number, open:number, processes:number}} counts */
  function update(counts) {
    if (!host) return;
    host.querySelectorAll("[data-count]").forEach(function (node) {
      var v = counts[node.getAttribute("data-count")];
      node.textContent = v == null ? "–" : String(v);
    });
  }

  window.Desk = { init: init, update: update };
})();
