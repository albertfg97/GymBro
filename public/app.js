(function () {
  const API = '/api';

  let token = localStorage.getItem('gymbro-token');
  let currentUser = null;
  let allExercises = [];
  let activeFilter = 'all';
  let focusIndex = 0;

  /* ---------- helpers ---------- */
  async function api(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error del servidor');
    return data;
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.hidden = true);
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    setTimeout(() => el.hidden = true, 4000);
  }

  function showSuccess(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    setTimeout(() => el.hidden = true, 3000);
  }

  const diffLabels = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };

  /* ---------- render exercises ---------- */
  function renderGrid(filter) {
    const grid = document.getElementById('grid');
    const filtered = filter === 'all'
      ? allExercises
      : allExercises.filter(e => e.category === filter);

    grid.innerHTML = filtered.map((ex, i) => `
      <button class="card" data-id="${ex.id}" tabindex="0" data-index="${i}">
        <span class="card-icon">${ex.icon}</span>
        <span class="card-title">${ex.name}</span>
        <span class="card-desc">${ex.description}</span>
        <span class="card-meta">
          <span>⏱ ${ex.duration} min</span>
          <span class="diff-${ex.difficulty}">${diffLabels[ex.difficulty]}</span>
          <span>+${ex.points} XP</span>
        </span>
      </button>
    `).join('');

    focusIndex = 0;
    if (grid.firstElementChild) grid.firstElementChild.focus();
  }

  /* ---------- filters ---------- */
  function setupFilters() {
    const bar = document.querySelector('.filter-bar');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-filter');
      if (!btn) return;
      document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderGrid(activeFilter);
    });
  }

  /* ---------- auth guard ---------- */
  async function restoreSession() {
    if (!token) return false;
    try {
      currentUser = await api('GET', '/profile');
      return true;
    } catch {
      token = null;
      localStorage.removeItem('gymbro-token');
      return false;
    }
  }

  async function loadExercises() {
    allExercises = await api('GET', '/exercises');
    renderGrid(activeFilter);
  }

  async function enterDashboard(user) {
    currentUser = user;
    document.getElementById('greeting').textContent = `Bienvenido, ${user.name}`;
    document.getElementById('disp-level').textContent = `Nivel ${user.level}`;
    document.getElementById('disp-points').textContent = `${user.points} XP`;
    show('screen-dashboard');
    await loadExercises();
    setupFilters();
    focusGrid(0);
  }

  /* ---------- login ---------- */
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const data = await api('POST', '/auth/login', { name, password });
      token = data.token;
      localStorage.setItem('gymbro-token', token);
      await enterDashboard(data.user);
    } catch (err) {
      showError('login-error', err.message);
    }
  });

  document.getElementById('btn-show-register').addEventListener('click', () => {
    show('screen-register');
    document.getElementById('reg-name').focus();
  });

  /* ---------- register ---------- */
  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const password = document.getElementById('reg-password').value;
    const sex = document.getElementById('reg-sex').value;
    const height = parseFloat(document.getElementById('reg-height').value);
    const weight = parseFloat(document.getElementById('reg-weight').value);
    const goal = document.getElementById('reg-goal').value;

    try {
      const data = await api('POST', '/auth/register', { name, password, sex, height, weight, goal });
      token = data.token;
      localStorage.setItem('gymbro-token', token);
      await enterDashboard(data.user);
    } catch (err) {
      showError('register-error', err.message);
    }
  });

  document.getElementById('btn-show-login').addEventListener('click', () => {
    show('screen-login');
    document.getElementById('login-name').focus();
  });

  /* ---------- logout ---------- */
  document.getElementById('btn-logout').addEventListener('click', () => {
    token = null;
    currentUser = null;
    localStorage.removeItem('gymbro-token');
    show('screen-login');
    document.getElementById('login-name').focus();
  });

  /* ---------- profile ---------- */
  document.getElementById('btn-profile').addEventListener('click', async () => {
    try {
      const user = currentUser || await api('GET', '/profile');
      document.getElementById('prof-name').textContent = `👤 ${user.name}`;
      document.getElementById('prof-created').textContent = `Desde ${user.created_at?.slice(0, 10) || '-'}`;
      document.getElementById('prof-sex').value = user.sex;
      document.getElementById('prof-height').value = user.height;
      document.getElementById('prof-weight').value = user.weight;
      document.getElementById('prof-goal').value = user.goal;
      show('screen-profile');
      document.getElementById('prof-sex').focus();
    } catch (err) {
      showError('profile-error', err.message);
    }
  });

  document.getElementById('form-profile').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sex = document.getElementById('prof-sex').value;
    const height = parseFloat(document.getElementById('prof-height').value);
    const weight = parseFloat(document.getElementById('prof-weight').value);
    const goal = document.getElementById('prof-goal').value;

    try {
      const user = await api('PUT', '/profile', { sex, height, weight, goal });
      currentUser = user;
      showSuccess('profile-success', 'Perfil actualizado');
      document.getElementById('greeting').textContent = `Bienvenido, ${user.name}`;
      document.getElementById('disp-level').textContent = `Nivel ${user.level}`;
      document.getElementById('disp-points').textContent = `${user.points} XP`;
    } catch (err) {
      showError('profile-error', err.message);
    }
  });

  document.getElementById('btn-profile-back').addEventListener('click', () => {
    show('screen-dashboard');
    focusGrid(0);
  });

  /* ---------- leaderboard ---------- */
  document.getElementById('btn-leaderboard').addEventListener('click', async () => {
    try {
      const list = await api('GET', '/leaderboard?limit=50');
      const container = document.getElementById('leaderboard-list');
      container.innerHTML = `
        <li class="leaderboard-row leaderboard-row--header">
          <span>#</span><span>Nombre</span><span>Nivel</span><span>Puntos</span>
        </li>`;
      list.forEach((u, i) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-row';
        if (currentUser && u.name === currentUser.name) li.style.background = 'rgba(233,69,96,0.15)';
        li.innerHTML = `<span>${i + 1}</span><span>${u.name}</span><span>${u.level}</span><span>${u.points}</span>`;
        container.appendChild(li);
      });
      show('screen-leaderboard');
      document.getElementById('btn-leaderboard-back').focus();
    } catch (err) {
      console.error(err);
    }
  });

  document.getElementById('btn-leaderboard-back').addEventListener('click', () => {
    show('screen-dashboard');
    focusGrid(0);
  });

  /* ---------- card delegation ---------- */
  document.getElementById('grid').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = parseInt(card.dataset.id);
    const ex = allExercises.find(e => e.id === id);
    if (ex) openModal(ex);
  });

  /* ---------- exercise modal ---------- */
  const overlay = document.getElementById('overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalDuration = document.getElementById('modal-duration');
  const modalDifficulty = document.getElementById('modal-difficulty');
  const modalPoints = document.getElementById('modal-points');
  const modalStart = document.getElementById('modal-start');
  const modalClose = document.getElementById('modal-close');

  function openModal(ex) {
    modalTitle.textContent = ex.name;
    modalDesc.textContent = ex.description;
    modalDuration.textContent = `⏱ ${ex.duration} min`;
    modalDifficulty.textContent = `📊 ${diffLabels[ex.difficulty]}`;
    modalPoints.textContent = `⭐ +${ex.points} XP`;
    overlay.hidden = false;
    modalStart.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    focusGrid(focusIndex);
  }

  modalStart.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* ---------- keyboard nav ---------- */
  function focusGrid(idx) {
    const visibleCards = document.querySelectorAll('#screen-dashboard:not([hidden]) .card');
    if (!visibleCards.length) return;
    focusIndex = ((idx % visibleCards.length) + visibleCards.length) % visibleCards.length;
    visibleCards[focusIndex].focus();
  }

  document.addEventListener('keydown', (e) => {
    if (!overlay.hidden) return;

    const currentScreen = document.querySelector('.screen:not([hidden])');
    if (!currentScreen) return;

    const id = currentScreen.id;

    if (id === 'screen-dashboard') {
      const cols = 3;
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); focusGrid(focusIndex + 1); break;
        case 'ArrowLeft':  e.preventDefault(); focusGrid(focusIndex - 1); break;
        case 'ArrowDown':  e.preventDefault(); focusGrid(focusIndex + cols); break;
        case 'ArrowUp':    e.preventDefault(); focusGrid(focusIndex - cols); break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          const active = document.activeElement;
          if (active && active.classList.contains('card')) active.click();
          break;
      }
    }
  });

  /* ---------- init ---------- */
  (async function init() {
    const ok = await restoreSession();
    if (ok) {
      await enterDashboard(currentUser);
    } else {
      show('screen-login');
      document.getElementById('login-name').focus();
    }
  })();
})();
