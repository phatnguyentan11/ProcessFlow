/* ============================================================
   sheet.js — danh sách task con trong 1 sheet của workboard plan
   t.sheetTasks[] = { id, time, text, startAt, endAt, status, note }

   2 chế độ:
     - XEM (mặc định): mỗi task gọn 1 dòng, không có ô nhập nào.
     - SỬA: bấm nút ở tiêu đề mục → hiện ô chọn/lịch cho cả danh sách.
   Cờ chế độ sửa giữ theo task id, không lưu xuống đĩa.
   Mọi con số (số ngày, trễ hạn, roll-up) đều TÍNH lúc render.
   Exposes: window.Sheet
   ============================================================ */
(function () {
  "use strict";

  var el = UI.el;

  var STATUS_DONE = "Done";
  var STATUS_DEFAULT = "Open";

  var editingFor = null; // id của task đang mở chế độ sửa danh sách

  function isEditing(t) { return editingFor === t.id; }

  /* ---------- dữ liệu ---------- */
  function migrate(t) {
    if (!t.sheetTasks) t.sheetTasks = [];
    t.sheetTasks.forEach(function (s) {
      if (s.startAt == null) s.startAt = "";
      if (s.endAt == null) s.endAt = "";
      if (!s.status) s.status = STATUS_DEFAULT;
      if (s.note == null) s.note = "";
    });
    return t;
  }

  // Quá hạn = có ngày kết thúc, chưa Done, và hạn đã trôi qua.
  function isOverdue(s, ctx) {
    if (!s.endAt || s.status === STATUS_DONE) return false;
    return ctx.dayDiff(s.endAt, ctx.today()) > 0;
  }

  function stats(t, ctx) {
    var list = t.sheetTasks || [];
    var done = 0, overdue = 0;
    list.forEach(function (s) {
      if (s.status === STATUS_DONE) done++;
      if (isOverdue(s, ctx)) overdue++;
    });
    return { total: list.length, done: done, overdue: overdue };
  }

  /* ---------- hiển thị ngày gọn ---------- */
  function shortDate(iso, withYear) {
    if (!iso) return "";
    var p = String(iso).split("-"); // yyyy-mm-dd
    if (p.length !== 3) return iso;
    return p[2] + "/" + p[1] + (withYear ? "/" + p[0].slice(2) : "");
  }

  function rangeText(s) {
    if (!s.startAt && !s.endAt) return "";
    var thisYear = String(new Date().getFullYear());
    var needYear = (s.startAt && s.startAt.slice(0, 4) !== thisYear) ||
      (s.endAt && s.endAt.slice(0, 4) !== thisYear);
    return shortDate(s.startAt, needYear) + "→" + shortDate(s.endAt, needYear);
  }

  // Chi tiết đầy đủ — dùng làm tooltip cho dòng gọn.
  function fullSchedule(s, ctx) {
    if (!s.startAt && !s.endAt) return "";
    var parts = [];
    if (s.startAt && s.endAt) {
      var span = ctx.dayDiff(s.startAt, s.endAt);
      if (span < 0) return "⚠ ngày kết thúc trước ngày bắt đầu";
      parts.push(s.startAt + " → " + s.endAt, (span + 1) + " ngày");
    }
    if (s.endAt) parts.push(deadlineText(s, ctx));
    return parts.filter(Boolean).join(" · ");
  }

  function deadlineText(s, ctx) {
    if (s.status === STATUS_DONE) return "đã xong";
    var left = ctx.dayDiff(ctx.today(), s.endAt);
    if (left > 0) return "còn " + left + " ngày";
    if (left === 0) return "hạn hôm nay";
    return "trễ " + (-left) + " ngày";
  }

  function summaryText(s) {
    if (!s.total) return "";
    var out = s.done + "/" + s.total + " xong";
    if (s.overdue) out += " · ⚠ " + s.overdue + " trễ hạn";
    return out;
  }

  /* ---------- mục ---------- */
  function section(t, ctx) {
    if (!t.sheet) return null;
    var editing = isEditing(t);
    var list = t.sheetTasks || [];
    var body = el("div", { class: "desc-card__body" });

    if (!list.length) {
      body.appendChild(el("p", { class: "muted", text: "Chưa liệt kê task con nào." }));
    } else {
      list.forEach(function (s) {
        body.appendChild(editing ? editRow(t, s, ctx) : readRow(s, ctx));
      });
    }
    if (editing) body.appendChild(addForm(t, ctx));

    return el("div", { class: "section desc-card" }, [
      el("div", { class: "desc-card__head" }, [
        el("h3", { text: "Task trong sheet " + t.sheet }),
        el("span", { class: "sheet-sum", text: summaryText(stats(t, ctx)) }),
        el("button", {
          class: "btn desc-card__edit", type: "button",
          text: editing ? "Xong" : "✎ Sửa",
          // Đổi cách hiển thị thôi → vẽ lại, KHÔNG ghi xuống đĩa.
          onclick: function () { editingFor = editing ? null : t.id; ctx.rerender(); },
        }),
      ]),
      body,
    ]);
  }

  /* ---------- chế độ XEM: gọn 1 dòng ---------- */
  function readRow(s, ctx) {
    var late = isOverdue(s, ctx);
    return el("div", {
      class: "sheet-task-line" + (late ? " sheet-task-line--late" : ""),
      title: fullSchedule(s, ctx),
    }, [
      el("span", { class: "sheet-task__name", html: UI.escWithLinks(s.text) }),
      el("span", {
        class: "badge " + (s.status === STATUS_DONE ? "badge--ok" : ""),
        text: s.status || STATUS_DEFAULT,
      }),
      el("span", { class: "sheet-task__range", text: rangeText(s) }),
      late ? el("span", { class: "badge badge--danger", text: "⚠ trễ" }) : null,
      s.note ? el("span", { class: "sheet-task__notev", html: UI.escWithLinks(s.note) }) : null,
    ]);
  }

  /* ---------- chế độ SỬA ---------- */
  function editRow(t, s, ctx) {
    var name = el("input", { class: "input sheet-task__nameinput", value: s.text || "" });
    name.addEventListener("change", function () { s.text = name.value.trim(); ctx.refresh(); });

    var row = el("div", { class: "sheet-task" });
    row.appendChild(el("div", { class: "sheet-task__top" }, [
      name,
      statusSelect(s, ctx),
      dateInput(s, "startAt", ctx),
      dateInput(s, "endAt", ctx),
      el("button", {
        class: "entry__del", type: "button", title: "Xóa", text: "✕",
        onclick: function () {
          t.sheetTasks = (t.sheetTasks || []).filter(function (x) { return x.id !== s.id; });
          ctx.refresh();
        },
      }),
    ]));
    row.appendChild(noteInput(s, ctx));
    return row;
  }

  function statusSelect(s, ctx) {
    var sel = ctx.select(ctx.statuses, s.status || STATUS_DEFAULT);
    sel.className = "sheet-task__status";
    sel.addEventListener("change", function () {
      s.status = sel.value;
      ctx.refresh();
    });
    return sel;
  }

  function dateInput(s, key, ctx) {
    var input = el("input", { class: "input sheet-task__date", type: "date", value: s[key] || "" });
    input.addEventListener("change", function () { s[key] = input.value; ctx.refresh(); });
    return input;
  }

  function noteInput(s, ctx) {
    var note = el("input", {
      class: "input sheet-task__note", placeholder: "Ghi chú cho task này…", value: s.note || "",
    });
    note.addEventListener("change", function () { s.note = note.value.trim(); ctx.refresh(); });
    return note;
  }

  function addForm(t, ctx) {
    var name = el("input", { class: "input", placeholder: "Tên task con trong sheet…" });
    var start = el("input", { class: "input", type: "date" });
    var end = el("input", { class: "input", type: "date" });

    function add() {
      var v = name.value.trim();
      if (!v) return;
      (t.sheetTasks = t.sheetTasks || []).push({
        id: Store.uid(), time: new Date().toISOString(), text: v,
        startAt: start.value, endAt: end.value,
        status: STATUS_DEFAULT, note: "",
      });
      ctx.refresh();
    }

    return el("div", { class: "add-row add-row--note" }, [
      name,
      el("div", { class: "grid2" }, [start, end]),
      el("div", { class: "right" }, [
        el("button", { class: "btn btn--primary btn--sm", type: "button", text: "+ Thêm", onclick: add }),
      ]),
    ]);
  }

  window.Sheet = {
    migrate: migrate,
    stats: stats,
    section: section,
  };
})();
