// ===================== BACKEND =====================
// Единый интерфейс работы с данными. В демо-режиме (пока в config.js
// стоят значения-заглушки) всё хранится в localStorage браузера.
// Как только вы впишете реальные ключи Firebase/Cloudinary в config.js,
// сайт автоматически начнёт использовать настоящую базу данных.

(function () {
  const isDemo = !window.FIREBASE_CONFIG || String(window.FIREBASE_CONFIG.apiKey || "").startsWith("YOUR_");
  window.IS_DEMO_MODE = isDemo;

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  // ---------------- DEMO BACKEND (localStorage) ----------------
  const DemoBackend = {
    _read(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    _write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* ignore (private mode etc.) */
      }
    },

    async upsertStudent({ login, name, group }) {
      const students = this._read("demo_students", {});
      students[login] = { login, name, group, updatedAt: Date.now() };
      this._write("demo_students", students);
      return { ok: true };
    },

    async createSubmission({ login, name, group, taskKey, taskTitle, problemId }) {
      const subs = this._read("demo_submissions", []);
      const id = uid("sub");
      subs.push({
        id, login, name, group, taskKey, taskTitle, problemId,
        attempts: 0, correct: false, lastAnswer: null, photoUrl: null,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      this._write("demo_submissions", subs);
      return { id };
    },

    async recordAttempt({ submissionId, answer, correct, attempts }) {
      const subs = this._read("demo_submissions", []);
      const s = subs.find((x) => x.id === submissionId);
      if (s) {
        s.attempts = attempts;
        s.lastAnswer = answer;
        s.correct = correct;
        s.updatedAt = Date.now();
        this._write("demo_submissions", subs);
      }
      return { ok: true };
    },

    async attachPhoto({ submissionId, file }) {
      // In demo mode we just keep a local object URL (not persisted across reloads).
      const url = URL.createObjectURL(file);
      const subs = this._read("demo_submissions", []);
      const s = subs.find((x) => x.id === submissionId);
      if (s) {
        s.photoUrl = url;
        s.updatedAt = Date.now();
        this._write("demo_submissions", subs);
      }
      return { url };
    },

    async adminSignIn(_email, password) {
      if (password === "demo") return { ok: true };
      throw new Error("В демо-режиме пароль администратора: demo");
    },

    async adminFetchAll() {
      return {
        students: Object.values(this._read("demo_students", {})),
        submissions: this._read("demo_submissions", []),
      };
    },
  };

  // ---------------- FIREBASE BACKEND ----------------
  const FirebaseBackend = {
    _app: null,
    _db: null,
    _auth: null,

    _init() {
      // Guard on _db (not _app): if a previous attempt threw partway through
      // (e.g. "Firebase App named '[DEFAULT]' already exists" after Safari
      // suspends/reloads the tab while a photo upload is in flight), _app
      // could end up set while _db never did — which used to permanently
      // disable the database for the rest of the session. Also reuse an
      // already-registered app instead of re-calling initializeApp, so a
      // stray duplicate init never throws in the first place.
      if (this._db) return;
      try {
        this._app = firebase.apps && firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(window.FIREBASE_CONFIG);
        this._db = firebase.firestore();
        this._auth = firebase.auth();
      } catch (e) {
        this._app = null;
        this._db = null;
        this._auth = null;
        throw new Error("Не удалось подключиться к базе данных. Проверьте интернет-соединение и обновите страницу. (" + e.message + ")");
      }
    },

    async upsertStudent({ login, name, group }) {
      this._init();
      await this._db.collection("students").doc(login).set(
        { login, name, group, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
      return { ok: true };
    },

    async createSubmission({ login, name, group, taskKey, taskTitle, problemId }) {
      this._init();
      const ref = await this._db.collection("submissions").add({
        login, name, group, taskKey, taskTitle, problemId,
        attempts: 0, correct: false, lastAnswer: null, photoUrl: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { id: ref.id };
    },

    async recordAttempt({ submissionId, answer, correct, attempts }) {
      this._init();
      await this._db.collection("submissions").doc(submissionId).update({
        attempts,
        lastAnswer: answer,
        correct,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true };
    },

    async attachPhoto({ submissionId, file, login, problemId }) {
      this._init();
      const url = await uploadToCloudinary(file, login, problemId);
      await this._db.collection("submissions").doc(submissionId).update({
        photoUrl: url,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { url };
    },

    async adminSignIn(email, password) {
      this._init();
      await this._auth.signInWithEmailAndPassword(email, password);
      return { ok: true };
    },

    async adminFetchAll() {
      this._init();
      const [studentsSnap, subsSnap] = await Promise.all([
        this._db.collection("students").get(),
        this._db.collection("submissions").orderBy("createdAt", "desc").get(),
      ]);
      const students = studentsSnap.docs.map((d) => d.data());
      const submissions = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { students, submissions };
    },
  };

  async function uploadToCloudinary(file, login, problemId) {
    const url = `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/image/upload`;
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", window.CLOUDINARY_UPLOAD_PRESET);
    form.append("folder", `colloquium1/${login}`);
    form.append("context", `problem=${problemId}|login=${login}`);
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) throw new Error("Не удалось загрузить фото (проверьте настройки Cloudinary).");
    const data = await res.json();
    return data.secure_url;
  }

  // Note: DemoBackend.attachPhoto signature differs slightly (no login/problemId
  // needed) — both are called the same way from app.js, extra args are ignored.
  window.Backend = isDemo ? DemoBackend : FirebaseBackend;
})();
