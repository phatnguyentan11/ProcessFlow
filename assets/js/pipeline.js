/* ============================================================
   pipeline.js — render a task's progress across process stages
   Exposes: window.Pipeline
   ============================================================ */
(function () {
  "use strict";

  // Core dev pipeline (subset of processes, in order). Bug-fix/hotfix/support
  // are situational and tracked via the task's "type", not the linear bar.
  var CORE_STAGE_IDS = [
    "task-reception", "analysis", "planning", "development",
    "code-review", "testing", "golive-prep", "golive",
  ];

  function stages() {
    var byId = {};
    Processes.getList().forEach(function (p) { byId[p.id] = p; });
    return CORE_STAGE_IDS.map(function (id, i) {
      return { id: id, order: i, name: byId[id] ? byId[id].name : id };
    });
  }

  function stageCount() { return CORE_STAGE_IDS.length; }

  function percent(task) {
    var idx = typeof task.stage === "number" ? task.stage : -1;
    // stage index is "current"; progress = completed stages / total
    var done = Math.max(0, idx);
    return Math.round((done / (stageCount() - 1 || 1)) * 100);
  }

  function stageName(task) {
    var s = stages();
    var idx = typeof task.stage === "number" ? task.stage : -1;
    if (idx < 0) return "Chưa bắt đầu";
    if (idx >= s.length) return "Hoàn tất";
    return s[idx].name;
  }

  // Interactive stepper. onChange(newIndex) is called when a step is clicked.
  function render(task, onChange) {
    var s = stages();
    var cur = typeof task.stage === "number" ? task.stage : -1;
    var wrap = UI.el("div", { class: "pipeline" });
    s.forEach(function (st, i) {
      var cls = "pipe-step";
      if (i < cur) cls += " done";
      else if (i === cur) cls += " current";
      var short = String(i + 1);
      var step = UI.el("div", {
        class: cls,
        title: st.name + " — bấm để đánh dấu đang ở bước này",
        onclick: function () {
          // click current stage again → mark it as completed (advance past it)
          onChange(i === cur ? i + 1 : i);
        },
      }, [
        UI.el("div", { class: "pipe-dot", text: i < cur ? "✓" : short }),
        UI.el("div", { class: "pipe-step__label", text: st.name }),
      ]);
      wrap.appendChild(step);
    });
    return wrap;
  }

  window.Pipeline = {
    render: render,
    percent: percent,
    stageName: stageName,
    stageCount: stageCount,
  };
})();
