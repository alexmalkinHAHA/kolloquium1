(function () {
  const TASKS = [
    { key: "t1", num: 1, topic: "Тема 2", short: "Равновесие потребителя (таблица TU)" },
    { key: "t2", num: 2, topic: "Тема 3", short: "Кривая безразличия" },
    { key: "t3", num: 3, topic: "Тема 4", short: "Изменение цены / бюджетная линия" },
    { key: "t4", num: 4, topic: "Тема 5", short: "Эластичность спроса" },
    { key: "t5", num: 5, topic: "Тема 5", short: "Равновесие спроса и предложения" },
    { key: "t6", num: 6, topic: "Тема 6", short: "TP / AP / MP" },
  ];
  const COUNT = { full: 0, half: 3, none: 6 };
  const LABEL = { full: "Решено полностью", half: "Решено наполовину", none: "Не решено" };

  let BANK = null;
  let student = null; // {name, group, login}
  let assessState = {}; // key -> 'full'|'half'|'none'
  let queue = []; // [{taskKey, taskTitle, problem, subId, attempts, correct, photoAttached}]
  let qi = 0;

  const $ = (id) => document.getElementById(id);

  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sample(arr, n) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  // -------------------- persistence (survives reload / re-login) --------------------
  function sessionKey() {
    return student ? `session_${student.login}` : null;
  }

  function saveSession(phase) {
    const key = sessionKey();
    if (!key) return;
    localStorage.setItem(
      key,
      JSON.stringify({ phase, assessState, queue, qi })
    );
  }

  function loadSession() {
    const key = sessionKey();
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    const key = sessionKey();
    if (key) localStorage.removeItem(key);
  }

  // -------------------- init --------------------
  async function init() {
    if (window.SITE_TITLE) $("siteTitle").textContent = window.SITE_TITLE;
    if (window.IS_DEMO_MODE) $("demoBanner").hidden = false;

    const res = await fetch("bank.json");
    BANK = await res.json();

    const saved = localStorage.getItem("student");
    if (saved) {
      student = JSON.parse(saved);
      resumeOrShowAssess();
    }

    $("loginForm").addEventListener("submit", onLogin);
    $("btnBuildPlan").addEventListener("click", onBuildPlan);
    $("btnStartPractice").addEventListener("click", onStartPractice);
    $("btnCheck").addEventListener("click", onCheck);
    $("btnNext").addEventListener("click", onNext);
    $("btnRestart").addEventListener("click", () => {
      assessState = {};
      queue = [];
      qi = 0;
      clearSession();
      renderAssessScreen();
      show("screen-assess");
    });
    $("photoInput").addEventListener("change", onPhotoChosen);
  }

  // Resume an in-progress practice session (e.g. after reload / re-login),
  // instead of always restarting from the self-assessment questionnaire.
  function resumeOrShowAssess() {
    const sess = loadSession();
    if (sess && sess.phase === "practice" && Array.isArray(sess.queue) && sess.queue.length) {
      assessState = sess.assessState || {};
      queue = sess.queue;
      qi = Math.min(sess.qi || 0, queue.length - 1);
      show("screen-practice");
      renderProblem(true);
      return;
    }
    if (sess && sess.phase === "plan" && Array.isArray(sess.queue)) {
      assessState = sess.assessState || {};
      queue = sess.queue;
      renderPlanScreen();
      show("screen-plan");
      return;
    }
    renderAssessScreen();
    show("screen-assess");
  }

  // -------------------- screen 1: login --------------------
  async function onLogin(e) {
    e.preventDefault();
    const name = $("fName").value.trim();
    const group = $("fGroup").value.trim();
    const login = $("fLogin").value.trim();
    if (!name || !group || !login) return;
    student = { name, group, login };
    localStorage.setItem("student", JSON.stringify(student));
    try {
      await window.Backend.upsertStudent(student);
    } catch (err) {
      alert("Не удалось сохранить профиль: " + err.message);
    }
    resumeOrShowAssess();
  }

  // -------------------- screen 2: self-assessment --------------------
  function renderAssessScreen() {
    const host = $("assessForm");
    host.innerHTML = "";
    TASKS.forEach((t) => {
      const row = document.createElement("div");
      row.className = "task-row";
      row.innerHTML = `
        <div class="task-title">Задача ${t.num} — ${t.topic}</div>
        <div class="task-sub">${t.short}</div>
        <div class="radio-group" data-key="${t.key}">
          ${["full", "half", "none"]
            .map(
              (v) => `
            <label class="radio-opt">
              <input type="radio" name="t_${t.key}" value="${v}" />
              ${LABEL[v]}
            </label>`
            )
            .join("")}
        </div>`;
      host.appendChild(row);
    });
    host.addEventListener("change", (e) => {
      if (e.target.name && e.target.name.startsWith("t_")) {
        const key = e.target.name.slice(2);
        assessState[key] = e.target.value;
        host.querySelectorAll(`.radio-group[data-key="${key}"] .radio-opt`).forEach((el) => {
          el.classList.toggle("checked", el.querySelector("input").checked);
        });
      }
    });
  }

  function renderPlanScreen() {
    const host = $("planSummary");
    if (queue.length === 0) {
      host.innerHTML = `<p>Все задачи отмечены как решённые полностью — тренировка не нужна. Отличная работа! 🎉</p>`;
      $("btnStartPractice").hidden = true;
      return;
    }
    const counts = {};
    queue.forEach((it) => (counts[it.taskKey] = (counts[it.taskKey] || 0) + 1));
    host.innerHTML =
      TASKS.map((t) => {
        const status = assessState[t.key];
        const n = counts[t.key] || 0;
        return `<div class="plan-row"><span>Задача ${t.num} (${t.topic}) — ${LABEL[status] || "—"}</span><span class="n">${n ? n + " зад." : "—"}</span></div>`;
      }).join("") +
      `<div class="plan-row" style="border-top:1px solid var(--border);margin-top:8px;padding-top:10px;"><span><b>Итого к решению</b></span><span class="n">${queue.length}</span></div>`;
    $("btnStartPractice").hidden = false;
  }

  function onBuildPlan() {
    const missing = TASKS.filter((t) => !assessState[t.key]);
    if (missing.length) {
      alert("Отметьте, пожалуйста, статус для всех 6 задач.");
      return;
    }
    queue = [];
    TASKS.forEach((t) => {
      const status = assessState[t.key];
      const n = COUNT[status];
      if (n > 0) {
        const picked = sample(BANK[t.key].items, n);
        picked.forEach((p) => {
          queue.push({
            taskKey: t.key,
            taskTitle: `Задача ${t.num} — ${t.topic}`,
            problem: p,
            attempts: 0,
            correct: false,
            photoAttached: false,
          });
        });
      }
    });
    qi = 0;
    renderPlanScreen();
    saveSession("plan");
    show("screen-plan");
  }

  // -------------------- screen 3 -> 4: practice --------------------
  function onStartPractice() {
    qi = 0;
    saveSession("practice");
    show("screen-practice");
    renderProblem();
  }

  async function renderProblem(isResume) {
    const item = queue[qi];
    if (!item.attempts) item.attempts = 0;
    $("progressLabel").textContent = `Задача ${qi + 1} из ${queue.length} · ${item.taskTitle}`;
    $("progressFill").style.width = `${Math.round((qi / queue.length) * 100)}%`;
    $("problemTag").textContent = item.taskTitle;
    $("problemText").textContent = item.problem.text;

    const inputsHost = $("answerForm");
    inputsHost.innerHTML = item.problem.inputs
      .map(
        (inp) => `<label>${inp.label}
          <input type="number" step="1" data-key="${inp.key}" />
        </label>`
      )
      .join("");

    if (item.correct) {
      // Resuming on a problem already answered correctly: restore that state
      // instead of presenting a blank form again.
      const fb = $("feedback");
      fb.hidden = false;
      fb.className = "feedback good";
      fb.textContent = "Верно! Можете приложить фото вашего решения.";
      $("photoZone").hidden = false;
      $("btnCheck").hidden = true;
      $("btnNext").hidden = false;
      $("btnNext").disabled = !item.photoAttached;
      $("photoStatus").textContent = item.photoAttached ? "Фото загружено ✓" : "";
    } else {
      $("feedback").hidden = true;
      $("photoZone").hidden = true;
      $("photoStatus").textContent = "";
      $("btnCheck").hidden = false;
      $("btnCheck").disabled = false;
      $("btnNext").hidden = true;
      $("btnNext").disabled = true;
    }
    $("photoInput").value = "";

    if (!item.subId) {
      try {
        const { id } = await window.Backend.createSubmission({
          login: student.login,
          name: student.name,
          group: student.group,
          taskKey: item.taskKey,
          taskTitle: item.taskTitle,
          problemId: item.problem.id,
        });
        item.subId = id;
        saveSession("practice");
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function onCheck() {
    const item = queue[qi];
    const inputs = Array.from($("answerForm").querySelectorAll("input"));
    const answer = {};
    let allFilled = true;
    inputs.forEach((inp) => {
      const v = inp.value.trim();
      if (v === "") allFilled = false;
      answer[inp.dataset.key] = Number(v);
    });
    if (!allFilled) {
      alert("Заполните, пожалуйста, все поля ответа.");
      return;
    }
    const correct = Object.keys(item.problem.answer).every(
      (k) => answer[k] === item.problem.answer[k]
    );
    item.attempts += 1;
    item.correct = correct;

    const fb = $("feedback");
    fb.hidden = false;
    if (correct) {
      fb.className = "feedback good";
      fb.textContent = "Верно! Теперь приложите фото вашего решения — без фото перейти к следующей задаче нельзя.";
      $("photoZone").hidden = false;
      $("btnCheck").hidden = true;
      $("btnNext").hidden = false;
      $("btnNext").disabled = !item.photoAttached;
    } else {
      fb.className = "feedback bad";
      fb.textContent = "Пока неверно. Проверьте расчёт и попробуйте ещё раз.";
    }
    saveSession("practice");

    try {
      await window.Backend.recordAttempt({
        submissionId: item.subId,
        answer,
        correct,
        attempts: item.attempts,
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function onPhotoChosen(e) {
    const file = e.target.files[0];
    if (!file) return;
    const item = queue[qi];
    $("photoStatus").textContent = "Загрузка…";
    try {
      await window.Backend.attachPhoto({
        submissionId: item.subId,
        file,
        login: student.login,
        problemId: item.problem.id,
      });
      item.photoAttached = true;
      $("photoStatus").textContent = "Фото загружено ✓";
      if (item.correct) $("btnNext").disabled = false;
      saveSession("practice");
    } catch (err) {
      $("photoStatus").textContent = "Не удалось загрузить фото: " + err.message;
    }
  }

  function onNext() {
    const item = queue[qi];
    if (!item.correct || !item.photoAttached) {
      // Safety net: Next must stay disabled until both conditions hold,
      // but guard here too in case it was somehow enabled.
      return;
    }
    qi += 1;
    if (qi >= queue.length) {
      finishPractice();
    } else {
      saveSession("practice");
      renderProblem();
    }
  }

  function finishPractice() {
    $("progressFill").style.width = "100%";
    const total = queue.length;
    clearSession();
    $("doneSummary").innerHTML = `
      <p>Вы прошли тренировку из <b>${total}</b> ${total === 1 ? "задачи" : "задач"}.</p>
      <p class="muted">Результаты сохранены и доступны преподавателю.</p>`;
    show("screen-done");
  }

  init();
})();
