/* ============================================================
   storage.js — localStorage persistence + export/import + helpers
   Exposes: window.Store, window.UI
   ============================================================ */
(function () {
  "use strict";

  var THEME_KEY = "workhub.theme";

  /* ---------- backup export (task data sống trong ./tasks qua ApiStore) ---------- */
  function exportTasks(tasks) {
    var payload = {
      app: "WorkHub",
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: tasks,
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "workhub-tasks-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseImport(text) {
    var data = JSON.parse(text);
    var tasks = Array.isArray(data) ? data : data && data.tasks;
    if (!Array.isArray(tasks)) throw new Error("File không đúng định dạng WorkHub.");
    return tasks;
  }

  /* ---------- theme ---------- */
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme");
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
  }

  /* ---------- UI preferences (collapse states, etc.) ---------- */
  function getPref(key, def) {
    try {
      var v = localStorage.getItem("workhub.pref." + key);
      return v == null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  }

  function setPref(key, val) {
    try {
      localStorage.setItem("workhub.pref." + key, JSON.stringify(val));
    } catch (e) {
      /* non-critical */
    }
  }

  /* ---------- small helpers ---------- */
  function uid() {
    return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Escape then turn bare URLs into safe links (used for entry bodies).
  function escWithLinks(str) {
    var safe = esc(str);
    return safe.replace(/(https?:\/\/[^\s<]+)/g, function (m) {
      return '<a href="' + m + '" target="_blank" rel="noopener noreferrer">' + m + "</a>";
    });
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  /* ---------- tiny UI utilities ---------- */
  var toastTimer;
  var UI = {
    el: function (tag, attrs, children) {
      var node = document.createElement(tag);
      if (attrs) {
        Object.keys(attrs).forEach(function (k) {
          if (k === "class") node.className = attrs[k];
          else if (k === "html") node.innerHTML = attrs[k];
          else if (k === "text") node.textContent = attrs[k];
          else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") {
            node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
          } else if (attrs[k] != null && attrs[k] !== false) {
            node.setAttribute(k, attrs[k]);
          }
        });
      }
      (children || []).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
      return node;
    },
    toast: function (msg) {
      var t = document.getElementById("toast");
      t.textContent = msg;
      t.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
    },
    esc: esc,
    escWithLinks: escWithLinks,
    fmtDate: fmtDate,
  };

  window.Store = {
    exportTasks: exportTasks,
    parseImport: parseImport,
    initTheme: initTheme,
    toggleTheme: toggleTheme,
    getPref: getPref,
    setPref: setPref,
    uid: uid,
  };
  window.UI = UI;
})();
