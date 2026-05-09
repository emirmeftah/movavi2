// ════════════════════════════════════════════════════════════
//  Трекер задач — клиентская логика
//  Бэкенд: FastAPI на http://localhost:8000
//  Эндпоинты: GET /tasks, POST /tasks, DELETE /tasks/{id}
// ════════════════════════════════════════════════════════════

// Базовый URL API
const API = 'http://localhost:8000';

// user_id = 1 захардкожен — это тестовый пользователь alice@test.com.
// Бэкенд использует Basic Auth, поэтому шлём заголовок с креденшелами.
const USER_ID = 1;
const AUTH = 'Basic ' + btoa('alice@test.com:alice123');

// Ссылки на DOM-элементы
const form        = document.getElementById('task-form');
const nameInput   = document.getElementById('task-name');
const tasksList   = document.getElementById('tasks-list');
const errorMsg    = document.getElementById('error-msg');
const loadingMsg  = document.getElementById('loading-msg');


// ── Утилиты для UI ──────────────────────────────────────────

// Показать сообщение об ошибке
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
}

// Скрыть сообщение об ошибке
function hideError() {
  errorMsg.classList.add('hidden');
}

// Показать индикатор загрузки
function showLoading() {
  loadingMsg.classList.remove('hidden');
}

// Скрыть индикатор загрузки
function hideLoading() {
  loadingMsg.classList.add('hidden');
}

// Преобразовать ISO-дату в человекочитаемый формат "ДД.ММ.ГГГГ"
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU');
}


// ── Создание DOM-карточки задачи ────────────────────────────

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.id = task.id; // запоминаем id, чтобы потом найти карточку

  // Блок с названием и датой
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

  // Кнопка удаления
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  card.appendChild(info);
  card.appendChild(deleteBtn);

  return card;
}


// ── Запросы к API ───────────────────────────────────────────

// Загрузить все задачи и отрисовать их
async function loadTasks() {
  hideError();
  showLoading();

  try {
    const res = await fetch(`${API}/tasks`, {
      headers: { 'Authorization': AUTH },
    });

    if (!res.ok) {
      throw new Error('Не удалось загрузить задачи');
    }

    const tasks = await res.json();

    // Очищаем список и рендерим карточки
    tasksList.innerHTML = '';
    tasks.forEach(task => {
      tasksList.appendChild(createTaskCard(task));
    });
  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

// Добавить новую задачу
async function addTask(name) {
  hideError();

  try {
    const res = await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH,
      },
      // user_id определяется по AUTH-заголовку, в теле — только название
      body: JSON.stringify({ title: name, user_id: USER_ID }),
    });

    if (!res.ok) {
      throw new Error('Не удалось добавить задачу');
    }

    const task = await res.json();

    // Добавляем карточку в DOM без перезагрузки
    tasksList.appendChild(createTaskCard(task));
  } catch (err) {
    showError(err.message);
  }
}

// Удалить задачу
async function deleteTask(id) {
  hideError();

  try {
    const res = await fetch(`${API}/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': AUTH },
    });

    if (!res.ok) {
      throw new Error('Не удалось удалить задачу');
    }

    // Убираем карточку из DOM по data-id
    const card = tasksList.querySelector(`[data-id="${id}"]`);
    if (card) card.remove();
  } catch (err) {
    showError(err.message);
  }
}


// ── Обработчики событий ─────────────────────────────────────

// Сабмит формы — добавить задачу
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // не перезагружаем страницу

  const name = nameInput.value.trim();
  if (!name) return;

  await addTask(name);
  nameInput.value = ''; // очищаем поле после добавления
});


// ── Старт ───────────────────────────────────────────────────

// При загрузке страницы сразу подгружаем список задач
loadTasks();
