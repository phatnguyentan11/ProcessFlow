/* ============================================================
   brs.js — tài liệu BRS/DD (có version) + tab Notes (ghi chú & thay đổi)
   - t.brs[]      : chung cho cả 2 loại, phân biệt bằng kind:
                      DD  (từ Lead) — ít version, ưu tiên CAO HƠN
                      BRS (từ BA)   — nhiều version, hay đổi
                    versions[0] = bản gốc, version CUỐI = bản đang áp dụng.
   - t.changes[]  : thay đổi NGOÀI tài liệu, kèm thẩm quyền (authority):
                      quyết định Lead (được làm ngay) hoặc chờ BA cập nhật.
   - t.notes[]    : ghi chú / nội dung chat đã chốt, có thể kèm ảnh dán.
   Thứ tự ưu tiên: Lead > DD (bản cuối) > BRS (bản cuối) > bản cũ.
   Tab Notes gộp 3 nguồn trên thành 1 dòng thời gian, tính lúc render
   (không lưu trùng dữ liệu; ô "Loại" chỉ quyết định ghi vào mảng nào).
   Exposes: window.Brs
   ============================================================ */
(function () {
  "use strict";

  var el = UI.el;

  var IMPACTS = ["Nhỏ", "Trung bình", "Lớn"];
  var IMPACT_BADGE = { "Nhỏ": "", "Trung bình": "badge--warn", "Lớn": "badge--danger" };
  var CHANNELS = ["Mail", "Chat", "Meeting", "Khác"];
  var DEFAULT_BASELINE_VERSION = "v1.0";

  // DD ưu tiên cao hơn BRS → luôn xếp trước khi hiển thị.
  var KIND_DD = "DD";
  var KIND_BRS = "BRS";
  var KINDS = [KIND_DD, KIND_BRS];
  var KIND_LABEL = { "DD": "DD · Lead", "BRS": "BRS · BA" };
  var KIND_BADGE = { "DD": "badge--accent", "BRS": "" };

  // Thay đổi ngoài tài liệu: chỉ quyết định Lead mới được làm ngay.
  var AUTH_LEAD = "Quyết định Lead";
  var AUTH_PENDING = "Chờ BA cập nhật BRS";
  var AUTHORITIES = [AUTH_LEAD, AUTH_PENDING];
  var AUTH_BADGE = {};
  AUTH_BADGE[AUTH_LEAD] = "badge--ok";
  AUTH_BADGE[AUTH_PENDING] = "badge--danger";

  // Tab Notes: 1 form, chọn loại để quyết định ghi vào t.notes hay t.changes.
  var ENTRY_NOTE = "Note";
  var ENTRY_CHANGE = "Thay đổi ngoài tài liệu";
  var ENTRY_KINDS = [ENTRY_NOTE, ENTRY_CHANGE];

  /* ---------- dữ liệu ---------- */
  function migrate(t) {
    if (!t.brs) t.brs = [];
    if (!t.changes) t.changes = [];
    // Dữ liệu cũ: mặc định là BRS, thay đổi ngoài tài liệu coi như chưa hợp thức.
    t.brs.forEach(function (b) { if (!b.kind) b.kind = KIND_BRS; });
    t.changes.forEach(function (c) { if (!c.authority) c.authority = AUTH_PENDING; });
    return t;
  }

  function versionsOf(b) { return b.versions || []; }

  // Bản gốc không tính là thay đổi → số lần đổi = số version - 1.
  function changeCountOf(b) { return Math.max(0, versionsOf(b).length - 1); }

  function isDd(b) { return b.kind === KIND_DD; }

  // DD lên trước BRS; trong cùng loại giữ nguyên thứ tự nhập.
  function sortedDocs(t) {
    var list = (t.brs || []).slice();
    return list.sort(function (a, b) { return (isDd(b) ? 1 : 0) - (isDd(a) ? 1 : 0); });
  }

  function stats(t) {
    var list = t.brs || [];
    var s = {
      ddCount: 0, brsCount: 0, viaDd: 0, viaBrs: 0,
      adhoc: (t.changes || []).length,
      pending: (t.changes || []).filter(function (c) { return c.authority !== AUTH_LEAD; }).length,
    };
    list.forEach(function (b) {
      if (isDd(b)) { s.ddCount++; s.viaDd += changeCountOf(b); }
      else { s.brsCount++; s.viaBrs += changeCountOf(b); }
    });
    s.docCount = list.length;
    s.total = s.viaDd + s.viaBrs + s.adhoc;   // chỉ đếm thay đổi
    s.notes = (t.notes || []).length;
    s.timeline = s.total + s.notes;           // tổng mục hiện ở tab Notes
    return s;
  }

  // Gộp thay đổi theo BRS + ngoài BRS thành 1 dòng thời gian (derived).
  function timeline(t) {
    var out = [];
    (t.brs || []).forEach(function (b) {
      versionsOf(b).forEach(function (v, i) {
        if (i === 0) return; // bản gốc
        out.push({ kind: "brs", time: v.time, brs: b, version: v, no: i });
      });
    });
    (t.changes || []).forEach(function (c) {
      out.push({ kind: "adhoc", time: c.time, change: c });
    });
    (t.notes || []).forEach(function (n) {
      out.push({ kind: "note", time: n.time, note: n });
    });
    return out.sort(function (a, b) { return (b.time || "").localeCompare(a.time || ""); });
  }

  /* ---------- helper chung ---------- */
  function todayStr() { return new Date().toISOString().slice(0, 10); }

  // "BRS-018 Thanh toan.docx" -> "BRS-018 Thanh toan"
  function stripExt(s) { return String(s || "").replace(/\.[A-Za-z0-9]{1,8}$/, ""); }

  // Tách tên gợi ý từ tên file hoặc từ link online.
  function nameFromSource(src) {
    var s = String(src || "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) return stripExt(s);
    var clean = s.split("#")[0].split("?")[0].replace(/\/+$/, "");
    var afterHost = clean.replace(/^https?:\/\//i, "");
    if (afterHost.indexOf("/") < 0) return afterHost; // chỉ có domain
    var last = afterHost.slice(afterHost.lastIndexOf("/") + 1);
    try { last = decodeURIComponent(last); } catch (e) { /* URL hỏng: giữ nguyên */ }
    return last ? stripExt(last) : afterHost;
  }

  // Link duy nhất của tài liệu: ưu tiên link online, nếu không thì file của version CUỐI có file.
  function docLink(t, b) {
    if (b.url) return { href: b.url, label: "link online" };
    var vs = versionsOf(b);
    for (var i = vs.length - 1; i >= 0; i--) {
      if (vs[i].url) return { href: vs[i].url, label: "link online" };
      if (vs[i].file) return { href: ApiStore.fileUrl(t.id, vs[i].file.storedAs), label: "file đính kèm" };
    }
    return null;
  }

  // 1 hàng: chọn file HOẶC dán link online — 2 ô loại trừ nhau.
  // onPick(tênGợiÝ) gọi mỗi khi người dùng chọn file hoặc gõ link.
  function sourceRow(onPick) {
    var file = el("input", { type: "file", class: "file-input", title: "Chọn file tài liệu" });
    var url = el("input", { class: "input", placeholder: "hoặc dán link online…" });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      url.value = "";
      if (onPick) onPick(nameFromSource(f.name));
    });
    url.addEventListener("input", function () {
      if (url.value.trim()) file.value = "";
      if (onPick) onPick(nameFromSource(url.value));
    });
    return { file: file, url: url, node: el("div", { class: "grid2" }, [file, url]) };
  }

  // Lưu file (nếu người dùng có chọn) rồi gọi done(entry).
  function withFile(taskId, fileEl, entry, done) {
    var f = fileEl && fileEl.files && fileEl.files[0];
    if (!f) { done(entry); return; }
    ApiStore.saveFile(taskId, f)
      .then(function (ref) { entry.file = ref; done(entry); })
      .catch(function (e) { UI.toast("Lưu file lỗi: " + e.message); });
  }

  function statRow(t) {
    var s = stats(t);
    return el("div", { class: "detail-meta", style: "margin-bottom:14px" }, [
      el("span", { class: "badge " + (s.docCount ? "badge--accent" : "badge--warn"),
        text: s.docCount ? "DD: " + s.ddCount + " · BRS: " + s.brsCount : "⚠ Chưa gắn BRS/DD" }),
      el("span", { class: "badge " + (s.viaDd + s.viaBrs ? "badge--warn" : ""),
        text: "Đổi: BRS " + s.viaBrs + " lần · DD " + s.viaDd + " lần" }),
      el("span", { class: "badge " + (s.adhoc ? "badge--warn" : ""),
        text: "Ngoài tài liệu: " + s.adhoc }),
      s.pending ? el("span", { class: "badge badge--danger",
        title: "Thay đổi chưa vào BRS/DD và chưa có quyết định Lead",
        text: "⚠ " + s.pending + " chưa hợp thức" }) : null,
    ]);
  }

  function addButton(text, onclick) {
    return el("div", { class: "right" }, [
      el("button", { class: "btn btn--primary btn--sm", type: "button", text: text, onclick: onclick }),
    ]);
  }

  function confirmLine(o) {
    if (!o.confirmedBy && !o.confirmedAt) return null;
    var s = "BA confirm: " + (o.confirmedBy || "—");
    if (o.confirmedAt) s += " · " + o.confirmedAt;
    return el("span", { class: "brs-ver__by", text: s });
  }

  /* ---------- tab BRS/DD ---------- */
  function brsPanel(t, ctx) {
    var panel = el("div", { class: "tab-panel is-active" });
    panel.appendChild(statRow(t));
    panel.appendChild(el("p", { class: "muted", style: "margin:-6px 0 12px",
      text: "Ưu tiên: quyết định Lead > DD (từ Lead) > BRS (từ BA). Bản làm theo luôn là bản cuối cùng." }));
    panel.appendChild(brsAddForm(t, ctx));

    var list = sortedDocs(t);
    if (!list.length) {
      panel.appendChild(el("p", { class: "muted",
        text: "Chưa gắn tài liệu nào. Mỗi task phải được gắn ít nhất 1 tài liệu BRS/DD." }));
      return panel;
    }
    list.forEach(function (b) { panel.appendChild(brsCard(t, b, ctx)); });
    return panel;
  }

  function brsAddForm(t, ctx) {
    var kind = ctx.select(KINDS, KIND_BRS);
    var name = el("input", { class: "input", placeholder: "Tên tài liệu (tự điền từ file/link, sửa được)" });
    var ver = el("input", { class: "input", placeholder: "Phiên bản (VD: v1.0)" });
    var by = el("input", { class: "input", placeholder: "Người bàn giao (BA / Lead)" });
    var note = el("input", { class: "input", placeholder: "Ghi chú về tài liệu này (tùy chọn)" });

    // Người dùng tự gõ tên → thôi tự điền đè.
    var nameTouched = false;
    name.addEventListener("input", function () { nameTouched = true; });
    var src = sourceRow(function (suggested) {
      if (!nameTouched) name.value = suggested;
    });

    function add() {
      var n = name.value.trim();
      var link = src.url.value.trim();
      var hasFile = !!(src.file.files && src.file.files[0]);
      if (!n && !link && !hasFile) { UI.toast("Chọn file hoặc dán link tài liệu."); return; }
      if (!n) { UI.toast("Cần tên tài liệu."); name.focus(); return; }
      var now = new Date().toISOString();
      var baseline = {
        id: Store.uid(), version: ver.value.trim() || DEFAULT_BASELINE_VERSION,
        time: now, changeSummary: "", confirmedBy: by.value.trim(), confirmedAt: "", impact: "",
      };
      withFile(t.id, src.file, baseline, function (v) {
        (t.brs = t.brs || []).push({
          id: Store.uid(), kind: kind.value, name: n, url: link,
          note: note.value.trim(), time: now, versions: [v],
        });
        ctx.refresh();
        UI.toast("Đã gắn tài liệu " + kind.value + ".");
      });
    }

    return el("div", { class: "add-row" }, [
      kind,
      src.node,
      name,
      el("div", { class: "grid2" }, [ver, by]),
      note,
      addButton("+ Gắn tài liệu", add),
    ]);
  }

  // Tiêu đề tài liệu = 1 link duy nhất (link online, hoặc file của version cuối).
  function docTitleNode(t, b) {
    var label = b.name || b.code || "(không tên)";
    var link = docLink(t, b);
    if (!link) return el("span", { text: label });
    return el("a", {
      href: link.href, target: "_blank", rel: "noopener noreferrer",
      title: "Mở " + link.label, text: label,
    });
  }

  function brsCard(t, b, ctx) {
    var card = el("div", { class: "brs-card" + (isDd(b) ? " brs-card--dd" : "") });
    var n = changeCountOf(b);

    card.appendChild(el("div", { class: "brs-card__head" }, [
      el("div", { class: "brs-card__title" }, [
        el("span", { class: "badge " + KIND_BADGE[b.kind || KIND_BRS],
          title: isDd(b) ? "DD từ Lead — ưu tiên cao hơn BRS" : "BRS từ BA",
          text: KIND_LABEL[b.kind || KIND_BRS] }),
        docTitleNode(t, b),
        el("span", { class: "badge " + (n ? "badge--warn" : ""), text: "Đổi " + n + " lần" }),
      ]),
      el("button", {
        class: "entry__del", type: "button", title: "Xóa tài liệu này", text: "✕",
        onclick: function () {
          if (!window.confirm('Xóa tài liệu "' + (b.name || b.code) + '" cùng toàn bộ version?')) return;
          t.brs = (t.brs || []).filter(function (x) { return x.id !== b.id; });
          ctx.refresh();
        },
      }),
    ]));

    if (b.note) card.appendChild(el("div", { class: "brs-card__note", html: UI.escWithLinks(b.note) }));

    var vers = el("div", { class: "brs-vers" });
    versionsOf(b).forEach(function (v, i) { vers.appendChild(versionRow(t, b, v, i, ctx)); });
    card.appendChild(vers);
    card.appendChild(versionAddForm(t, b, ctx));
    return card;
  }

  function versionRow(t, b, v, idx, ctx) {
    var isBase = idx === 0;
    var isLatest = idx === versionsOf(b).length - 1;
    return el("div", { class: "brs-ver" + (isLatest ? " brs-ver--current" : "") }, [
      el("div", { class: "brs-ver__top" }, [
        el("span", { class: "integ-ho__ver", text: v.version || "—" }),
        el("span", { class: "badge " + (isBase ? "" : "badge--accent"),
          text: isBase ? "Bản gốc" : "Thay đổi lần " + idx }),
        isLatest ? el("span", { class: "badge badge--ok", title: "Đây là bản phải làm theo",
          text: "✔ Đang áp dụng" }) : null,
        el("span", { class: "entry__time", text: UI.fmtDate(v.time) }),
        v.impact ? el("span", { class: "badge " + (IMPACT_BADGE[v.impact] || ""),
          text: "Ảnh hưởng: " + v.impact }) : null,
        confirmLine(v),
        v.url
          ? el("a", { href: v.url, target: "_blank", rel: "noopener noreferrer", text: "🔗 link" })
          : (v.file ? ctx.fileOpenBtn(t, v.file) : null),
        el("button", {
          class: "entry__del", type: "button", title: "Xóa version", text: "✕",
          onclick: function () {
            b.versions = versionsOf(b).filter(function (x) { return x.id !== v.id; });
            ctx.refresh();
          },
        }),
      ]),
      v.changeSummary
        ? el("div", { class: "brs-ver__note", html: UI.escWithLinks(v.changeSummary) })
        : null,
    ]);
  }

  function versionAddForm(t, b, ctx) {
    var ver = el("input", { class: "input", placeholder: "Version mới (VD: v1.1)" });
    var impact = ctx.select(IMPACTS, "Nhỏ");
    var summary = el("input", { class: "input", placeholder: "Đổi cái gì so với version trước?" });
    var by = el("input", { class: "input", placeholder: "Người phát hành (BA / Lead)" });
    var at = el("input", { class: "input", type: "date", value: todayStr() });
    var src = sourceRow(null); // version không tự điền tên

    function add() {
      var v = ver.value.trim();
      var s = summary.value.trim();
      if (!v && !s) { UI.toast("Nhập version hoặc nội dung thay đổi."); return; }
      var entry = {
        id: Store.uid(), version: v, time: new Date().toISOString(), changeSummary: s,
        url: src.url.value.trim(), confirmedBy: by.value.trim(), confirmedAt: at.value,
        impact: impact.value,
      };
      withFile(t.id, src.file, entry, function (e) {
        (b.versions = versionsOf(b)).push(e);
        ctx.refresh();
        UI.toast("Đã thêm version — bản mới là bản đang áp dụng.");
      });
    }

    return el("div", { class: "add-row add-row--ho" }, [
      src.node,
      el("div", { class: "grid2" }, [ver, impact]),
      summary,
      el("div", { class: "grid2" }, [by, at]),
      addButton("+ Thêm version mới", add),
    ]);
  }

  /* ---------- tab Notes (gộp ghi chú + thay đổi) ---------- */
  function notesPanel(t, ctx) {
    var panel = el("div", { class: "tab-panel is-active" });
    panel.appendChild(statRow(t));
    panel.appendChild(el("p", { class: "muted", style: "margin:-6px 0 12px",
      text: "Ghi chú đã chốt và thay đổi của task. Thay đổi kèm bản tài liệu mới thì ghi ở tab BRS/DD (thêm version) — mục ở đây dành cho thay đổi chưa vào BRS/DD." }));
    panel.appendChild(entryAddForm(t, ctx));

    var items = timeline(t);
    if (!items.length) {
      panel.appendChild(el("p", { class: "muted", text: "Chưa có ghi chú hay thay đổi nào." }));
      return panel;
    }
    items.forEach(function (it) { panel.appendChild(timelineItem(t, it, ctx)); });
    return panel;
  }

  // 1 form cho cả 2 loại: Note (kèm ảnh dán) và Thay đổi ngoài tài liệu.
  function entryAddForm(t, ctx) {
    var kind = ctx.select(ENTRY_KINDS, ENTRY_NOTE);
    var text = el("textarea", { placeholder: "Nội dung… (Ctrl+V để dán ảnh)" });
    var preview = el("div", { class: "img-preview" });
    var pending = []; // ảnh đã dán, chưa lưu: { file, url }

    var authority = ctx.select(AUTHORITIES, AUTH_PENDING);
    var channel = ctx.select(CHANNELS, "Chat");
    var impact = ctx.select(IMPACTS, "Nhỏ");
    var by = el("input", { class: "input", placeholder: "Người quyết định / confirm" });
    var at = el("input", { class: "input", type: "date", value: todayStr() });
    var file = el("input", { type: "file", class: "file-input" });
    var changeRows = el("div", { class: "chg-fields" }, [
      ctx.fileRow("Thẩm quyền:", authority),
      el("div", { class: "grid2" }, [channel, impact]),
      el("div", { class: "grid2" }, [by, at]),
      ctx.fileRow("Đính bằng chứng (ảnh chat, mail…):", file),
    ]);

    function isChange() { return kind.value === ENTRY_CHANGE; }
    function applyKind() {
      changeRows.hidden = !isChange();
      preview.hidden = isChange(); // ảnh dán chỉ dùng cho Note
    }
    kind.addEventListener("change", applyKind);
    applyKind();

    function renderPreview() {
      preview.innerHTML = "";
      pending.forEach(function (p, idx) {
        preview.appendChild(el("div", { class: "img-preview__item" }, [
          el("img", { src: p.url, alt: "" }),
          el("button", {
            class: "img-preview__del", type: "button", text: "✕", title: "Gỡ ảnh",
            onclick: function () { URL.revokeObjectURL(p.url); pending.splice(idx, 1); renderPreview(); },
          }),
        ]));
      });
    }

    text.addEventListener("paste", function (ev) {
      if (isChange()) return;
      var items = (ev.clipboardData && ev.clipboardData.items) || [];
      var added = false;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.kind !== "file" || it.type.indexOf("image/") !== 0) continue;
        var blob = it.getAsFile();
        if (!blob) continue;
        var ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
        var f = new File([blob], "paste-" + Date.now() + "-" + i + "." + ext, { type: blob.type });
        pending.push({ file: f, url: URL.createObjectURL(f) });
        added = true;
      }
      if (added) { ev.preventDefault(); renderPreview(); }
    });

    function addChange(v) {
      var entry = {
        id: Store.uid(), time: new Date().toISOString(), text: v, channel: channel.value,
        authority: authority.value, confirmedBy: by.value.trim(), confirmedAt: at.value,
        impact: impact.value,
      };
      withFile(t.id, file, entry, function (e) {
        (t.changes = t.changes || []).unshift(e);
        ctx.refresh();
        UI.toast(e.authority === AUTH_LEAD
          ? "Đã ghi nhận ngoại lệ theo quyết định Lead."
          : "Đã ghi nhận — chờ BA cập nhật BRS trước khi làm.");
      });
    }

    function addNote(v) {
      var note = { id: Store.uid(), time: new Date().toISOString(), text: v, images: [] };
      Promise.all(pending.map(function (p) { return ApiStore.saveFile(t.id, p.file); }))
        .then(function (refs) {
          note.images = refs;
          (t.notes = t.notes || []).unshift(note);
          pending.forEach(function (p) { URL.revokeObjectURL(p.url); });
          pending = [];
          ctx.refresh();
        })
        .catch(function (e) { UI.toast("Lưu ảnh lỗi: " + e.message); });
    }

    function add() {
      var v = text.value.trim();
      if (isChange()) {
        if (!v) { UI.toast("Nhập nội dung thay đổi."); return; }
        addChange(v);
        return;
      }
      if (!v && !pending.length) return;
      addNote(v);
    }

    return el("div", { class: "add-row" }, [
      ctx.fileRow("Loại:", kind),
      text,
      preview,
      changeRows,
      addButton("+ Thêm", add),
    ]);
  }

  function timelineItem(t, item, ctx) {
    if (item.kind === "note") return noteItem(t, item.note, ctx);
    if (item.kind === "adhoc") return adhocItem(t, item.change, ctx);

    var v = item.version;
    var b = item.brs;
    var body = el("div", { class: "entry__body" }, [
      el("div", { class: "chg-tags" }, [
        el("span", { class: "badge badge--accent", text: "Theo " + (b.kind || KIND_BRS) }),
        el("span", { class: "badge", text: (b.code || b.name) + " · " + (v.version || "—") }),
        v.impact ? el("span", { class: "badge " + (IMPACT_BADGE[v.impact] || ""), text: v.impact }) : null,
      ]),
      el("div", { html: UI.escWithLinks(v.changeSummary || "(không mô tả)") }),
      confirmLine(v),
    ]);
    if (v.file) body.appendChild(ctx.fileOpenBtn(t, v.file));
    return el("div", { class: "entry" }, [
      el("div", { class: "entry__head" }, [
        el("span", { class: "entry__time", text: UI.fmtDate(v.time) }),
        el("span", { class: "muted", text: "Sửa/xóa ở tab BRS/DD" }),
      ]),
      body,
    ]);
  }

  function noteItem(t, n, ctx) {
    var body = el("div", { class: "entry__body" }, [
      el("div", { class: "chg-tags" }, [el("span", { class: "badge", text: "Note" })]),
      n.text ? el("div", { html: UI.escWithLinks(n.text) }) : null,
    ]);
    var imgs = n.images || [];
    if (imgs.length) {
      var strip = el("div", { class: "note-imgs" });
      imgs.forEach(function (im) {
        strip.appendChild(el("img", {
          class: "note-img", src: ApiStore.fileUrl(t.id, im.storedAs), alt: im.name || "",
          title: "Bấm để mở ảnh đầy đủ",
          onclick: function () { ApiStore.openFile(t.id, im.storedAs); },
        }));
      });
      body.appendChild(strip);
    }
    return ctx.entryCard(t, "notes", n, body);
  }

  function adhocItem(t, c, ctx) {
    var body = el("div", { class: "entry__body" }, [
      el("div", { class: "chg-tags" }, [
        el("span", { class: "badge badge--warn", text: "Ngoài tài liệu" }),
        el("span", { class: "badge " + (AUTH_BADGE[c.authority || AUTH_PENDING] || ""),
          title: c.authority === AUTH_LEAD
            ? "Ngoại lệ hợp lệ — ưu tiên cao hơn BRS/DD"
            : "Chưa hợp thức — cần BA cập nhật BRS trước khi làm",
          text: c.authority || AUTH_PENDING }),
        c.channel ? el("span", { class: "badge", text: c.channel }) : null,
        c.impact ? el("span", { class: "badge " + (IMPACT_BADGE[c.impact] || ""), text: c.impact }) : null,
      ]),
      el("div", { html: UI.escWithLinks(c.text) }),
      confirmLine(c),
    ]);
    if (c.file) body.appendChild(ctx.fileOpenBtn(t, c.file));
    return ctx.entryCard(t, "changes", c, body);
  }

  window.Brs = {
    migrate: migrate,
    stats: stats,
    brsPanel: brsPanel,
    notesPanel: notesPanel,
  };
})();
