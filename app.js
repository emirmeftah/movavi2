const API      = 'http://localhost:8000';
const AUTH     = 'Basic ' + btoa('alice@test.com:alice123');

const form        = document.getElementById('task-form');
const nameInput   = document.getElementById('task-name');
const tasksList   = document.getElementById('tasks-list');
const errorMsg    = document.getElementById('error-msg');
const loadingMsg  = document.getElementById('loading-msg');
const analytics   = document.getElementById('analytics');
const statTotal   = document.getElementById('stat-total');
const statDone    = document.getElementById('stat-done');
const statPending = document.getElementById('stat-pending');
const statRate    = document.getElementById('stat-rate');


// ── Утилиты ─────────────────────────────────────────────────

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}
function hideError() { errorMsg.classList.add('hidden'); }
function showLoading() { loadingMsg.classList.remove('hidden'); }
function hideLoading() { loadingMsg.classList.add('hidden'); }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'short'
  });
}


// ── DOM-карточка задачи ──────────────────────────────────────

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card' + (task.completed ? ' completed' : '');
  card.dataset.id = task.id;

  // Название + дата
  const info = document.createElement('div');
  info.className = 'task-info';

  const nameEl = document.createElement('span');
  nameEl.className = 'task-name';
  nameEl.textContent = task.title;

  const dateEl = document.createElement('span');
  dateEl.className = 'task-date';
  dateEl.textContent = formatDate(task.created_at);

  info.appendChild(nameEl);
  info.appendChild(dateEl);

  // Кнопка "Выполнено" ✓
  const doneBtn = document.createElement('button');
  doneBtn.className = 'done-btn';
  doneBtn.title = task.completed ? 'Отменить' : 'Выполнено';
  doneBtn.addEventListener('click', () => toggleComplete(task.id, task.completed));

  // Кнопка удаления ×
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.title = 'Удалить';
  delBtn.addEventListener('click', () => deleteTask(task.id));

  card.appendChild(doneBtn);
  card.appendChild(info);
  card.appendChild(delBtn);

  return card;
}


// ── API-запросы ──────────────────────────────────────────────

async function loadTasks() {
  hideError();
  showLoading();
  try {
    const res = await fetch(`${API}/tasks`, {
      headers: { 'Authorization': AUTH },
    });
    if (!res.ok) throw new Error('Не удалось загрузить задачи');
    const tasks = await res.json();
    tasksList.innerHTML = '';
    tasks.forEach(t => tasksList.appendChild(createTaskCard(t)));
    await loadAnalytics();
  } catch (e) {
    showError(e.message);
  } finally {
    hideLoading();
  }
}

async function addTask(name) {
  hideError();
  try {
    const res = await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
      body: JSON.stringify({ title: name }),
    });
    if (!res.ok) throw new Error('Не удалось добавить задачу');
    const task = await res.json();
    tasksList.appendChild(createTaskCard(task));
    await loadAnalytics();
  } catch (e) {
    showError(e.message);
  }
}

async function toggleComplete(id, currentState) {
  hideError();
  try {
    const res = await fetch(`${API}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
      body: JSON.stringify({ completed: !currentState }),
    });
    if (!res.ok) throw new Error('Не удалось обновить задачу');
    const updated = await res.json();

    // Заменяем карточку на обновлённую (с нужным состоянием)
    const old = tasksList.querySelector(`[data-id="${id}"]`);
    if (old) old.replaceWith(createTaskCard(updated));
    await loadAnalytics();
  } catch (e) {
    showError(e.message);
  }
}

async function deleteTask(id) {
  hideError();
  try {
    const res = await fetch(`${API}/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': AUTH },
    });
    if (!res.ok) throw new Error('Не удалось удалить задачу');
    tasksList.querySelector(`[data-id="${id}"]`)?.remove();
    await loadAnalytics();
  } catch (e) {
    showError(e.message);
  }
}

async function loadAnalytics() {
  try {
    const res = await fetch(`${API}/tasks/analytics`, {
      headers: { 'Authorization': AUTH },
    });
    if (!res.ok) return;
    const data = await res.json();

    statTotal.textContent   = data.total;
    statDone.textContent    = data.completed;
    statPending.textContent = data.pending;
    statRate.textContent    = data.completion_rate + '%';

    // Показываем панель только если есть задачи
    analytics.classList.toggle('hidden', data.total === 0);
  } catch (_) {
    // аналитика не критична — молча игнорируем
  }
}


// ── События ──────────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  await addTask(name);
  nameInput.value = '';
});


// ── Старт ────────────────────────────────────────────────────

loadTasks();
