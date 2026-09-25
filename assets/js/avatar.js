/* ============================================================
   avatar.js — customisation of "me" in the gaming-mode scene:
   shirt text, shirt / hair / skin colours, glasses on/off.
   Stored as pref "avatar"; every value is validated on load AND on
   input (a hand-edited or corrupt pref falls back to the default).
   Applied without rebuilding the scene: colours → CSS vars on the
   scene host (--av-*), glasses → .no-glasses class, text →
   textContent of [data-avatar-text].
   Exposes: window.Avatar.init(host, toggleBtn)
   ============================================================ */
(function () {
  "use strict";

  var PREF_KEY = "avatar";
  var MAX_TEXT = 16;
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var DEFAULTS = { text: "WORKHUB", shirt: "#23202b", hair: "#1a1410", skin: "#e0b48f", glasses: true };
  var COLORS = [["shirt", "Màu áo"], ["hair", "Màu tóc"], ["skin", "Màu da"]];

  var host = null, panel = null, state = null;

  /** Accept only known fields with valid values; anything else → default. */
  function sanitize(raw) {
    var o = raw && typeof raw === "object" ? raw : {};
    var out = { text: typeof o.text === "string" ? o.text.slice(0, MAX_TEXT) : DEFAULTS.text,
      glasses: typeof o.glasses === "boolean" ? o.glasses : DEFAULTS.glasses };
    COLORS.forEach(function (c) { out[c[0]] = HEX.test(o[c[0]]) ? o[c[0]] : DEFAULTS[c[0]]; });
    return out;
  }

  function apply() {
    COLORS.forEach(function (c) { host.style.setProperty("--av-" + c[0], state[c[0]]); });
    host.classList.toggle("no-glasses", !state.glasses);
    host.querySelectorAll("[data-avatar-text]").forEach(function (n) { n.textContent = state.text; });
  }

  function set(next) {
    state = sanitize(next);
    Store.setPref(PREF_KEY, state);
    apply();
  }

  /* ---------- panel ---------- */
  function field(label, input) {
    return UI.el("label", { class: "av-panel__row" }, [UI.el("span", { text: label }), input]);
  }

  function buildPanel() {
    var text = UI.el("input", { class: "input", type: "text", maxlength: MAX_TEXT, value: state.text, "aria-label": "Chữ trên áo" });
    var colors = COLORS.map(function (c) {
      return UI.el("input", { type: "color", value: state[c[0]], "data-key": c[0], "aria-label": c[1] });
    });
    var glasses = UI.el("input", { type: "checkbox", checked: state.glasses ? "checked" : null });

    function read() {
      var next = { text: text.value, glasses: glasses.checked };
      colors.forEach(function (el) { next[el.getAttribute("data-key")] = el.value; });
      set(next);
    }
    function sync() {                                  // reflect state back into the inputs (after reset)
      text.value = state.text; glasses.checked = state.glasses;
      colors.forEach(function (el) { el.value = state[el.getAttribute("data-key")]; });
    }
    [text, glasses].concat(colors).forEach(function (el) { el.addEventListener("input", read); });
    glasses.addEventListener("change", read);

    var p = UI.el("div", { class: "av-panel", role: "dialog", "aria-label": "Tuỳ chỉnh nhân vật", hidden: "hidden" }, [
      UI.el("p", { class: "av-panel__title", text: "Nhân vật" }),
      field("Chữ trên áo", text),
      field(COLORS[0][1], colors[0]), field(COLORS[1][1], colors[1]), field(COLORS[2][1], colors[2]),
      field("Đeo kính", glasses),
      UI.el("div", { class: "av-panel__foot" }, [
        UI.el("button", { class: "gbar__btn", type: "button", text: "Mặc định", onclick: function () { set(DEFAULTS); sync(); } }),
        UI.el("button", { class: "gbar__btn", type: "button", text: "Xong", onclick: close }),
      ]),
    ]);
    p.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { ev.stopPropagation(); close(); }
    });
    return p;
  }

  function close() { panel.hidden = true; }

  /**
   * @param {HTMLElement} sceneHost  element holding the desk scene (gets the --av-* vars)
   * @param {HTMLElement} toggleBtn  button that opens/closes the panel (panel is placed after it)
   */
  function init(sceneHost, toggleBtn) {
    host = sceneHost;
    state = sanitize(Store.getPref(PREF_KEY, null));
    apply();
    panel = buildPanel();
    toggleBtn.insertAdjacentElement("afterend", panel);
    toggleBtn.addEventListener("click", function () { panel.hidden = !panel.hidden; });
  }

  window.Avatar = { init: init, close: function () { if (panel) close(); } };
})();
