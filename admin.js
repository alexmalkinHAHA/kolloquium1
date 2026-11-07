(function () {
  const $ = (id) => document.getElementById(id);
  let allSubs = [];

  const TASK_LABEL = {
    t1: "Задача 1 (Тема 2)", t2: "Задача 2 (Тема 3)", t3: "Задача 3 (Тема 4)",
    t4: "Задача 4 (Тема 5)", t5: "Задача 5 (Тема 5)", t6: "Задача 6 (Тема 6)",
  };

  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
  }

  function fmtDate(v) {
    if (!v) return "—";
    if (typeof v === "number") return new Date(v).toLocaleString("ru-RU");
    if (v.toDate) return v.toDate().toLocaleString("ru-RU");
    if (v.seconds) return new Date(v.seconds * 1000).toLocaleString("ru-RU");
    return String(v);
  }

  async function init() {
    if (window.IS_DEMO_MODE) {
      $("demoBanner").hidden = false;
      $("aEmail").closest("label").style.display = "none";
    }
    $("signinForm").addEventListener("submit", onSignIn);
    $("btnRefresh").addEventListener("click", loadData);
    $("btnCsv").addEventListener("click", downloadCsv);
    $("fSearch").addEventListener("input", renderTable);
    $("fTask").addEventListener("change", renderTable);
    $("fStatus").addEventListener("change", renderTable);
  }

  async function onSignIn(e) {
    e.preventDefault();
    $("signinError").textContent = "";
    try {
      await window.Backend.adminSignIn($("aEmail").value.trim(), $("aPass").value);
      show("screen-data");
      await loadData();
    } catch (err) {
      $("signinError").textContent = err.message || "Ошибка входа";
    }
  }

  async function loadData() {
    const { submissions } = await window.Backend.adminFetchAll();
    allSubs = submissions;
    renderStats();
    renderTable();
  }

  function renderStats() {
    const total = allSubs.length;
    const correct = allSubs.filter((s) => s.correct).length;
    const withPhoto = allSubs.filter((s) => s.photoUrl).length;
    const logins = new Set(allSubs.map((s) => s.login));
    $("statRow").innerHTML = [
      ["Студентов", logins.size],
      ["Всего попыток-задач", total],
      ["Решено верно", correct],
      ["С фото решения", withPhoto],
    ]
      .map(([label, val]) => `<div class="stat-pill"><b>${val}</b>${label}</div>`)
      .join("");
  }

  function renderTable() {
    const q = $("fSearch").value.trim().toLowerCase();
    const taskF = $("fTask").value;
    const statusF = $("fStatus").value;

    const rows = allSubs.filter((s) => {
      if (taskF && s.taskKey !== taskF) return false;
      if (statusF === "ok" && !s.correct) return false;
      if (statusF === "no" && s.correct) return false;
      if (q) {
        const hay = `${s.name} ${s.login} ${s.group}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    $("dataBody").innerHTML = rows
      .map(
        (s) => `
      <tr>
        <td>${esc(s.name)}</td>
        <td>${esc(s.group)}</td>
        <td>${esc(s.login)}</td>
        <td>${TASK_LABEL[s.taskKey] || s.taskKey}</td>
        <td>${esc(s.problemId)}</td>
        <td>${s.attempts ?? 0}</td>
        <td>${s.correct ? '<span class="tag-ok">Верно</span>' : '<span class="tag-no">—</span>'}</td>
        <td>${s.photoUrl ? `<a href="${s.photoUrl}" target="_blank" rel="noopener"><img class="thumb" src="${s.photoUrl}" /></a>` : "—"}</td>
        <td>${fmtDate(s.updatedAt)}</td>
      </tr>`
      )
      .join("");
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function downloadCsv() {
    const header = ["ФИО", "Группа", "Логин", "Задача", "ID задачи", "Попыток", "Верно", "ФотоURL", "Обновлено"];
    const lines = [header.join(";")];
    allSubs.forEach((s) => {
      lines.push(
        [s.name, s.group, s.login, TASK_LABEL[s.taskKey] || s.taskKey, s.problemId, s.attempts ?? 0, s.correct ? "да" : "нет", s.photoUrl || "", fmtDate(s.updatedAt)]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      );
    });
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kolloquium1_results.csv";
    a.click();
  }

  init();
})();
