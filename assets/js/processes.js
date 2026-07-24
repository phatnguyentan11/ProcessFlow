/* ============================================================
   processes.js — load process JSON files + render (generic)
   Exposes: window.Processes
   ============================================================ */
(function () {
  "use strict";

  var esc = UI.esc;
  var state = { list: [], byId: {}, activeId: null };

  // Keys handled in the header (skip in the generic body renderer).
  var META_KEYS = { id: 1, name: 1, version: 1, description: 1, lastUpdated: 1, order: 1, status: 1, group: 1 };
  // Nicer Vietnamese titles for known section keys; unknown keys fall back to prettified name.
  var LABELS = {
    whenToApply: "Khi nào áp dụng", workflow: "Các bước thực hiện", steps: "Bước",
    actions: "Hành động", checklist: "Checklist", outputs: "Kết quả đầu ra",
    notes: "Ghi chú", qualityRules: "Quy tắc chất lượng", testRequirements: "Yêu cầu test",
    gitWorkflow: "Git workflow", source: "Nguồn task", prerequisites: "Điều kiện tiên quyết",
    testingPyramid: "Testing pyramid", input: "Đầu vào", description: "Mô tả", desc: "Mô tả",
  };

  function label(key) {
    if (LABELS[key]) return LABELS[key];
    return key.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); });
  }

  /* ---------- loading ---------- */
  function load() {
    return fetch("processes/index.json")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (manifest) {
        var items = (manifest.processes || []).slice().sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
        return Promise.all(items.map(function (it) {
          return fetch("processes/" + it.file)
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
        }));
      })
      .then(function (loaded) {
        state.list = loaded.filter(Boolean).sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
        state.byId = {};
        state.list.forEach(function (p) { state.byId[p.id] = p; });
        return state.list;
      });
  }

  /* ---------- list ---------- */
  function renderList(filter) {
    var ul = document.getElementById("proc-list");
    ul.innerHTML = "";
    var q = (filter || "").trim().toLowerCase();
    var shown = state.list.filter(function (p) {
      if (!q) return true;
      return (p.name + " " + (p.description || "")).toLowerCase().indexOf(q) >= 0;
    });
    if (!shown.length) {
      ul.appendChild(UI.el("li", { class: "empty", text: "Không tìm thấy quy trình." }));
      return;
    }
    var currentGroup = null;
    shown.forEach(function (p) {
      if (p.group && p.group !== currentGroup) {
        currentGroup = p.group;
        ul.appendChild(UI.el("li", { class: "proc-group", text: p.group }));
      }
      var li = UI.el("li", {
        class: "proc-item" + (p.id === state.activeId ? " is-active" : ""),
        onclick: function () { select(p.id); },
      }, [
        UI.el("div", { class: "proc-item__top" }, [
          UI.el("span", { class: "proc-item__order", text: String(p.order || "•") }),
          UI.el("span", { class: "proc-item__name", text: p.name }),
        ]),
        UI.el("div", { class: "proc-item__desc", text: p.description || "" }),
      ]);
      ul.appendChild(li);
    });
  }

  function select(id) {
    state.activeId = id;
    renderList(document.getElementById("proc-search").value);
    renderDetail(state.byId[id]);
  }

  /* ---------- detail (generic) ---------- */
  function renderDetail(p) {
    var host = document.getElementById("proc-detail");
    host.innerHTML = "";
    if (!p) { host.appendChild(UI.el("p", { class: "empty", text: "Chọn một quy trình." })); return; }

    var statusClass = p.status === "active" ? "badge--ok" : "";
    var head = UI.el("div", { class: "detail-head" }, [
      UI.el("h2", { text: p.name }),
      p.description ? UI.el("p", { class: "sub", text: p.description }) : null,
      UI.el("div", { class: "detail-meta" }, [
        UI.el("span", { class: "badge badge--accent", text: "Bước #" + (p.order || "?") }),
        p.status ? UI.el("span", { class: "badge " + statusClass, text: p.status }) : null,
        p.version ? UI.el("span", { class: "badge", text: "v" + p.version }) : null,
        p.lastUpdated ? UI.el("span", { class: "badge", text: "Cập nhật " + p.lastUpdated }) : null,
      ]),
    ]);
    host.appendChild(head);

    Object.keys(p).forEach(function (key) {
      if (META_KEYS[key]) return;
      var section = UI.el("div", { class: "section" }, [UI.el("h3", { text: label(key) })]);
      section.appendChild(renderValue(p[key]));
      host.appendChild(section);
    });
    host.scrollTop = 0;
  }

  // Recursively render any JSON value into readable HTML nodes.
  function renderValue(val) {
    if (val == null) return UI.el("p", { class: "muted", text: "—" });

    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      return UI.el("p", { html: UI.escWithLinks(val) });
    }

    if (Array.isArray(val)) {
      var allPrimitive = val.every(function (v) { return typeof v !== "object" || v === null; });
      if (allPrimitive) {
        return UI.el("ul", {}, val.map(function (v) {
          return UI.el("li", { html: UI.escWithLinks(v) });
        }));
      }
      var frag = document.createDocumentFragment();
      val.forEach(function (item) { frag.appendChild(renderObjectCard(item)); });
      return frag;
    }

    // plain object
    return renderObjectCard(val);
  }

  // Render an object as a subcard: a title (name/step) + key/value list or nested sections.
  function renderObjectCard(obj) {
    if (typeof obj !== "object" || obj === null) {
      return UI.el("p", { html: UI.escWithLinks(obj) });
    }
    var card = UI.el("div", { class: "subcard" });
    var title = obj.name || obj.step != null ? UI.el("div", { class: "subcard__title" }, [
      obj.step != null ? UI.el("span", { class: "step-no", text: String(obj.step) }) : null,
      UI.el("span", { text: obj.name || "" }),
    ]) : null;
    if (title) card.appendChild(title);

    var dl = UI.el("dl", { class: "kv" });
    var hasKv = false;
    Object.keys(obj).forEach(function (k) {
      if (k === "name" || k === "step") return;
      var v = obj[k];
      if (Array.isArray(v) || (v && typeof v === "object")) {
        // nested block gets its own labelled sub-section
        card.appendChild(UI.el("div", { class: "section", style: "margin:10px 0 0" }, [
          UI.el("h3", { text: label(k) }),
        ]));
        card.appendChild(renderValue(v));
      } else {
        hasKv = true;
        dl.appendChild(UI.el("dt", { text: label(k) }));
        dl.appendChild(UI.el("dd", { html: UI.escWithLinks(v) }));
      }
    });
    if (hasKv) card.appendChild(dl);
    return card;
  }

  /* ---------- public ---------- */
  window.Processes = {
    load: load,
    renderList: renderList,
    getList: function () { return state.list; },
    hasSelection: function () { return !!state.activeId; },
    selectFirst: function () { if (state.list[0]) select(state.list[0].id); },
    onSearch: function (v) { renderList(v); },
  };
})();
