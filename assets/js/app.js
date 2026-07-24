/* ============================================================
   app.js — bootstrap: theme, view switching, search, import/export
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

    // Tasks live in a local folder (File System Access API).
    Tasks.init();
    initFolder();

    // Processes need fetch — may fail on file:// (CORS). Show guidance if so.
    Processes.load()
      .then(function () {
        Processes.renderList();
        Processes.selectFirst();
      })
      .catch(function (err) {
        console.error(err);
        showProcessError();
      });
  });

  /* ---------- view switching ---------- */
  function wireNav() {
    var items = document.querySelectorAll(".nav__item");
    items.forEach(function (btn) {
      btn.addEventListener("click", function () {
        items.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var view = btn.getAttribute("data-view");
        document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("is-active"); });
        document.getElementById("view-" + view).classList.add("is-active");
      });
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
  function wireDataButtons() {
    document.getElementById("btn-export").addEventListener("click", function () {
      Store.exportTasks(Tasks.getAll());
      UI.toast("Đã export file JSON.");
    });

    var fileInput = document.getElementById("import-file");
    document.getElementById("btn-import").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          if (!Tasks.isConnected()) { UI.toast("Hãy chọn thư mục lưu trước khi import."); fileInput.value = ""; return; }
          var tasks = Store.parseImport(String(reader.result));
          if (!window.confirm("Import sẽ THAY THẾ toàn bộ task hiện tại bằng " + tasks.length +
            " task từ file (ghi vào thư mục đang chọn). Tiếp tục?")) { fileInput.value = ""; return; }
          Tasks.replaceAll(tasks);
          UI.toast("Đã import " + tasks.length + " task.");
        } catch (e) {
          UI.toast("Import lỗi: " + e.message);
        }
        fileInput.value = "";
      };
      reader.readAsText(file);
    });
  }

  /* ---------- theme ---------- */
  function wireTheme() {
    document.getElementById("btn-theme").addEventListener("click", Store.toggleTheme);
  }

  /* ---------- storage via server.js (API) ---------- */
  function initFolder() {
    ApiStore.info()
      .then(function (info) {
        return ApiStore.loadAll().then(function (tasks) {
          Tasks.setConnected(true);
          Tasks.load(tasks);
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

    // inner list column, per view (processes / tasks)
    document.querySelectorAll(".list-toggle").forEach(function (btn) {
      var key = btn.getAttribute("data-list-toggle");
      var view = document.getElementById("view-" + key);
      function applyList(collapsed) {
        view.classList.toggle("is-list-collapsed", collapsed);
        btn.title = collapsed ? "Mở danh sách" : "Thu gọn danh sách";
      }
      applyList(Store.getPref("listCollapsed." + key, false));
      btn.addEventListener("click", function () {
        var next = !view.classList.contains("is-list-collapsed");
        applyList(next);
        Store.setPref("listCollapsed." + key, next);
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
