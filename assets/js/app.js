/* ============================================================
   app.js — bootstrap: theme, view switching, UI mode (normal/gaming desk), search, import/export
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    Store.initTheme();
    wireNav();
    wireProcessSearch();
    wireTaskControls();
    wireDataButtons();
    wireTheme();
    wireCollapse();
    wireMode();

    // Tasks live in a local folder (File System Access API).
    Tasks.init();
    initFolder();

    // Processes need fetch — may fail on file:// (CORS). Show guidance if so.
    Processes.load()
      .then(function () {
        Processes.renderList();
        Processes.selectFirst();
        refreshDesk();
      })
      .catch(function (err) {
        console.error(err);
        showProcessError();
      });
  });

  /* ---------- view switching ---------- */
  // Single entry point for both the sidebar menu and the gaming-mode desk.
  function showView(name) {
    document.querySelectorAll(".nav__item").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-view") === name);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("is-active", v.id === "view-" + name);
    });
    document.getElementById("btn-desk-back").hidden = name === "desk";
    document.getElementById("btn-avatar").hidden = name !== "desk";   // the avatar only lives on the desk
    if (name === "desk") refreshDesk();
    else Avatar.close();
  }

  function wireNav() {
    document.querySelectorAll(".nav__item").forEach(function (btn) {
      btn.addEventListener("click", function () { showView(btn.getAttribute("data-view")); });
    });
  }

  /* ---------- search boxes ---------- */
  function wireProcessSearch() {
    var input = document.getElementById("proc-search");
    input.addEventListener("input", function () { Processes.onSearch(input.value); });
  }

  function wireTaskControls() {
    document.getElementById("task-search").addEventListener("input", function (e) {
      Tasks.onSearch(e.target.value);
    });
    document.getElementById("btn-new-task").addEventListener("click", function () {
      Tasks.newTask();
    });
  }

  /* ---------- export / import ---------- */
  function exportTasks() {
    Store.exportTasks(Tasks.getAll());
    UI.toast("Đã export file JSON.");
  }

  function openImport() { document.getElementById("import-file").click(); }

  function wireDataButtons() {
    document.getElementById("btn-export").addEventListener("click", exportTasks);

    var fileInput = document.getElementById("import-file");
    document.getElementById("btn-import").addEventListener("click", openImport);
    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          if (!Tasks.isConnected()) { UI.toast("Hãy chọn thư mục lưu trước khi import."); fileInput.value = ""; return; }
          var tasks = Store.parseImport(String(reader.result));
          UI.confirm("Import sẽ THAY THẾ toàn bộ task hiện tại bằng " + tasks.length +
            " task từ file (ghi vào thư mục đang chọn). Tiếp tục?", { okText: "Tiếp tục", danger: true })
            .then(function (ok) {
              if (ok) {
                Tasks.replaceAll(tasks);
                refreshDesk();
                UI.toast("Đã import " + tasks.length + " task.");
              }
              fileInput.value = "";
            });
        } catch (e) {
          UI.toast("Import lỗi: " + e.message);
          fileInput.value = "";
        }
      };
      reader.readAsText(file);
    });
  }

  /* ---------- theme ---------- */
  function wireTheme() {
    document.getElementById("btn-theme").addEventListener("click", Store.toggleTheme);
  }

  /* ---------- UI mode: "normal" (sidebar) | "gaming" (desk) ---------- */
  function applyMode(mode) {
    document.documentElement.setAttribute("data-mode", mode);
    showView(mode === "gaming" ? "desk" : "processes");
  }

  function toggleMode() {
    var next = document.documentElement.getAttribute("data-mode") === "gaming" ? "normal" : "gaming";
    Store.setPref("uiMode", next);
    applyMode(next);
  }

  function isGaming() { return document.documentElement.getAttribute("data-mode") === "gaming"; }

  function refreshDesk() {
    var tasks = Tasks.getAll();
    Desk.update({
      tasks: tasks.length,
      open: tasks.filter(function (t) { return t.status !== "Done"; }).length,
      processes: Processes.getList().length,
    });
  }

  function wireMode() {
    Desk.init(document.getElementById("desk-scene"), {
      tasks: function () { showView("tasks"); },
      processes: function () { showView("processes"); },
      export: exportTasks,
      import: openImport,
      mode: toggleMode,
    });
    Avatar.init(document.getElementById("desk-scene"), document.getElementById("btn-avatar"));
    document.getElementById("btn-mode").addEventListener("click", toggleMode);
    document.getElementById("btn-mode-g").addEventListener("click", toggleMode);
    document.getElementById("btn-desk-back").addEventListener("click", function () { showView("desk"); });

    // Esc → back to the desk, unless a modal is open or the user is typing/editing.
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape" || !isGaming()) return;
      if (!document.getElementById("modal-root").hidden) return;
      var t = ev.target;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      showView("desk");
    });

    applyMode(Store.getPref("uiMode", "normal") === "gaming" ? "gaming" : "normal");
  }

  /* ---------- storage via server.js (API) ---------- */
  function initFolder() {
    ApiStore.info()
      .then(function (info) {
        return ApiStore.loadAll().then(function (tasks) {
          Tasks.setConnected(true);
          Tasks.load(tasks);
          refreshDesk();
          renderFsBar({ ok: true, path: info.path });
        });
      })
      .catch(function () {
        Tasks.setConnected(false);
        renderFsBar({ ok: false });
      });
  }

  function renderFsBar(r) {
    var bar = document.getElementById("fs-bar");
    var statusEl = document.getElementById("fs-status");
    var actionsEl = document.getElementById("fs-actions");
    actionsEl.innerHTML = "";
    bar.classList.remove("fs-bar--warn", "fs-bar--ok");

    if (r.ok) {
      bar.classList.add("fs-bar--ok");
      statusEl.innerHTML = "✔ Đang lưu vào: <span class=\"fs-bar__path\">" + UI.esc(r.path) + "</span>";
      return;
    }
    bar.classList.add("fs-bar--warn");
    statusEl.innerHTML = "⚠ Chưa kết nối server lưu trữ. Chạy <strong>node server.js</strong> rồi tải lại trang.";
    actionsEl.appendChild(UI.el("button", {
      class: "btn btn--sm", type: "button", text: "Thử lại",
      onclick: function () { initFolder(); },
    }));
  }

  /* ---------- collapse: sidebar + per-view list column ---------- */
  function wireCollapse() {
    // outer sidebar
    var shell = document.querySelector(".app-shell");
    var navBtn = document.getElementById("btn-nav-toggle");
    function applyNav(collapsed) {
      shell.classList.toggle("is-nav-collapsed", collapsed);
      navBtn.textContent = collapsed ? "»" : "«";
      navBtn.title = collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar";
    }
    applyNav(Store.getPref("navCollapsed", false));
    navBtn.addEventListener("click", function () {
      var next = !shell.classList.contains("is-nav-collapsed");
      applyNav(next);
      Store.setPref("navCollapsed", next);
    });

    // per view (processes / tasks): list column, and the page header
    wireViewToggle("data-list-toggle", "is-list-collapsed", "listCollapsed", ["Thu gọn danh sách", "Mở danh sách"]);
    wireViewToggle("data-head-toggle", "is-head-collapsed", "headCollapsed", ["Thu gọn tiêu đề", "Mở tiêu đề"]);
  }

  /**
   * Buttons [attr="<view>"] toggle `cls` on #view-<view>; state persisted as pref "<pref>.<view>".
   * @param {string[]} titles  [title when expanded, title when collapsed]
   */
  function wireViewToggle(attr, cls, pref, titles) {
    document.querySelectorAll("[" + attr + "]").forEach(function (btn) {
      var key = btn.getAttribute(attr);
      var view = document.getElementById("view-" + key);
      function apply(collapsed) {
        view.classList.toggle(cls, collapsed);
        btn.title = collapsed ? titles[1] : titles[0];
        btn.setAttribute("aria-label", btn.title);
        btn.setAttribute("aria-expanded", String(!collapsed));
      }
      apply(Store.getPref(pref + "." + key, false));
      btn.addEventListener("click", function () {
        var next = !view.classList.contains(cls);
        apply(next);
        Store.setPref(pref + "." + key, next);
      });
    });
  }

  /* ---------- process load error (file:// / CORS) ---------- */
  function showProcessError() {
    var host = document.getElementById("proc-detail");
    host.innerHTML = "";
    host.appendChild(UI.el("div", { class: "banner", html:
      "<strong>Không tải được file quy trình.</strong><br>" +
      "Trình duyệt chặn <code>fetch</code> khi mở trực tiếp bằng <code>file://</code>. " +
      "Hãy chạy qua một static server rồi mở lại:" }));
    host.appendChild(UI.el("pre", { class: "subcard", style: "font-family:var(--mono);white-space:pre-wrap",
      text: "# tại thư mục d:/PhatNT/Claude (cần Node đã cài):\nnode server.js\n# rồi mở http://localhost:8080\n\n# (server.js vừa phục vụ web vừa lưu task vào ./tasks)" }));
    document.getElementById("proc-list").innerHTML =
      '<li class="empty">Cần chạy qua local server.</li>';
  }
})();
