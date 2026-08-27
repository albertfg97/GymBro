(function () {
  const API = '/api';

  let token = localStorage.getItem('gymbro-token');
  let currentUser = null;
  let allExercises = [];
  let allRoutines = [];
  let activeFilter = 'all';
  let activeTab = 'exercises';
  let focusIndex = 0;
  let activeExercise = null;
  let timerInterval = null;
  let timerSeconds = 0;
  let activeRoutine = null;
  let routineExerciseIndex = 0;
  let routineTotalPoints = 0;
  let routineCompletedDuration = 0;

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

  /* ---------- voice (entrenador) ---------- */
  const Voice = (() => {
    let esVoice = null;

    function init() {
      if (!('speechSynthesis' in window)) return;
      const pick = () => {
        const voices = window.speechSynthesis.getVoices();
        esVoice = voices.find(v => /es(-|_)?(ES|MX|AR|CL|419)/i.test(v.lang)) ||
          voices.find(v => /^es/i.test(v.lang)) || null;
      };
      pick();
      window.speechSynthesis.onvoiceschanged = pick;
    }

    function speak(text, { rate = 1, onend } = {}) {
      if (!('speechSynthesis' in window)) {
        if (onend) onend();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      u.rate = rate;
      if (esVoice) u.voice = esVoice;
      if (onend) u.onend = onend;
      window.speechSynthesis.speak(u);
    }

    function stop() {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }

    return { init, speak, stop };
  })();
  Voice.init();

  /* ---------- guía de ejercicio ---------- */
  function parseGuide(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
  }

  /* ---------- exercises ---------- */
  function renderGrid(filter) {
    const grid = document.getElementById('grid');
    const source = activeTab === 'routines' ? allRoutines : allExercises;

    let items;
    if (activeTab === 'routines') {
      items = source;
    } else {
      items = filter === 'all' ? source : source.filter(e => e.category === filter);
    }

    grid.innerHTML = items.map((item, i) => {
      if (activeTab === 'routines') {
        const r = item;
        return `
          <button class="card card-routine" data-routine-id="${r.id}" tabindex="0">
            <span class="card-icon">${r.icon}</span>
            <span class="card-title">${r.name}</span>
            <span class="card-desc">${r.description}</span>
            <span class="card-meta">
              <span>📋 ${r.exerciseCount} ejercicios</span>
              <span>⏱ ~${r.totalDuration} min</span>
              <span class="diff-${r.difficulty}">${diffLabels[r.difficulty]}</span>
            </span>
          </button>`;
      }
      return `
        <button class="card" data-id="${item.id}" tabindex="0">
          <span class="card-icon">${item.icon}</span>
          <span class="card-title">${item.name}</span>
          <span class="card-desc">${item.description}</span>
          <span class="card-meta">
            <span>⏱ ${item.duration} min</span>
            <span class="diff-${item.difficulty}">${diffLabels[item.difficulty]}</span>
          </span>
        </button>`;
    }).join('');

    focusIndex = 0;
    if (grid.firstElementChild) grid.firstElementChild.focus();
  }

  /* ---------- tab switching ---------- */
  function setupTabs() {
    document.querySelector('.tab-bar').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-tab');
      if (!btn) return;
      document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;

      const filterBar = document.getElementById('filter-bar');
      filterBar.style.display = activeTab === 'exercises' ? '' : 'none';

      if (activeTab === 'routines') {
        renderGrid();
      } else {
        renderGrid(activeFilter);
      }
    });
  }

  /* ---------- filters ---------- */
  function setupFilters() {
    document.getElementById('filter-bar').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-filter');
      if (!btn) return;
      document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderGrid(activeFilter);
    });
  }

  /* ---------- card delegation ---------- */
  document.getElementById('grid').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    if (activeTab === 'routines') {
      const id = parseInt(card.dataset.routineId);
      const routine = allRoutines.find(r => r.id === id);
      if (routine) openRoutineModal(routine);
    } else {
      const id = parseInt(card.dataset.id);
      const ex = allExercises.find(e => e.id === id);
      if (ex) openExerciseModal(ex);
    }
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
  const modalGuide = document.getElementById('modal-guide');
  const modalGuideMedia = document.getElementById('modal-guide-media');
  const modalGuideSteps = document.getElementById('modal-guide-steps');
  const modalGuideWatch = document.getElementById('modal-guide-watch');
  const modalGuideListen = document.getElementById('modal-guide-listen');

  function renderGuideMedia(container, guide, cls) {
    container.innerHTML = '';
    if (!guide || !guide.gifUrl) return;
    const img = document.createElement('img');
    img.className = cls;
    img.src = guide.gifUrl;
    img.alt = 'Animación del ejercicio';
    img.loading = 'lazy';
    container.append(img);
  }

  function renderGuideIntoModal(guide) {
    renderGuideMedia(modalGuideMedia, guide, 'guide-gif');
    if (!guide) {
      modalGuide.hidden = true;
      return;
    }
    modalGuideSteps.innerHTML = (guide.steps || []).map(s => `<li>${s}</li>`).join('');
    modalGuideWatch.innerHTML = (guide.watch || []).length
      ? `<span class="watch-label">⚠ ${guide.watch.join(' · ')}</span>` : '';
    modalGuide.hidden = false;
  }

  function openExerciseModal(ex) {
    activeExercise = ex;
    modalTitle.textContent = ex.name;
    modalDesc.textContent = ex.description;
    modalDuration.textContent = `⏱ ${ex.duration} min`;
    modalDifficulty.textContent = `📊 ${diffLabels[ex.difficulty]}`;
    modalPoints.textContent = `⭐ +${ex.points} XP`;
    renderGuideIntoModal(parseGuide(ex.guide));
    overlay.hidden = false;
    modalStart.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    Voice.stop();
    activeExercise = null;
    activeRoutine = null;
    modalStart.textContent = 'Comenzar';
    focusGrid(focusIndex);
  }

  modalClose.addEventListener('click', closeModal);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  modalGuideListen.addEventListener('click', () => {
    const guide = parseGuide(activeExercise ? activeExercise.guide : null);
    if (!guide) return;
    const text = [guide.coach, ...(guide.steps || []), ...(guide.watch || [])].join('. ');
    Voice.speak(text);
  });

  /* ---------- routine modal ---------- */
  async function openRoutineModal(routine) {
    try {
      const detail = await api('GET', `/routines/${routine.id}`);
      activeRoutine = detail;
      modalGuide.hidden = true;
      modalTitle.textContent = detail.name;
      modalDesc.textContent = detail.description;
      modalDuration.textContent = `📋 ${detail.exercises.length} ejercicios`;
      modalDifficulty.textContent = `📊 ${diffLabels[detail.difficulty]}`;

      const total = detail.exercises.reduce((s, e) => s + (e.duration_override || e.duration), 0);
      modalPoints.innerHTML = `⏱ ~${total} min`;

      const listHtml = detail.exercises.map((ex, i) =>
        `<div class="routine-ex-item">
          <span class="routine-ex-num">${i + 1}</span>
          <span class="routine-ex-icon">${ex.icon}</span>
          <span class="routine-ex-name">${ex.name}</span>
          <span class="routine-ex-dur">${ex.duration_override || ex.duration} min</span>
        </div>`
      ).join('');

      modalStart.textContent = 'Comenzar rutina';
      overlay.hidden = false;
      modalStart.focus();
    } catch (err) {
      console.error(err);
    }
  }

  /* ---------- workout flow ---------- */
  modalStart.addEventListener('click', () => {
    if (activeRoutine) {
      overlay.hidden = true;
      routineExerciseIndex = 0;
      routineTotalPoints = 0;
      routineCompletedDuration = 0;
      startRoutineExercise();
    } else if (activeExercise) {
      overlay.hidden = true;
      startWorkout(activeExercise, false);
    }
  });

  const workoutIcon = document.getElementById('workout-icon');
  const workoutName = document.getElementById('workout-name');
  const workoutMedia = document.getElementById('workout-media');
  const workoutTimer = document.getElementById('workout-timer');
  const workoutHint = document.getElementById('workout-hint');
  const workoutComplete = document.getElementById('workout-complete');
  const workoutCancel = document.getElementById('workout-cancel');
  const repsPanel = document.getElementById('workout-reps-panel');
  const repsSets = document.getElementById('workout-sets');
  const repsCount = document.getElementById('workout-reps');
  const repsWeight = document.getElementById('workout-weight');

  const coachBox = document.getElementById('workout-coach');
  const coachProgress = document.getElementById('coach-progress');
  const coachLine = document.getElementById('coach-line');
  const coachPrev = document.getElementById('coach-prev');
  const coachNext = document.getElementById('coach-next');
  const coachListen = document.getElementById('coach-listen');
  let coachSteps = [];
  let coachIndex = 0;

  function renderCoach() {
    if (!coachSteps.length) {
      coachBox.hidden = true;
      return;
    }
    coachBox.hidden = false;
    const total = coachSteps.length;
    const n = Math.min(coachIndex, total - 1);
    coachLine.textContent = coachSteps[n];
    coachProgress.innerHTML = coachSteps.map((_, i) =>
      `<span class="coach-dot ${i === n ? 'active' : ''}"></span>`
    ).join('');
    coachPrev.disabled = n === 0;
    coachNext.disabled = n === total - 1;
  }

  function speakCoachStep() {
    if (!coachSteps.length) return;
    const n = Math.min(coachIndex, coachSteps.length - 1);
    Voice.speak(coachSteps[n]);
  }

  function startWorkout(ex, isRoutine) {
    activeExercise = ex;
    workoutIcon.textContent = ex.icon;
    workoutName.textContent = ex.name;
    renderGuideMedia(workoutMedia, parseGuide(ex.guide), 'guide-gif guide-gif--large');
    workoutHint.textContent = isRoutine
      ? `Ejercicio ${routineExerciseIndex + 1} de ${activeRoutine.exercises.length}`
      : 'Realiza el ejercicio y presiona Completar cuando termines';
    timerSeconds = 0;
    updateTimerDisplay();

    const showReps = ex.unit === 'reps';
    repsPanel.hidden = !showReps;
    repsSets.value = '';
    repsCount.value = '';
    repsWeight.value = '';

    const guide = parseGuide(ex.guide);
    coachSteps = guide && Array.isArray(guide.steps) ? guide.steps.slice() : [];
    coachIndex = 0;
    renderCoach();
    if (coachSteps.length) {
      Voice.speak([guide.coach, coachSteps[0]].filter(Boolean).join('. '));
    }

    show('screen-workout');
    workoutComplete.focus();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const s = String(timerSeconds % 60).padStart(2, '0');
    workoutTimer.textContent = `⏱ ${m}:${s}`;
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  workoutComplete.addEventListener('click', async () => {
    if (!activeExercise) return;
    stopTimer();
    Voice.stop();

    const actualDuration = Math.max(1, Math.round(timerSeconds / 60));
    const isRoutine = activeRoutine !== null;

    try {
      const payload = {
        exerciseId: activeExercise.id,
        duration: actualDuration,
      };
      if (activeExercise.unit === 'reps') {
        const setCount = parseInt(repsSets.value, 10);
        const repCount = parseInt(repsCount.value, 10);
        const weightKg = parseFloat(repsWeight.value);
        if (setCount > 0) payload.setCount = setCount;
        if (repCount > 0) payload.repCount = repCount;
        if (weightKg > 0) payload.weightKg = weightKg;
      }
      const result = await api('POST', '/workouts/complete', payload);

      document.getElementById('disp-points').textContent = `${result.totalPoints} XP`;
      document.getElementById('disp-level').textContent = `Nivel ${result.level}`;
      document.getElementById('disp-streak').textContent = `🔥 ${result.currentStreak} días`;

      if (currentUser) {
        currentUser.points = result.totalPoints;
        currentUser.level = result.level;
      }

      if (isRoutine) {
        routineTotalPoints += result.points;
        routineCompletedDuration += actualDuration;
        routineExerciseIndex++;

        if (routineExerciseIndex >= activeRoutine.exercises.length) {
          showRoutineComplete();
        } else {
          startRoutineExercise();
        }
      } else {
        showResult(result, false);
      }
    } catch (err) {
      showResult({ error: err.message }, false);
    }
  });

  function startRoutineExercise() {
    const ex = activeRoutine.exercises[routineExerciseIndex];
    startWorkout(ex, true);
  }

  workoutCancel.addEventListener('click', () => {
    stopTimer();
    Voice.stop();
    activeExercise = null;
    activeRoutine = null;
    show('screen-dashboard');
    focusGrid(0);
  });

  coachPrev.addEventListener('click', () => {
    if (coachIndex > 0) { coachIndex--; renderCoach(); speakCoachStep(); }
  });

  coachNext.addEventListener('click', () => {
    if (coachIndex < coachSteps.length - 1) { coachIndex++; renderCoach(); speakCoachStep(); }
  });

  coachListen.addEventListener('click', () => {
    if (!coachSteps.length) return;
    const guide = parseGuide(activeExercise ? activeExercise.guide : null);
    const text = [guide && guide.coach, coachSteps[Math.min(coachIndex, coachSteps.length - 1)]].filter(Boolean).join('. ');
    Voice.speak(text);
  });

  /* ---------- result ---------- */
  const resultOverlay = document.getElementById('result-overlay');
  const resultTitle = document.querySelector('.result-title');
  const resultPoints = document.getElementById('result-points');
  const resultStreak = document.getElementById('result-streak');
  const resultAchievements = document.getElementById('result-achievements');
  const resultOk = document.getElementById('result-ok');

  function showResult(data, isRoutine) {
    if (data.error) {
      resultPoints.textContent = '❌ Error';
      resultStreak.textContent = '';
      resultAchievements.innerHTML = `<p style="color:var(--error)">${data.error}</p>`;
    } else {
      resultTitle.textContent = isRoutine ? '🎉 Rutina completada' : '🎉 Ejercicio completado';
      resultPoints.textContent = `+${data.points} XP`;
      resultStreak.textContent = `🔥 Rachas: ${data.currentStreak} días`;
      showAchievements(data.newAchievements);
    }
    activeExercise = null;
    activeRoutine = null;
    resultOverlay.hidden = false;
    resultOk.focus();
  }

  function showRoutineComplete() {
    stopTimer();
    resultTitle.textContent = '🎉 Rutina completada';
    resultPoints.textContent = `+${routineTotalPoints} XP total`;
    resultStreak.textContent = `⏱ ${routineCompletedDuration} min`;
    resultAchievements.innerHTML = '';
    activeExercise = null;
    activeRoutine = null;
    resultOverlay.hidden = false;
    resultOk.focus();
  }

  function showAchievements(newAchievements) {
    if (newAchievements && newAchievements.length > 0) {
      resultAchievements.innerHTML = '<h3 style="font-size:1.2rem;color:var(--success)">🎖️ Nuevos logros</h3>' +
        newAchievements.map(a =>
          `<div class="result-achievement">${a.icon} ${a.name}: ${a.description}</div>`
        ).join('');
    } else {
      resultAchievements.innerHTML = '';
    }
  }

  resultOk.addEventListener('click', () => {
    resultOverlay.hidden = true;
    show('screen-dashboard');
    focusGrid(0);
  });

  resultOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !resultOverlay.hidden) {
      resultOverlay.hidden = true;
      show('screen-dashboard');
      focusGrid(0);
    }
  });

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

  async function loadData() {
    const [exercises, routines] = await Promise.all([
      api('GET', '/exercises'),
      api('GET', '/routines'),
    ]);
    allExercises = exercises;
    allRoutines = routines;
  }

  async function enterDashboard(user) {
    currentUser = user;
    document.getElementById('greeting').textContent = `Bienvenido, ${user.name}`;
    document.getElementById('disp-level').textContent = `Nivel ${user.level}`;
    document.getElementById('disp-points').textContent = `${user.points} XP`;

    const usr = await api('GET', '/profile');
    document.getElementById('disp-streak').textContent = `🔥 ${usr.current_streak || 0} días`;

    show('screen-dashboard');
    await loadData();
    renderGrid(activeFilter);
    setupTabs();
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
      const user = await api('GET', '/profile');
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

  /* ---------- history ---------- */
  document.getElementById('btn-history').addEventListener('click', async () => {
    try {
      const [history, stats] = await Promise.all([
        api('GET', '/profile/history?limit=50'),
        api('GET', '/profile/stats'),
      ]);

      document.getElementById('history-stats').innerHTML = `
        <div class="history-stat">
          <span class="history-stat-value">${stats.total_workouts}</span>
          <span class="history-stat-label">Entrenos</span>
        </div>
        <div class="history-stat">
          <span class="history-stat-value">${stats.total_minutes}</span>
          <span class="history-stat-label">Minutos</span>
        </div>
        <div class="history-stat">
          <span class="history-stat-value">${stats.total_xp}</span>
          <span class="history-stat-label">XP total</span>
        </div>
        <div class="history-stat">
          <span class="history-stat-value">🔥${stats.current_streak}</span>
          <span class="history-stat-label">Racha</span>
        </div>
      `;

      const container = document.getElementById('history-list');
      container.innerHTML = history.length
        ? history.map(h => {
            const date = h.completed_at ? h.completed_at.slice(0, 10) : '';
            let detail = '';
            if (h.reps) {
              detail = `<span class="history-item-detail">${h.sets || 1}×${h.reps}${h.weight_kg ? ` · ${h.weight_kg} kg` : ''}</span>`;
            }
            return `
              <div class="history-item">
                <span class="history-item-icon">${h.icon}</span>
                <span class="history-item-name">${h.name}</span>
                ${detail}
                <span class="history-item-points">+${h.points} XP</span>
                <span class="history-item-date">${date}</span>
              </div>`;
          }).join('')
        : '<p style="color:var(--muted);text-align:center">Aún no has realizado ningún entrenamiento.</p>';

      show('screen-history');
      document.getElementById('btn-history-back').focus();
    } catch (err) {
      console.error(err);
    }
  });

  document.getElementById('btn-history-back').addEventListener('click', () => {
    show('screen-dashboard');
    focusGrid(0);
  });

  /* ---------- achievements ---------- */
  document.getElementById('btn-achievements').addEventListener('click', async () => {
    try {
      const [all, earned] = await Promise.all([
        api('GET', '/achievements'),
        api('GET', '/achievements/mine'),
      ]);
      const earnedMap = {};
      earned.forEach(e => { earnedMap[e.id] = e.earned_at; });

      const grid = document.getElementById('achievements-grid');
      grid.innerHTML = all.map(a => {
        const earnedAt = earnedMap[a.id];
        const cls = earnedAt ? 'earned' : 'locked';
        const dateHtml = earnedAt ? `<span class="achievement-date">✓ ${earnedAt.slice(0, 10)}</span>` : '';
        return `<div class="achievement-card ${cls}">
          <span class="achievement-icon">${a.icon}</span>
          <span class="achievement-name">${a.name}</span>
          <span class="achievement-desc">${a.description}</span>
          ${dateHtml}
        </div>`;
      }).join('');

      show('screen-achievements');
      document.getElementById('btn-achievements-back').focus();
    } catch (err) {
      console.error(err);
    }
  });

  document.getElementById('btn-achievements-back').addEventListener('click', () => {
    show('screen-dashboard');
    focusGrid(0);
  });

  /* ---------- social ---------- */
  let socialChTab = 'active';

  const metricLabels = {
    first_to_xp: 'Primero en X XP',
    total_workouts: 'Más workouts',
    best_streak: 'Mejor racha',
  };

  function socialError(err) {
    showError('social-error', err.message || 'Error');
  }

  async function renderSocial() {
    try {
      const [requests, friends, challenges] = await Promise.all([
        api('GET', '/social/friends/requests'),
        api('GET', '/social/friends'),
        api('GET', '/social/challenges'),
      ]);
      renderSocialRequests(requests);
      renderSocialFriends(friends);
      renderChallengeSelectOptions(friends);
      renderChallenges(challenges);
      show('screen-social');
      document.getElementById('social-search').focus();
    } catch (err) {
      socialError(err);
    }
  }

  function renderSocialRequests(list) {
    const box = document.getElementById('social-requests');
    if (!list.length) {
      box.innerHTML = '<p class="social-empty">Sin solicitudes pendientes.</p>';
      return;
    }
    box.innerHTML = list.map(r => `
      <div class="social-item">
        <span class="social-item-name">${r.name}</span>
        <button class="btn-primary" data-respond="${r.request_id}" data-action="accept" tabindex="0">Aceptar</button>
        <button class="btn-secondary" data-respond="${r.request_id}" data-action="decline" tabindex="0">Rechazar</button>
      </div>`).join('');
  }

  function renderSocialFriends(list) {
    const box = document.getElementById('social-friends');
    if (!list.length) {
      box.innerHTML = `<p class="social-empty">Aún no tienes amigos.</p>`;
      return;
    }
    box.innerHTML = list.map(f => `
      <div class="social-item">
        <span class="social-item-name" data-view-friend="${f.friend_id}" tabindex="0">${f.name}</span>
        <span class="social-item-meta">Nv ${f.level} · ${f.points} XP</span>
        <button class="btn-secondary" data-unfriend="${f.friend_id}" tabindex="0">Eliminar</button>
      </div>`).join('');
  }

  function renderChallengeSelectOptions(friends) {
    const sel = document.getElementById('social-challenge-friend');
    sel.innerHTML = friends.length
      ? friends.map(f => `<option value="${f.friend_id}">${f.name}</option>`).join('')
      : '<option value="">Sin amigos</option>';
  }

  function renderChallenges(list) {
    const filtered = list.filter(c => {
      if (socialChTab === 'completed') return c.status === 'completed';
      if (socialChTab === 'pending') return c.status === 'pending' || c.status === 'declined';
      return c.status === 'active';
    });
    const box = document.getElementById('social-challenges');
    if (!filtered.length) {
      box.innerHTML = `<p class="social-empty">Sin desafíos en esta vista.</p>`;
      return;
    }
    box.innerHTML = filtered.map(c => {
      const opp = c.status === 'completed' ? (c.winner_id === c.challenger.id ? c.challenger : c.opponent) : null;
      const a = c.progress[c.challenger.id] || { value: 0 };
      const b = c.progress[c.opponent.id] || { value: 0 };
      const header = `${c.challenger.name} vs ${c.opponent.name} · ${metricLabels[c.metric]}${c.target ? ` · ${c.target} XP` : ''}`;
      let body = '';

      if (c.status === 'pending') {
        body = `
          <div class="social-ch-body">
            <span>Te ha retado ${c.challenger.name}</span>
            <button class="btn-primary" data-ch-respond="${c.id}" data-action="accept" tabindex="0">Aceptar</button>
            <button class="btn-secondary" data-ch-respond="${c.id}" data-action="decline" tabindex="0">Rechazar</button>
          </div>`;
      } else if (c.status === 'active') {
        body = `
          <div class="social-ch-body">
            <div class="progress-row"><span>${c.challenger.name}</span><span>${a.value}${c.metric === 'first_to_xp' ? ` / ${c.target} XP` : ''}</span></div>
            <div class="progress-row"><span>${c.opponent.name}</span><span>${b.value}${c.metric === 'first_to_xp' ? ` / ${c.target} XP` : ''}</span></div>
          </div>`;
      } else if (c.status === 'completed') {
        body = `<div class="social-ch-body"><span class="winner-badge">🏆 Gana: ${opp ? opp.name : 'Empate'}</span></div>`;
      } else {
        body = `<div class="social-ch-body"><span>Rechazado</span></div>`;
      }

      return `<div class="social-item social-challenge">
        <span class="social-item-name">${header}</span>
        ${body}
      </div>`;
    }).join('');
  }

  function renderUserProfile(user) {
    const box = document.getElementById('social-search-results');
    box.innerHTML = `
      <div class="public-profile">
        <h3>${user.name}</h3>
        <p>Nivel ${user.level} · ${user.points} XP</p>
        ${user.goal ? `<p>Objetivo: ${user.goal.replace('_', ' ')}</p>` : ''}
        ${user.sex ? `<p>Sexo: ${user.sex}</p>` : ''}
        ${user.total_workouts !== undefined ? `<p>Entrenos: ${user.total_workouts} · ${user.total_minutes} min · ${user.total_xp} XP</p>` : ''}
        ${user.current_streak !== undefined ? `<p>🔥 Racha actual: ${user.current_streak || 0} días</p>` : ''}
      </div>`;
  }

  document.getElementById('btn-social').addEventListener('click', () => {
    renderSocial();
  });

  document.getElementById('btn-social-back').addEventListener('click', () => {
    show('screen-dashboard');
    focusGrid(0);
  });

  document.getElementById('social-search-btn').addEventListener('click', async () => {
    const q = document.getElementById('social-search').value.trim();
    if (!q) return;
    try {
      const results = await api('GET', `/social/users/search?q=${encodeURIComponent(q)}`);
      const box = document.getElementById('social-search-results');
      if (!results.length) {
        box.innerHTML = `<p class="social-empty">Sin resultados.</p>`;
        return;
      }
      box.innerHTML = results.map(u => `
        <div class="social-item">
          <span class="social-item-name">${u.name}</span>
          <span class="social-item-meta">Nv ${u.level} · ${u.points} XP</span>
          <button class="btn-primary" data-add-friend="${u.id}" tabindex="0">Agregar</button>
        </div>`).join('');
    } catch (err) {
      socialError(err);
    }
  });

  document.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('[data-add-friend]');
    if (addBtn) {
      try {
        await api('POST', `/social/friends/${addBtn.dataset.addFriend}`);
        await renderSocial();
      } catch (err) {
        socialError(err);
      }
    }

    const resp = e.target.closest('[data-respond]');
    if (resp) {
      try {
        await api('POST', `/social/friends/requests/${resp.dataset.respond}/respond`, { action: resp.dataset.action });
        await renderSocial();
      } catch (err) {
        socialError(err);
      }
    }

    const unfriend = e.target.closest('[data-unfriend]');
    if (unfriend) {
      try {
        await api('DELETE', `/social/friends/${unfriend.dataset.unfriend}`);
        await renderSocial();
      } catch (err) {
        socialError(err);
      }
    }

    const viewFriend = e.target.closest('[data-view-friend]');
    if (viewFriend) {
      try {
        const profile = await api('GET', `/social/users/${viewFriend.dataset.viewFriend}`);
        renderUserProfile(profile);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        socialError(err);
      }
    }

    const chResp = e.target.closest('[data-ch-respond]');
    if (chResp) {
      try {
        await api('POST', `/social/challenges/${chResp.dataset.chRespond}/respond`, { action: chResp.dataset.action });
        await renderSocial();
      } catch (err) {
        socialError(err);
      }
    }
  });

  document.getElementById('social-challenge-send').addEventListener('click', async () => {
    const opponentId = document.getElementById('social-challenge-friend').value;
    const metric = document.getElementById('social-challenge-metric').value;
    const target = parseInt(document.getElementById('social-challenge-target').value, 10);
    const durationDays = parseInt(document.getElementById('social-challenge-days').value, 10) || 7;
    if (!opponentId) return socialError(new Error('Elige un amigo'));
    if (metric === 'first_to_xp' && (!target || target <= 0)) return socialError(new Error('Indica el XP objetivo'));

    try {
      await api('POST', '/social/challenges', { opponentId, metric, target, durationDays });
      await renderSocial();
    } catch (err) {
      socialError(err);
    }
  });

  document.querySelector('.social-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-filter');
    if (!btn) return;
    document.querySelectorAll('.social-tabs .btn-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    socialChTab = btn.dataset.chTab;
    renderChallengesFromServer();
  });

  async function renderChallengesFromServer() {
    try {
      const list = await api('GET', '/social/challenges');
      renderChallenges(list);
    } catch (err) {
      socialError(err);
    }
  }

  /* ---------- keyboard nav ---------- */
  function focusGrid(idx) {
    const visibleCards = document.querySelectorAll('#screen-dashboard:not([hidden]) .card');
    if (!visibleCards.length) return;
    focusIndex = ((idx % visibleCards.length) + visibleCards.length) % visibleCards.length;
    visibleCards[focusIndex].focus();
  }

  document.addEventListener('keydown', (e) => {
    if (!overlay.hidden || !resultOverlay.hidden) return;

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
