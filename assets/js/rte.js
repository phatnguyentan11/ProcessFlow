/* ============================================================
   rte.js — ô soạn thảo có định dạng (kiểu Word) + sanitize HTML
   Exposes: window.Rte
   Entry lưu HTML có cờ fmt:"html"; entry cũ (chữ thuần) vẫn hiển thị qua escWithLinks.
   ============================================================ */
(function () {
  "use strict";

  var el = UI.el;

  /* ---------- sanitize: whitelist thẻ, bỏ mọi attribute (trừ href http/https của <a>) ---------- */
  var ALLOWED = {
    B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, P: 1, DIV: 1, BR: 1,
    UL: 1, OL: 1, LI: 1, H3: 1, H4: 1, BLOCKQUOTE: 1, A: 1, CODE: 1, PRE: 1,
  };
  // Bỏ cả thẻ lẫn nội dung bên trong; thẻ lạ khác chỉ bị "bóc vỏ" (giữ phần con).
  var DROP = {
    SCRIPT: 1, STYLE: 1, HEAD: 1, TITLE: 1, META: 1, LINK: 1, IFRAME: 1, OBJECT: 1,
    EMBED: 1, SVG: 1, MATH: 1, TEMPLATE: 1, NOSCRIPT: 1, IMG: 1, VIDEO: 1, AUDIO: 1,
    INPUT: 1, TEXTAREA: 1, SELECT: 1, BUTTON: 1, FORM: 1,
  };
  var URL_RE = /(https?:\/\/[^\s<]+)/g;

  function safeHref(href) {
    return /^https?:\/\//i.test(String(href || "").trim()) ? String(href).trim() : null;
  }

  function link(href, children) {
    var a = document.createElement("a");
    a.setAttribute("href", href);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
    children.forEach(function (c) { a.appendChild(c); });
    return a;
  }

  // Text node ngoài <a>: tự biến URL trần thành link (giống escWithLinks).
  function textNodes(text, inLink) {
    if (inLink) return [document.createTextNode(text)];
    // split với nhóm bắt → phần tử lẻ là URL, phần tử chẵn là chữ thường.
    return text.split(URL_RE).map(function (part, i) {
      return i % 2 ? link(part, [document.createTextNode(part)]) : document.createTextNode(part);
    }).filter(function (n) { return n.nodeType !== 3 || n.nodeValue; });
  }

  function cleanChildren(src, inLink) {
    var out = [];
    Array.prototype.forEach.call(src.childNodes, function (n) {
      if (n.nodeType === 3) { out = out.concat(textNodes(n.nodeValue, inLink)); return; }
      if (n.nodeType !== 1) return; // comment, processing instruction…
      var tag = n.tagName.toUpperCase();
      if (DROP[tag]) return;
      if (!ALLOWED[tag]) { out = out.concat(cleanChildren(n, inLink)); return; }
      if (tag === "A") {
        var href = safeHref(n.getAttribute("href"));
        var kids = cleanChildren(n, true);
        out = href ? out.concat([link(href, kids)]) : out.concat(kids);
        return;
      }
      var copy = document.createElement(tag.toLowerCase());
      cleanChildren(n, inLink).forEach(function (c) { copy.appendChild(c); });
      out.push(copy);
    });
    return out;
  }

  function sanitize(html) {
    // DOMParser tạo document "trơ": không chạy script, không tải ảnh.
    var doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    var box = document.createElement("div");
    cleanChildren(doc.body, false).forEach(function (c) { box.appendChild(c); });
    return box.innerHTML;
  }

  // HTML an toàn để hiển thị / nạp vào editor, cho cả entry mới (html) lẫn cũ (chữ thuần).
  function toHtml(entry, field) {
    var v = entry[field] || "";
    return entry.fmt === "html" ? sanitize(v) : UI.escWithLinks(v).replace(/\n/g, "<br>");
  }

  function view(entry, field) {
    return el("div", { class: "rte-content", html: toHtml(entry, field) });
  }

  /* ---------- editor ---------- */
  var TOOLS = [
    { label: "B", title: "In đậm (Ctrl+B)", cls: "rte-b", cmd: "bold" },
    { label: "I", title: "In nghiêng (Ctrl+I)", cls: "rte-i", cmd: "italic" },
    { label: "U", title: "Gạch chân (Ctrl+U)", cls: "rte-u", cmd: "underline" },
    { label: "S", title: "Gạch ngang", cls: "rte-s", cmd: "strikeThrough" },
    null,
    { label: "H", title: "Tiêu đề", block: "H3" },
    { label: "• List", title: "Danh sách chấm", cmd: "insertUnorderedList" },
    { label: "1. List", title: "Danh sách số", cmd: "insertOrderedList" },
    { label: "❝", title: "Trích dẫn", block: "BLOCKQUOTE" },
    null,
    { label: "🔗", title: "Chèn link", link: true },
    { label: "⌫ Định dạng", title: "Xóa định dạng", cmd: "removeFormat" },
  ];

  function currentBlock(editable) {
    var sel = window.getSelection();
    var n = sel && sel.anchorNode;
    while (n && n !== editable) {
      if (n.nodeType === 1 && (n.tagName === "H3" || n.tagName === "BLOCKQUOTE")) return n.tagName;
      n = n.parentNode;
    }
    return null;
  }

  function run(tool, editable) {
    editable.focus();
    if (tool.block) {
      // Bấm lại lần nữa → trả về đoạn thường.
      var target = currentBlock(editable) === tool.block ? "DIV" : tool.block;
      document.execCommand("formatBlock", false, "<" + target + ">");
    } else if (tool.link) {
      var href = safeHref(window.prompt("Địa chỉ link (http/https):", "https://"));
      if (!href) { UI.toast("Link phải bắt đầu bằng http:// hoặc https://"); return; }
      document.execCommand("createLink", false, href);
    } else {
      document.execCommand(tool.cmd, false, null);
    }
  }

  function toolbar(editable) {
    return el("div", { class: "rte-toolbar" }, TOOLS.map(function (tool) {
      if (!tool) return el("span", { class: "rte-sep" });
      var btn = el("button", {
        class: "rte-btn " + (tool.cls || ""), type: "button", title: tool.title, text: tool.label,
      });
      // mousedown + preventDefault để không mất vùng chọn trong ô soạn thảo.
      btn.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      btn.addEventListener("click", function () { run(tool, editable); });
      return btn;
    }));
  }

  function onPaste(ev) {
    var cd = ev.clipboardData;
    if (!cd) return;
    ev.preventDefault(); // luôn tự chèn bản đã lọc; ảnh (nếu có) do listener riêng xử lý
    var html = cd.getData("text/html");
    var clean = html
      ? sanitize(html)
      : UI.esc(cd.getData("text/plain")).replace(/\r?\n/g, "<br>");
    if (clean) document.execCommand("insertHTML", false, clean);
  }

  function isEmptyNode(editable) {
    return !editable.textContent.trim() && !editable.querySelector("li");
  }

  // Trả về { node, editable, getHtml, isEmpty, focus }.
  function create(initialHtml, placeholder) {
    var editable = el("div", {
      class: "rte-editable", contenteditable: "true", role: "textbox",
      "aria-multiline": "true", "data-placeholder": placeholder || "",
      html: initialHtml ? sanitize(initialHtml) : "",
    });
    editable.addEventListener("paste", onPaste);
    // Xóa hết chữ thường để lại <br> thừa → dọn để placeholder hiện lại.
    editable.addEventListener("input", function () {
      if (isEmptyNode(editable)) editable.innerHTML = "";
    });
    return {
      node: el("div", { class: "rte" }, [toolbar(editable), editable]),
      editable: editable,
      getHtml: function () { return isEmptyNode(editable) ? "" : sanitize(editable.innerHTML); },
      isEmpty: function () { return isEmptyNode(editable); },
      focus: function () { editable.focus(); },
    };
  }

  // Khối sửa tại chỗ cho 1 entry: editor + Lưu/Hủy. onSave() được gọi sau khi đã ghi vào entry.
  function editBlock(entry, field, opts) {
    var editor = create(toHtml(entry, field), opts.placeholder);
    setTimeout(editor.focus, 0);
    return el("div", { class: "rte-edit" }, [
      editor.node,
      el("div", { class: "right" }, [
        el("button", { class: "btn btn--sm", type: "button", text: "Hủy", onclick: opts.onCancel }),
        el("button", {
          class: "btn btn--primary btn--sm", type: "button", text: "Lưu",
          onclick: function () {
            if (opts.required && editor.isEmpty()) { UI.toast("Nội dung không được để trống."); return; }
            entry[field] = editor.getHtml();
            entry.fmt = "html";
            entry.editedAt = new Date().toISOString();
            opts.onSave();
          },
        }),
      ]),
    ]);
  }

  window.Rte = {
    create: create,
    sanitize: sanitize,
    toHtml: toHtml,
    view: view,
    editBlock: editBlock,
  };
})();
