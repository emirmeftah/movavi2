const API = 'http://localhost:8000';

let credentials = null; // { email, password }

// ── Helpers ──────────────────────────────────────────────

function authHeader() {
  return 'Basic ' + btoa(credentials.email + ':' + credentials.password);
}

async function apiFetch(path, options = {}) {
  return fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(),
      ...(options.headers || {}),
    },
  });
}

// ── UI helpers ───────────────────────────────────────────

function showHabitsSection() {
  document.getElementById('login-section').hidden = true;
  document.getElementById('habits-section').hidden = false;
  document.getElementById('logout-btn').hidden = false;
}

function showLoginSection() {
  document.getElementById('login-section').hidden = false;
  document.getElementById('habits-section').hidden = true;
  document.getElementById('logout-btn').hidden = true;
}

function renderHabits(habits) {
  const list = document.getElementById('habits-list');
  if (habits.length === 0) {
    list.innerHTML = '<p class="habit-empty">Привычек пока нет. Добавьте первую!</p>';
    return;
  }
  list.innerHTML = habits
    .map(h => `<div class="habit-item"><span>${h.title}</span></div>`)
    .join('');
}

// ── API calls ────────────────────────────────────────────

async function loadHabits() {
  const res = await apiFetch('/habits');
  if (!res.ok) return;
  const habits = await res.json();
  renderHabits(habits);
}

async function addHabit(title) {
  const res = await apiFetch('/habits', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    document.getElementById('habit-error').textContent = 'Не удалось добавить привычку.';
    return;
  }
  document.getElementById('habit-error').textContent = '';
  await loadHabits();
}

async function tryLogin(email, password) {
  credentials = { email, password };
  const res = await fetch(API + '/habits', {
    headers: { 'Authorization': authHeader() },
  });
  return res.ok;
}

// ── Event listeners ──────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');

  const ok = await tryLogin(email, password);
  if (!ok) {
    errorEl.textContent = 'Неверный email или пароль.';
    credentials = null;
    return;
  }
  errorEl.textContent = '';
  showHabitsSection();
  await loadHabits();
});

document.getElementById('habit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('habit-name');
  await addHabit(input.value.trim());
  input.value = '';
});

document.getElementById('logout-btn').addEventListener('click', () => {
  credentials = null;
  document.getElementById('habits-list').innerHTML = '';
  document.getElementById('login-form').reset();
  showLoginSection();
});
