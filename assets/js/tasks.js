/* ============================================================
   tasks.js — task/feature CRUD, detail tabs, entries
   Lưu trữ: ApiStore (server.js -> ./tasks). Ghi bất đồng bộ, optimistic.
   Exposes: window.Tasks
   ============================================================ */
(function () {
  "use strict";

  var el = UI.el;
  var state = { tasks: [], activeId: null, activeTab: "overview", filter: "", connected: false };

  var PRIORITIES = ["Low", "Medium", "High", "Critical"];
  var STATUSES = ["Open", "In Progress", "Blocked", "Done"];
  var TYPES = ["Feature", "Bug", "Hotfix", "Support"];
  var SOURCES = ["Excel workboard plan", "ADO"];
  var DEFAULT_TASK_ID = "Undefined";
  var STATUS_BADGE = { "Open": "", "In Progress": "badge--accent", "Blocked": "badge--warn", "Done": "badge--ok" };
  var PRIO_BADGE = { "Low": "", "Medium": "badge--accent", "High": "badge--warn", "Critical": "badge--danger" };

  var TABS = [
    { id: "overview", label: "Tổng quan" },
    { id: "brs", label: "BRS/DD", coll: "brs" },
    { id: "notes", label: "Notes", count: function (t) { return Brs.stats(t).timeline; } },
    { id: "todos", label: "TODO", coll: "todos" },
    { id: "documents", label: "Tài liệu", coll: "documents" },
    { id: "integrations", label: "Tích hợp", coll: "integrations" },
    { id: "mails", label: "Mail", coll: "mails" },
    { id: "golive", label: "Ghi chú golive", coll: "golive" },
  ];

  // Integration 3rd-party (API / stored procedure).
  var INTEG_KINDS = ["API", "Stored Procedure", "Webhook", "File", "Khác"];
  var INTEG_STATUS = ["Chờ bàn giao", "Đã bàn giao", "Đang test", "Cần sửa", "Đã nghiệm thu"];
  var INTEG_RESULT = ["Đạt", "Một phần", "Lỗi"];
  var RESULT_BADGE = { "Đạt": "badge--ok", "Một phần": "badge--warn", "Lỗi": "badge--danger" };

  // 2 loại TODO: việc dự kiến khi nhận task vs việc phát sinh trong lúc làm.
  var TODO_GROUPS = [
    { kind: "initial", label: "📋 Công việc cơ bản", placeholder: "Việc cần làm khi nhận task…" },
    { kind: "adhoc", label: "➕ Phát sinh (yêu cầu mới, BA đổi tài liệu…)", placeholder: "Việc phát sinh trong lúc làm…" },
  ];
  // 2 nhóm tài liệu theo nguồn.
  var DOC_GROUPS = [
    { owner: "ba", label: "📥 Tài liệu từ BA / Lead" },
    { owner: "mine", label: "🛠 Tài liệu cá nhân" },
  ];

  /* ---------- lifecycle ---------- */
  function init() {
    renderList();
    renderDetail();
  }

  function current() {
    return state.tasks.filter(function (t) { return t.id === state.activeId; })[0] || null;
  }

  // Di trú task cũ: activities -> todos (kind=initial), đảm bảo có mảng golive.
  function migrate(t) {
    if (t.activities && !t.todos) {
      t.todos = t.activities.map(function (a) {
        return { id: a.id || Store.uid(), time: a.time, text: a.text, done: false, kind: "initial" };
      });
      delete t.activities;
    }
    if (!t.todos) t.todos = [];
    if (!t.golive) t.golive = [];
    if (!t.integrations) t.integrations = [];
    Sheet.migrate(t);
    return Brs.migrate(t);
  }

  // Task Feature mà bug đang link tới (null nếu không có / đã bị xóa).
  function parentFeature(t) {
    if (!t.parentTaskId) return null;
    return state.tasks.filter(function (x) { return x.id === t.parentTaskId; })[0] || null;
  }

  // Ghi task đang thao tác ra thư mục (bất đồng bộ, không chặn UI).
  function saveTask(task) {
    if (!task || !state.connected) return;
    ApiStore.saveTask(task).catch(function (e) {
      UI.toast("Lưu ra thư mục lỗi: " + e.message);
    });
  }

  // Vẽ lại nhưng GIỮ NGUYÊN vị trí cuộn — sửa inline không bị giật về đầu trang.
  // (renderDetail luôn kết thúc bằng scrollTop = 0, đúng khi đổi task/tab, sai khi chỉ sửa 1 ô.)
  function rerenderDetail() {
    var detail = document.getElementById("task-detail");
    var list = document.getElementById("task-list");
    var detailY = detail ? detail.scrollTop : 0;
    var listY = list ? list.scrollTop : 0;
    renderList();
    renderDetail();
    if (detail) detail.scrollTop = detailY;
    if (list) list.scrollTop = listY;
  }

  function refreshAfterMutation() {
    var t = current();
    if (t) t.updatedAt = new Date().toISOString();
    rerenderDetail();
    saveTask(t);
  }

  /* ---------- list ---------- */
  function renderList() {
    var ul = document.getElementById("task-list");
    ul.innerHTML = "";
    if (!state.connected) {
      ul.appendChild(el("li", { class: "empty",
        html: "Chưa kết nối server lưu trữ.<br>Chạy <strong>node server.js</strong> rồi tải lại." }));
      return;
    }
    var q = state.filter.trim().toLowerCase();
    var shown = state.tasks.filter(function (t) {
      if (!q) return true;
      return ((t.title || "") + " " + (t.taskId || "") + " " + (t.status || "")).toLowerCase().indexOf(q) >= 0;
    });
    if (!state.tasks.length) {
      ul.appendChild(el("li", { class: "empty", html: "Chưa có task nào.<br>Bấm <strong>+ Task mới</strong>." }));
      return;
    }
    if (!shown.length) {
      ul.appendChild(el("li", { class: "empty", text: "Không tìm thấy task." }));
      return;
    }
    shown.sort(function (a, b) { return (b.updatedAt || "").localeCompare(a.updatedAt || ""); });
    shown.forEach(function (t) { ul.appendChild(taskListItem(t)); });
  }

  function taskListItem(t) {
    var pct = Pipeline.percent(t);
    return el("li", {
      class: "task-item" + (t.id === state.activeId ? " is-active" : ""),
      onclick: function () { selectTask(t.id); },
    }, [
      el("div", { class: "task-item__top" }, [
        el("span", { class: "task-item__title", text: t.title || "(chưa có tên)" }),
        el("span", { class: "badge " + (STATUS_BADGE[t.status] || ""), text: t.status || "Open" }),
      ]),
      el("div", { class: "task-item__meta" }, [
        t.taskId ? el("span", { class: "task-item__id", text: t.taskId }) : null,
        el("span", { class: "badge " + (PRIO_BADGE[t.priority] || ""), text: t.priority || "Medium" }),
        t.type ? el("span", { class: "badge", text: t.type }) : null,
        (t.brs || []).length ? null : el("span", { class: "badge badge--warn", title: "Task chưa gắn tài liệu BRS/DD", text: "⚠ BRS/DD" }),
      ]),
      el("div", { class: "progress", title: "Tiến độ " + pct + "%" }, [
        el("div", { class: "progress__bar", style: "width:" + pct + "%" }),
      ]),
    ]);
  }

  function selectTask(id) {
    state.activeId = id;
    state.activeTab = "overview";
    renderList();
    renderDetail();
  }

  /* ---------- detail ---------- */
  function renderDetail() {
    var host = document.getElementById("task-detail");
    host.innerHTML = "";
    if (!state.connected) {
      host.appendChild(el("p", { class: "empty", text: "Server lưu trữ chưa sẵn sàng — chạy node server.js." }));
      return;
    }
    var t = current();
    if (!t) { host.appendChild(el("p", { class: "empty", text: "Chọn một task, hoặc tạo task mới." })); return; }

    host.appendChild(detailHead(t));
    host.appendChild(Pipeline.render(t, function (newIdx) {
      t.stage = newIdx;
      refreshAfterMutation();
    }));
    host.appendChild(el("p", { class: "muted", style: "margin:-4px 0 14px",
      text: "Giai đoạn: " + Pipeline.stageName(t) }));
    host.appendChild(tabBar(t));
    host.appendChild(tabPanel(t));
    host.scrollTop = 0;
  }

  function detailHead(t) {
    return el("div", { class: "task-detail__head" }, [
      el("div", {}, [
        el("h2", { class: "task-detail__title", text: t.title || "(chưa có tên)" }),
        el("div", { class: "detail-meta" }, [
          t.taskId ? el("span", { class: "badge", text: t.taskId }) : null,
          el("span", { class: "badge " + (STATUS_BADGE[t.status] || ""), text: t.status || "Open" }),
          el("span", { class: "badge " + (PRIO_BADGE[t.priority] || ""), text: t.priority || "Medium" }),
          t.type ? el("span", { class: "badge", text: t.type }) : null,
          t.source ? el("span", { class: "badge", text: t.source }) : null,
          t.sheet ? el("span", { class: "badge", title: "Sheet trong workboard plan", text: "📄 " + t.sheet }) : null,
          featureLinkBadge(t),
          (t.brs || []).length ? null : el("span", { class: "badge badge--warn", text: "⚠ Chưa gắn BRS/DD" }),
          pendingChangeBadge(t),
        ]),
      ]),
      el("div", { class: "task-detail__actions" }, [
        el("button", { class: "btn btn--sm", type: "button", onclick: function () { openModal(t); }, text: "Sửa" }),
        el("button", { class: "btn btn--sm btn--danger", type: "button",
          onclick: function () { removeTask(t); }, text: "Xóa" }),
      ]),
    ]);
  }

  // Cảnh báo thay đổi chưa vào BRS/DD và chưa có quyết định Lead.
  function pendingChangeBadge(t) {
    var n = Brs.stats(t).pending;
    if (!n) return null;
    return el("span", {
      class: "badge badge--danger", title: "Cần BA cập nhật BRS/DD hoặc xin quyết định Lead trước khi làm",
      text: "⚠ " + n + " thay đổi chưa vào BRS/DD",
    });
  }

  // Badge "↗ Feature cha" cho task Bug — bấm để mở feature liên quan.
  function featureLinkBadge(t) {
    if (!t.parentTaskId) return null;
    var p = parentFeature(t);
    if (!p) return el("span", { class: "badge badge--warn", text: "⚠ Feature cha không còn" });
    return el("button", {
      class: "badge badge--accent link-badge", type: "button", title: "Mở Feature cha",
      text: "↗ " + (p.taskId ? p.taskId + " · " : "") + (p.title || "(chưa có tên)"),
      onclick: function () { selectTask(p.id); },
    });
  }

  function tabBar(t) {
    var bar = el("div", { class: "tabs" });
    TABS.forEach(function (tab) {
      var count = tab.count ? tab.count(t) : (tab.coll ? (t[tab.coll] || []).length : null);
      var children = [document.createTextNode(tab.label)];
      if (count !== null) children.push(el("span", { class: "count", text: String(count) }));
      bar.appendChild(el("button", {
        class: "tab" + (state.activeTab === tab.id ? " is-active" : ""),
        type: "button",
        onclick: function () { state.activeTab = tab.id; renderDetail(); },
      }, children));
    });
    return bar;
  }

  // Context truyền sang brs.js / sheet.js — dùng lại helper của file này.
  function panelCtx() {
    return {
      refresh: refreshAfterMutation, entryCard: entryCard,
      fileRow: fileRow, fileOpenBtn: fileOpenBtn, select: select,
      today: todayStr, dayDiff: dayDiff, statuses: STATUSES,
      rerender: rerenderDetail,
    };
  }

  function tabPanel(t) {
    switch (state.activeTab) {
      case "overview": return overviewPanel(t);
      case "brs": return Brs.brsPanel(t, panelCtx());
      case "notes": return Brs.notesPanel(t, panelCtx());
      case "todos": return todosPanel(t);
      case "documents": return documentsPanel(t);
      case "integrations": return integrationsPanel(t);
      case "mails": return mailsPanel(t);
      case "golive": return collectionPanel(t, "golive");
      default: return el("div");
    }
  }

  /* ---------- overview ---------- */
  function overviewPanel(t) {
    var panel = el("div", { class: "tab-panel is-active" });
    var todos = t.todos || [];
    var doneCount = todos.filter(function (x) { return x.done; }).length;
    var docs = t.documents || [];
    var docBa = docs.filter(function (d) { return d.owner !== "mine"; }).length;
    var docMine = docs.filter(function (d) { return d.owner === "mine"; }).length;
    var integs = t.integrations || [];
    var overdue = integs.filter(isOverdue).length;
    var bs = Brs.stats(t);
    var stat = el("div", { class: "detail-meta", style: "margin-bottom:16px" }, [
      el("span", { class: "badge badge--accent doc-count",
        html: "TODO: <strong>" + doneCount + "/" + todos.length + "</strong>" }),
      el("span", { class: "badge " + (bs.docCount ? "" : "badge--warn"),
        text: bs.docCount ? "DD: " + bs.ddCount + " · BRS: " + bs.brsCount : "⚠ Chưa gắn BRS/DD" }),
      el("span", { class: "badge " + (bs.total ? "badge--warn" : ""),
        text: "Thay đổi: BRS " + bs.viaBrs + " · DD " + bs.viaDd + " · ngoài tài liệu " + bs.adhoc }),
      pendingChangeBadge(t),
      el("span", { class: "badge", text: "Tài liệu: " + docBa + " BA/Lead · " + docMine + " cá nhân" }),
      el("span", { class: "badge " + (overdue ? "badge--warn" : ""),
        text: "Tích hợp: " + integs.length + (overdue ? " · trễ " + overdue : "") }),
      el("span", { class: "badge", text: "Note: " + (t.notes || []).length }),
      el("span", { class: "badge", text: "Mail: " + (t.mails || []).length }),
      el("span", { class: "badge", text: "Golive: " + (t.golive || []).length }),
    ]);
    panel.appendChild(stat);

    var src = sourceSection(t);
    if (src) panel.appendChild(src);
    panel.appendChild(descSection(t));
    var sheetSec = Sheet.section(t, panelCtx());
    if (sheetSec) panel.appendChild(sheetSec);

    var created = el("dl", { class: "kv" }, [
      el("dt", { text: "Tạo lúc" }), el("dd", { text: UI.fmtDate(t.createdAt) || "—" }),
      el("dt", { text: "Cập nhật" }), el("dd", { text: UI.fmtDate(t.updatedAt) || "—" }),
    ]);
    panel.appendChild(el("div", { class: "section" }, [el("h3", { text: "Thời gian" }), created]));
    return panel;
  }

  // Nguồn nhận task: Feature (workboard plan của Lead) hoặc Bug (link Feature cha).
  function sourceSection(t) {
    var rows = [];
    if (t.sheet) rows.push(el("dt", { text: "Sheet" }), el("dd", { text: t.sheet }));
    if (t.source) rows.push(el("dt", { text: "Nguồn" }), el("dd", { text: t.source }));
    if (t.parentTaskId) {
      rows.push(el("dt", { text: "Feature cha" }), el("dd", {}, [featureLinkBadge(t)]));
    }
    if (!rows.length) return null;
    return el("div", { class: "section" }, [
      el("h3", { text: "Nguồn task" }), el("dl", { class: "kv" }, rows),
    ]);
  }

  // Mô tả / AC: tiêu đề + nút Sửa cùng hàng trong khối, thân khối rộng bên dưới.
  function descSection(t) {
    var acText = t.ac ? UI.escWithLinks(t.ac) : '<span class="muted">Chưa có mô tả / acceptance criteria.</span>';
    var editBtn = el("button", { class: "btn desc-card__edit", type: "button", text: "✎ Sửa", onclick: startEdit });
    var body = el("div", { class: "desc-card__body", html: acText });
    var section = el("div", { class: "section desc-card" }, [
      el("div", { class: "desc-card__head" }, [
        el("h3", { text: "Mô tả / Acceptance Criteria" }),
        editBtn,
      ]),
      body,
    ]);

    function startEdit() {
      editBtn.style.display = "none";
      var ta = el("textarea", { class: "desc-card__input", placeholder: "Mô tả / acceptance criteria" });
      ta.value = t.ac || "";
      var editor = el("div", { class: "desc-card__body" }, [
        ta,
        el("div", { class: "desc-card__actions" }, [
          el("button", { class: "btn btn--sm", type: "button", text: "Hủy", onclick: function () { renderDetail(); } }),
          el("button", {
            class: "btn btn--primary btn--sm", type: "button", text: "Lưu",
            onclick: function () {
              t.ac = ta.value.trim();
              refreshAfterMutation();
              UI.toast("Đã cập nhật mô tả.");
            },
          }),
        ]),
      ]);
      section.replaceChild(editor, body);
      ta.focus();
    }
    return section;
  }

  /* ---------- generic text collection (notes, golive) ---------- */
  var COLL_PLACEHOLDER = {
    notes: "Nội dung đã chốt / confirm trong nhóm chat…",
    golive: "Ghi chú / lưu ý khi golive (bước cần làm, rollback, người liên hệ…)",
  };
  function collectionPanel(t, coll) {
    var panel = el("div", { class: "tab-panel is-active" });
    var placeholder = COLL_PLACEHOLDER[coll] || "Nội dung…";

    var ta = el("textarea", { placeholder: placeholder });
    panel.appendChild(el("div", { class: "add-row" }, [
      ta,
      el("div", { class: "right" }, [
        el("button", {
          class: "btn btn--primary btn--sm", type: "button", text: "+ Thêm",
          onclick: function () {
            var v = ta.value.trim();
            if (!v) return;
            (t[coll] = t[coll] || []).unshift({ id: Store.uid(), time: new Date().toISOString(), text: v });
            refreshAfterMutation();
          },
        }),
      ]),
    ]));

    var items = t[coll] || [];
    if (!items.length) {
      panel.appendChild(el("p", { class: "muted", text: "Chưa có mục nào." }));
      return panel;
    }
    items.forEach(function (e) {
      panel.appendChild(entryCard(t, coll, e, el("div", { class: "entry__body", html: UI.escWithLinks(e.text) })));
    });
    return panel;
  }

  /* ---------- TODO (2 nhóm: khi nhận task / phát sinh) ---------- */
  function todosPanel(t) {
    var panel = el("div", { class: "tab-panel is-active" });
    var all = t.todos || [];
    TODO_GROUPS.forEach(function (g) {
      var items = all.filter(function (x) { return (x.kind || "initial") === g.kind; });
      var done = items.filter(function (x) { return x.done; }).length;
      panel.appendChild(el("div", { class: "subsection__head" }, [
        el("h3", { text: g.label }),
        el("span", { class: "subsection__count", text: done + "/" + items.length }),
      ]));

      var ta = el("textarea", { placeholder: g.placeholder });
      panel.appendChild(el("div", { class: "add-row" }, [
        ta,
        el("div", { class: "right" }, [
          el("button", {
            class: "btn btn--primary btn--sm", type: "button", text: "+ Thêm việc",
            onclick: function () {
              var v = ta.value.trim();
              if (!v) return;
              (t.todos = t.todos || []).push({
                id: Store.uid(), time: new Date().toISOString(), text: v, done: false, kind: g.kind,
              });
              refreshAfterMutation();
            },
          }),
        ]),
      ]));

      if (!items.length) {
        panel.appendChild(el("p", { class: "muted", style: "margin-bottom:18px", text: "Chưa có việc nào." }));
      } else {
        items.forEach(function (item) { panel.appendChild(todoItem(t, item)); });
      }
    });
    return panel;
  }

  function todoItem(t, item) {
    var cb = el("input", { type: "checkbox", class: "todo-check" });
    if (item.done) cb.checked = true;
    cb.addEventListener("change", function () {
      item.done = cb.checked;
      refreshAfterMutation();
    });
    return el("div", { class: "todo-item" + (item.done ? " is-done" : "") }, [
      cb,
      el("div", { class: "todo-item__body" }, [
        el("div", { class: "todo-item__text", html: UI.escWithLinks(item.text) }),
        el("div", { class: "entry__time", text: UI.fmtDate(item.time) }),
      ]),
      el("button", {
        class: "entry__del", type: "button", title: "Xóa", text: "✕",
        onclick: function () {
          t.todos = (t.todos || []).filter(function (x) { return x.id !== item.id; });
          refreshAfterMutation();
        },
      }),
    ]);
  }

  /* ---------- documents (2 nhóm theo nguồn) ---------- */
  function documentsPanel(t) {
    var panel = el("div", { class: "tab-panel is-active" });
    var docs = t.documents || [];
    DOC_GROUPS.forEach(function (g) {
      var items = docs.filter(function (d) {
        return (d.owner || "ba") === g.owner;
      });
      panel.appendChild(el("div", { class: "subsection__head" }, [
        el("h3", { text: g.label }),
        el("span", { class: "subsection__count", text: String(items.length) }),
      ]));

      var name = el("input", { class: "input", placeholder: "Tên tài liệu" });
      var url = el("input", { class: "input", placeholder: "Link / đường dẫn (tùy chọn)" });
      var file = el("input", { type: "file", class: "file-input" });
      panel.appendChild(el("div", { class: "add-row" }, [
        name,
        url,
        fileRow("Đính file (tùy chọn):", file),
        el("div", { class: "right" }, [
          el("button", {
            class: "btn btn--primary btn--sm", type: "button", text: "+ Thêm tài liệu",
            onclick: function () {
              var n = name.value.trim();
              var fl = file.files[0];
              if (!n && !fl) return;
              var entry = {
                id: Store.uid(), time: new Date().toISOString(),
                name: n || (fl && fl.name), url: url.value.trim(), owner: g.owner,
              };
              addEntryWithFile(t, "documents", entry, fl);
            },
          }),
        ]),
      ]));

      if (!items.length) {
        panel.appendChild(el("p", { class: "muted", style: "margin-bottom:18px", text: "Chưa có tài liệu nào." }));
      } else {
        items.forEach(function (d) {
          var body = el("div", { class: "entry__body" }, [
            d.url
              ? el("a", { href: d.url, target: "_blank", rel: "noopener noreferrer", text: d.name })
              : document.createTextNode(d.name),
          ]);
          if (d.file) body.appendChild(fileOpenBtn(t, d.file));
          panel.appendChild(entryCard(t, "documents", d, body));
        });
      }
    });
    return panel;
  }

  /* ---------- mails (subject/from/date/body + optional file) ---------- */
  function mailsPanel(t) {
    var panel = el("div", { class: "tab-panel is-active" });
    var subject = el("input", { class: "input", placeholder: "Subject" });
    var from = el("input", { class: "input", placeholder: "From (người gửi)" });
    var date = el("input", { class: "input", type: "date" });
    var body = el("textarea", { placeholder: "Nội dung / tóm tắt email…" });
    var file = el("input", { type: "file", class: "file-input" });

    panel.appendChild(el("div", { class: "add-row" }, [
      subject,
      el("div", { class: "grid2" }, [from, date]),
      body,
      fileRow("Đính file (.eml, .msg, ảnh…):", file),
      el("div", { class: "right" }, [
        el("button", {
          class: "btn btn--primary btn--sm", type: "button", text: "+ Đính mail",
          onclick: function () {
            var s = subject.value.trim();
            var f = file.files[0];
            if (!s && !body.value.trim() && !f) return;
            var entry = {
              id: Store.uid(), time: new Date().toISOString(),
              subject: s, from: from.value.trim(), date: date.value, body: body.value.trim(),
            };
            addEntryWithFile(t, "mails", entry, f);
          },
        }),
      ]),
    ]));

    var mails = t.mails || [];
    if (!mails.length) { panel.appendChild(el("p", { class: "muted", text: "Chưa đính mail nào." })); return panel; }
    mails.forEach(function (m) {
      var inner = el("div", {}, [
        el("div", { class: "subcard__title", text: m.subject || "(no subject)" }),
        el("dl", { class: "kv" }, [
          m.from ? el("dt", { text: "From" }) : null, m.from ? el("dd", { text: m.from }) : null,
          m.date ? el("dt", { text: "Ngày" }) : null, m.date ? el("dd", { text: m.date }) : null,
        ]),
        m.body ? el("div", { class: "entry__body", style: "margin-top:6px", html: UI.escWithLinks(m.body) }) : null,
      ]);
      if (m.file) inner.appendChild(fileOpenBtn(t, m.file));
      panel.appendChild(entryCard(t, "mails", m, inner));
    });
    return panel;
  }

  /* ---------- integrations 3rd-party ---------- */
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function latestHandoverDate(ig) {
    var hs = ig.handovers || [];
    if (!hs.length) return null;
    var max = hs.reduce(function (a, b) { return (a.time || "") > (b.time || "") ? a : b; });
    return (max.time || "").slice(0, 10);
  }
  function dayDiff(a, b) {
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  }
  function isOverdue(ig) {
    if (!ig.expectedAt || ig.status === "Đã nghiệm thu") return false;
    return dayDiff(ig.expectedAt, latestHandoverDate(ig) || todayStr()) > 0;
  }
  function deliverySummary(ig) {
    var delivered = latestHandoverDate(ig);
    var s = "Hẹn: <strong>" + (ig.expectedAt || "—") + "</strong> · Bàn giao: <strong>" +
      (delivered || "chưa") + "</strong>";
    if (ig.expectedAt && delivered) {
      var d = dayDiff(ig.expectedAt, delivered);
      s += d > 0 ? ' <span class="late">trễ ' + d + ' ngày</span>' : ' <span class="ontime">đúng hạn</span>';
    } else if (ig.expectedAt && !delivered) {
      var od = dayDiff(ig.expectedAt, todayStr());
      if (od > 0) s += ' <span class="late">quá hạn ' + od + ' ngày</span>';
    }
    return s;
  }

  function labeledField(text, node) {
    return el("label", { class: "file-row file-row--inline" }, [
      el("span", { class: "file-row__label", text: text }), node,
    ]);
  }

  function integrationsPanel(t) {
    var panel = el("div", { class: "tab-panel is-active" });
    var name = el("input", { class: "input", placeholder: "Tên API / stored procedure" });
    var kind = select(INTEG_KINDS, "API");
    var provider = el("input", { class: "input", placeholder: "Bên thứ 3 (VD: Core T24)" });
    var expected = el("input", { class: "input", type: "date" });
    var status = select(INTEG_STATUS, "Chờ bàn giao");

    panel.appendChild(el("div", { class: "add-row" }, [
      name,
      el("div", { class: "grid2" }, [provider, kind]),
      el("div", { class: "grid2" }, [labeledField("Hẹn bàn giao", expected), labeledField("Trạng thái", status)]),
      el("div", { class: "right" }, [
        el("button", {
          class: "btn btn--primary btn--sm", type: "button", text: "+ Thêm integration",
          onclick: function () {
            var n = name.value.trim();
            if (!n) return;
            (t.integrations = t.integrations || []).unshift({
              id: Store.uid(), time: new Date().toISOString(), name: n, kind: kind.value,
              provider: provider.value.trim(), status: status.value, expectedAt: expected.value,
              note: "", handovers: [],
            });
            refreshAfterMutation();
          },
        }),
      ]),
    ]));

    var list = t.integrations || [];
    if (!list.length) { panel.appendChild(el("p", { class: "muted", text: "Chưa có tích hợp nào." })); return panel; }
    list.forEach(function (ig) { panel.appendChild(integrationCard(t, ig)); });
    return panel;
  }

  function integrationCard(t, ig) {
    var card = el("div", { class: "integ-card" });

    card.appendChild(el("div", { class: "integ-card__head" }, [
      el("div", { class: "integ-card__title" }, [
        el("span", { text: ig.name }),
        el("span", { class: "badge", text: ig.kind || "API" }),
        ig.provider ? el("span", { class: "badge badge--accent", text: ig.provider }) : null,
      ]),
      el("button", {
        class: "entry__del", type: "button", title: "Xóa integration", text: "✕",
        onclick: function () {
          t.integrations = (t.integrations || []).filter(function (x) { return x.id !== ig.id; });
          refreshAfterMutation();
        },
      }),
    ]));

    var statusSel = select(INTEG_STATUS, ig.status || "Chờ bàn giao");
    statusSel.classList.add("integ-status");
    statusSel.addEventListener("change", function () { ig.status = statusSel.value; refreshAfterMutation(); });
    card.appendChild(el("div", { class: "integ-card__meta" }, [
      labeledField("Trạng thái", statusSel),
      el("span", { class: "integ-summary", html: deliverySummary(ig) }),
    ]));

    var hs = (ig.handovers || []).slice().sort(function (a, b) { return (b.time || "").localeCompare(a.time || ""); });
    if (hs.length) {
      var hist = el("div", { class: "integ-history" });
      hs.forEach(function (h) {
        hist.appendChild(el("div", { class: "integ-ho" }, [
          el("span", { class: "integ-ho__ver", text: h.version || "—" }),
          el("span", { class: "entry__time", text: UI.fmtDate(h.time) }),
          el("span", { class: "badge " + (RESULT_BADGE[h.result] || ""), text: h.result || "—" }),
          h.note ? el("span", { class: "integ-ho__note", html: UI.escWithLinks(h.note) }) : null,
          h.file ? fileOpenBtn(t, h.file) : null,
          el("button", {
            class: "entry__del", type: "button", title: "Xóa", text: "✕",
            onclick: function () {
              ig.handovers = (ig.handovers || []).filter(function (x) { return x.id !== h.id; });
              refreshAfterMutation();
            },
          }),
        ]));
      });
      card.appendChild(hist);
    }

    var ver = el("input", { class: "input", placeholder: "Phiên bản (v1, v2…)" });
    var result = select(INTEG_RESULT, "Đạt");
    var hnote = el("input", { class: "input", placeholder: "Kết quả / ghi chú lần bàn giao" });
    var hfile = el("input", { type: "file", class: "file-input" });
    card.appendChild(el("div", { class: "add-row add-row--ho" }, [
      el("div", { class: "grid2" }, [ver, result]),
      hnote,
      fileRow("Đính file (response mẫu, spec…):", hfile),
      el("div", { class: "right" }, [
        el("button", {
          class: "btn btn--sm", type: "button", text: "+ Thêm lần bàn giao",
          onclick: function () {
            var entry = {
              id: Store.uid(), time: new Date().toISOString(),
              version: ver.value.trim(), result: result.value, note: hnote.value.trim(),
            };
            var f = hfile.files[0];
            var finish = function () {
              (ig.handovers = ig.handovers || []).push(entry);
              ig.deliveredAt = entry.time;
              refreshAfterMutation();
            };
            if (f) {
              ApiStore.saveFile(t.id, f).then(function (ref) { entry.file = ref; finish(); })
                .catch(function (e) { UI.toast("Lưu file lỗi: " + e.message); });
            } else finish();
          },
        }),
      ]),
    ]));

    // ghi chú cho integration này
    var noteWrap = el("div", { class: "integ-notes" });
    (ig.notes || []).slice().sort(function (a, b) { return (b.time || "").localeCompare(a.time || ""); })
      .forEach(function (n) {
        noteWrap.appendChild(el("div", { class: "integ-note" }, [
          el("span", { class: "entry__time", text: UI.fmtDate(n.time) }),
          el("span", { class: "integ-note__text", html: UI.escWithLinks(n.text) }),
          el("button", {
            class: "entry__del", type: "button", title: "Xóa", text: "✕",
            onclick: function () {
              ig.notes = (ig.notes || []).filter(function (x) { return x.id !== n.id; });
              refreshAfterMutation();
            },
          }),
        ]));
      });
    var noteInput = el("input", { class: "input", placeholder: "Ghi chú cho integration này…" });
    card.appendChild(el("div", { class: "integ-notes-block" }, [
      el("div", { class: "integ-notes-block__title", text: "📝 Ghi chú" }),
      noteWrap,
      el("div", { class: "add-row add-row--note" }, [
        noteInput,
        el("div", { class: "right" }, [
          el("button", {
            class: "btn btn--sm", type: "button", text: "+ Ghi chú",
            onclick: function () {
              var v = noteInput.value.trim();
              if (!v) return;
              (ig.notes = ig.notes || []).push({ id: Store.uid(), time: new Date().toISOString(), text: v });
              refreshAfterMutation();
            },
          }),
        ]),
      ]),
    ]));

    return card;
  }

  /* ---------- attachment helpers ---------- */
  function fileRow(labelText, input) {
    return el("label", { class: "file-row" }, [
      el("span", { class: "file-row__label", text: labelText }),
      input,
    ]);
  }

  function fileOpenBtn(t, fileRef) {
    return el("button", {
      class: "file-open", type: "button", text: "📎 " + fileRef.name,
      title: "Mở file đính kèm",
      onclick: function () {
        ApiStore.openFile(t.id, fileRef.storedAs).catch(function (e) { UI.toast("Mở file lỗi: " + e.message); });
      },
    });
  }

  // Ghi file (nếu có) rồi thêm entry vào collection và lưu task.
  function addEntryWithFile(t, coll, entry, file) {
    var finish = function () {
      (t[coll] = t[coll] || []).unshift(entry);
      refreshAfterMutation();
    };
    if (file) {
      ApiStore.saveFile(t.id, file)
        .then(function (ref) { entry.file = ref; finish(); })
        .catch(function (e) { UI.toast("Lưu file lỗi: " + e.message); });
    } else {
      finish();
    }
  }

  /* ---------- shared entry card ---------- */
  function entryCard(t, coll, entry, bodyNode, badgeText) {
    return el("div", { class: "entry" }, [
      el("div", { class: "entry__head" }, [
        el("div", { style: "display:flex;gap:8px;align-items:center" }, [
          badgeText ? el("span", { class: "badge badge--accent", text: badgeText }) : null,
          el("span", { class: "entry__time", text: UI.fmtDate(entry.time) }),
        ]),
        el("button", {
          class: "entry__del", type: "button", title: "Xóa", text: "✕",
          onclick: function () {
            t[coll] = (t[coll] || []).filter(function (x) { return x.id !== entry.id; });
            refreshAfterMutation();
          },
        }),
      ]),
      bodyNode,
    ]);
  }

  /* ---------- create / edit modal ---------- */
  function openModal(existing) {
    var t = existing || {};
    var f = {};
    var root = document.getElementById("modal-root");

    function field(labelText, node) {
      return el("div", { class: "field" }, [el("label", { text: labelText }), node]);
    }
    f.title = el("input", { class: "input", value: t.title || "", placeholder: "Tên task / feature" });
    f.taskId = el("input", { class: "input", value: t.taskId || "", placeholder: "VD: PROJ-123 (bỏ trống = Undefined)" });
    f.source = sourceSelect(t.source);
    f.type = select(TYPES, t.type || "Feature");
    f.priority = select(PRIORITIES, t.priority || "Medium");
    f.status = select(STATUSES, t.status || "Open");
    f.sheet = el("input", { class: "input", value: t.sheet || "", placeholder: "VD: Sheet T9-2026" });
    f.parentTaskId = featureSelect(t.parentTaskId, t.id);
    f.ac = el("textarea", { placeholder: "Mô tả / acceptance criteria" }); f.ac.value = t.ac || "";

    // Feature chỉ cần Sheet (task con liệt kê ở tab Tổng quan); Bug link Feature cha.
    var featureRow = field("Sheet (workboard plan)", f.sheet);
    var bugRow = field("Feature cha (bắt buộc với Bug)", f.parentTaskId);
    function applyType() {
      featureRow.hidden = f.type.value !== "Feature";
      bugRow.hidden = f.type.value !== "Bug";
    }
    f.type.addEventListener("change", applyType);
    applyType();

    var modal = el("div", { class: "modal" }, [
      el("h2", { text: existing ? "Sửa task" : "Task mới" }),
      el("div", { class: "form-grid" }, [
        field("Tên task", f.title),
        el("div", { class: "field" }, [
          el("div", { class: "grid2" }, [wrap("Task ID", f.taskId), wrap("Nguồn", f.source)]),
        ]),
        el("div", { class: "field" }, [
          el("div", { class: "grid2", style: "grid-template-columns:1fr 1fr 1fr" }, [
            wrap("Loại", f.type), wrap("Ưu tiên", f.priority), wrap("Trạng thái", f.status),
          ]),
        ]),
        featureRow,
        bugRow,
        field("Mô tả / AC", f.ac),
      ]),
      el("div", { class: "modal__foot" }, [
        el("button", { class: "btn", type: "button", text: "Hủy", onclick: close }),
        el("button", { class: "btn btn--primary", type: "button", text: "Lưu", onclick: save }),
      ]),
    ]);

    root.innerHTML = "";
    root.appendChild(modal);
    root.hidden = false;
    root.onclick = function (ev) { if (ev.target === root) close(); };
    f.title.focus();

    function wrap(l, node) { return el("div", {}, [el("label", { text: l }), node]); }
    function close() { root.hidden = true; root.innerHTML = ""; }

    function save() {
      var title = f.title.value.trim();
      if (!title) { f.title.focus(); UI.toast("Cần nhập tên task."); return; }
      if (f.type.value === "Bug" && !f.parentTaskId.value) {
        UI.toast("Lưu ý: Bug chưa link Feature cha.");
      }
      var task;
      if (existing) {
        assign(existing, readForm(f));
        existing.updatedAt = new Date().toISOString();
        task = existing;
      } else {
        var now = new Date().toISOString();
        task = Object.assign({
          id: Store.uid(), stage: -1, todos: [], documents: [], integrations: [],
          notes: [], mails: [], golive: [], brs: [], changes: [], sheetTasks: [],
          createdAt: now, updatedAt: now,
        }, readForm(f));
        state.tasks.push(task);
        state.activeId = task.id;
      }
      renderList();
      renderDetail();
      saveTask(task);
      close();
      UI.toast("Đã lưu.");
    }
  }

  function readForm(f) {
    var type = f.type.value;
    return {
      title: f.title.value.trim(), taskId: f.taskId.value.trim() || DEFAULT_TASK_ID,
      source: f.source.value,
      type: type, priority: f.priority.value, status: f.status.value, ac: f.ac.value.trim(),
      // Chỉ giữ field của đúng loại task để không sót dữ liệu cũ khi đổi loại.
      sheet: type === "Feature" ? f.sheet.value.trim() : "",
      parentTaskId: type === "Bug" ? f.parentTaskId.value : "",
    };
  }

  // Select nguồn task; giữ giá trị cũ ngoài pool để không mất dữ liệu khi sửa task.
  function sourceSelect(current) {
    var opts = SOURCES.slice();
    if (current && opts.indexOf(current) < 0) opts.push(current);
    return select(opts, current || SOURCES[0]);
  }

  // Select các task Feature để Bug link tới (loại trừ chính task đang sửa).
  function featureSelect(currentId, selfId) {
    var options = [el("option", { value: "", text: "— chưa gắn —" })];
    state.tasks.forEach(function (x) {
      if (x.type !== "Feature" || x.id === selfId) return;
      options.push(el("option", {
        value: x.id, text: (x.taskId ? x.taskId + " · " : "") + (x.title || "(chưa có tên)"),
        selected: x.id === currentId ? "selected" : false,
      }));
    });
    return el("select", {}, options);
  }
  function assign(target, patch) { Object.keys(patch).forEach(function (k) { target[k] = patch[k]; }); }
  function select(opts, val) {
    return el("select", {}, opts.map(function (o) {
      return el("option", { value: o, text: o, selected: o === val ? "selected" : false });
    }));
  }

  function removeTask(t) {
    if (!window.confirm('Xóa task "' + (t.title || "") + '"? Sẽ xóa cả thư mục và file đính kèm. Không thể hoàn tác.')) return;
    state.tasks = state.tasks.filter(function (x) { return x.id !== t.id; });
    if (state.activeId === t.id) state.activeId = null;
    renderList();
    renderDetail();
    ApiStore.deleteTask(t.id).catch(function (e) { UI.toast("Xóa thư mục lỗi: " + e.message); });
    UI.toast("Đã xóa task.");
  }

  /* ---------- public ---------- */
  window.Tasks = {
    init: init,
    onSearch: function (v) { state.filter = v; renderList(); },
    newTask: function () {
      if (!state.connected) { UI.toast("Server lưu trữ chưa sẵn sàng — chạy node server.js."); return; }
      openModal(null);
    },
    getAll: function () { return state.tasks; },
    isConnected: function () { return state.connected; },
    setConnected: function (v) { state.connected = v; },
    // Nạp danh sách task đã đọc từ thư mục.
    load: function (tasks) {
      state.tasks = (Array.isArray(tasks) ? tasks : []).map(migrate);
      state.activeId = null;
      renderList();
      renderDetail();
    },
    // Import: thay toàn bộ trong bộ nhớ và ghi tất cả ra thư mục.
    replaceAll: function (tasks) {
      state.tasks = (Array.isArray(tasks) ? tasks : []).map(migrate);
      state.activeId = null;
      renderList();
      renderDetail();
      state.tasks.forEach(function (t) { saveTask(t); });
    },
  };
})();
