/* ============================================================
   apistore.js — client lưu task qua server.js (HTTP API)
   Dữ liệu sống trong ./tasks trên đĩa (do server ghi).
   Exposes: window.ApiStore
   ============================================================ */
(function () {
  "use strict";

  function req(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) { throw new Error("HTTP " + r.status + (t ? " — " + t : "")); });
      }
      return r;
    });
  }

  // -> { path, name } (đường dẫn thư mục lưu, dùng để xác nhận server chạy)
  function info() {
    return req("/api/info").then(function (r) { return r.json(); });
  }

  function loadAll() {
    return req("/api/tasks").then(function (r) { return r.json(); });
  }

  function saveTask(task) {
    return req("/api/tasks/" + encodeURIComponent(task.id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    }).then(function (r) { return r.json(); });
  }

  function deleteTask(id) {
    return req("/api/tasks/" + encodeURIComponent(id), { method: "DELETE" })
      .then(function (r) { return r.json(); });
  }

  // file: File/Blob -> { name, storedAs }
  function saveFile(taskId, file) {
    return req("/api/tasks/" + encodeURIComponent(taskId) + "/files?name=" + encodeURIComponent(file.name), {
      method: "POST",
      body: file,
    }).then(function (r) { return r.json(); });
  }

  function fileUrl(taskId, storedAs) {
    return "/api/tasks/" + encodeURIComponent(taskId) + "/files/" + encodeURIComponent(storedAs);
  }

  function openFile(taskId, storedAs) {
    window.open(fileUrl(taskId, storedAs), "_blank");
    return Promise.resolve();
  }

  window.ApiStore = {
    info: info,
    loadAll: loadAll,
    saveTask: saveTask,
    deleteTask: deleteTask,
    saveFile: saveFile,
    openFile: openFile,
    fileUrl: fileUrl,
  };
})();
