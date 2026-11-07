// ===================== НАСТРОЙКИ СЕРВИСА =====================
// Заполните значения ниже данными из вашего Firebase-проекта и
// Cloudinary-аккаунта (см. README.md — пошаговая инструкция).
//
// Пока здесь стоят значения-заглушки ("YOUR_..."), сайт работает
// в ДЕМО-РЕЖИМЕ: все данные сохраняются только в браузере (localStorage),
// ничего никуда не отправляется. Это удобно, чтобы сразу посмотреть,
// как сайт работает, перед тем как подключать настоящую базу данных.

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDn-Bli1aEfMtVa60HIoprfgGQhehXeWV4",
  authDomain: "kolloquium1-18298.firebaseapp.com",
  projectId: "kolloquium1-18298",
  storageBucket: "kolloquium1-18298.firebasestorage.app",
  messagingSenderId: "621123777047",
  appId: "1:621123777047:web:fceeb1461244944ddb2252",
};

// Email преподавателя — должен совпадать с пользователем, которого вы
// создадите в Firebase Authentication (Email/Password), и с тем email,
// который указан в правилах безопасности Firestore (firestore.rules).
window.ADMIN_EMAIL = "malkin.ai@misis.ru";

// Cloudinary используется только для хранения фото решений (бесплатно,
// без привязки карты). Создайте unsigned upload preset — см. README.md.
window.CLOUDINARY_CLOUD_NAME = "uvhnryaq";
window.CLOUDINARY_UPLOAD_PRESET = "KL1KR1";

// Название коллоквиума — отображается в шапке сайта.
window.SITE_TITLE = "Отработка ошибок — Коллоквиум 1 по микроэкономике";
