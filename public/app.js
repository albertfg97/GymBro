(function () {
  const API = '/api';

  let token = localStorage.getItem('gymbro-v2-token');
  let currentUser = null;
  let mode = null;                       // 'tv' | 'movil'
  let plan = null;                       // normalized plan { rutina, alimentacion }
  let pendingStart = null;               // pending workout exercise
  let coachSteps = [];
  let coachIndex = 0;
  let timerInterval = null;
  let timerSeconds = 0;
  let mobileTab = 'alimentacion';

  /* ---------- helpers ---------- */
  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 4000);
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.hidden = true);
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }

  async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !String(path).startsWith('/auth/')) {
      forceLogout();
      throw new Error('Sesión caducada. Inicia sesión de nuevo.');
    }
    if (!res.ok) throw new Error(data.error || 'Error del servidor');
    return data;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- voice ---------- */
  const Voice = (() => {
    let esVoice = null;
    function pick() {
      if (!('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices();
      esVoice = voices.find(v => /^es/i.test(v.lang)) || null;
    }
    function init() {
      if (!('speechSynthesis' in window)) return;
      pick();
      window.speechSynthesis.onvoiceschanged = pick;
    }
    function speak(text) {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES'; u.rate = 1;
      if (esVoice) u.voice = esVoice;
      window.speechSynthesis.speak(u);
    }
    function stop() {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
    return { init, speak, stop };
  })();

  /* ---------- auth ---------- */
  async function loadProfile() {
    currentUser = await api('GET', '/profile');
  }

  async function loadPlan() {
    plan = await api('GET', '/profile/plan');
  }

  /* ---------- mode selector ---------- */
  const modeOverlay = document.getElementById('mode-overlay');

  function askMode(afterLogin) {
    return new Promise(resolve => {
      const tv = document.getElementById('mode-tv');
      const mv = document.getElementById('mode-movil');
      function chose(m) { tv.removeEventListener('click', onTv); mv.removeEventListener('click', onMv); modeOverlay.hidden = true; resolve(m); }
      function onTv() { chose('tv'); }
      function onMv() { chose('movil'); }
      tv.addEventListener('click', onTv);
      mv.addEventListener('click', onMv);
      modeOverlay.hidden = false;
      (mode === 'tv' ? tv : mv).focus();
    });
  }

  /* ---------- home ---------- */
  async function enterHome() {
    if (!currentUser) {
      try { currentUser = await api('GET', '/profile'); }
      catch { if (!currentUser) { forceLogout(); return; } }
    }
    document.getElementById('greeting').textContent = `Bienvenido, ${currentUser && currentUser.name ? currentUser.name : ''}`;
    const tvHome = document.getElementById('tv-home');
    const mobHome = document.getElementById('mobile-home');
    tvHome.hidden = mode !== 'tv';
    mobHome.hidden = mode !== 'movil';
    if (mode === 'tv') renderTVHome();
    else renderMobileTabs();
    show('screen-home');
  }

  /* ================= TV ================= */
  function renderTVHome() {
    const box = document.getElementById('tv-today');
    api('GET', '/rutina/hoy').then(d => {
      const h = d.hoy;
      if (!h || !h.entrena || !h.ejercicios.length) {
        box.innerHTML = `<div class="tv-card tv-empty">
          <p class="tv-empty-title">Hoy toca descanso 💤</p>
          <p class="plan-muted">Añade o revisa tu plan desde el móvil (perfil → importar plan).</p>
        </div>`;
        return;
      }
      const bloquesHTML = h.ejercicios.map(ex => `
        <button class="tv-ex-card" data-start="${ex.idx}" tabindex="0">
          <span class="tv-ex-icon">${ex.icon}</span>
          <span class="tv-ex-name">${esc(ex.ejercicio)}</span>
          <span class="tv-ex-meta">${ex.sets ? `${ex.sets}×` : ''}${esc(ex.reps)}${(ex.peso_kg_por_mancuerna || ex.peso_kg_total) ? ` @ ${ex.peso_kg_por_mancuerna || ex.peso_kg_total}kg` : ''}${ex.descanso_s ? ` · ${ex.descanso_s}s` : ''}</span>
        </button>`).join('');
      box.innerHTML = `
        <div class="tv-card">
          <div class="tv-heading">
            <div>
              <h2 class="tv-title">Hoy · ${esc(h.dia)}</h2>
              <p class="plan-muted">Bloque ${esc(h.bloque || '')} · ${h.ejercicios.length} ejercicios</p>
            </div>
            <button class="btn-secondary" id="tv-ver-bloques" tabindex="0">Ver otros días</button>
          </div>
          <div class="tv-ex-grid">${bloquesHTML}</div>
        </div>`;
      box.querySelectorAll('[data-start]').forEach(btn => {
        btn.addEventListener('click', () => {
          const ex = h.ejercicios.find(e => e.idx === Number(btn.dataset.start));
          if (ex) pendingStart = { ex, context: 'rutina' };
          startWorkout(ex);
        });
      });
      document.getElementById('tv-ver-bloques').addEventListener('click', () => showBlockPicker());
    }).catch(err => {
      box.innerHTML = `<div class="tv-card tv-empty"><p class="plan-muted">${esc(err.message)}</p></div>`;
    });
  }

  async function showBlockPicker() {
    const rutina = (await api('GET', '/rutina')).rutina;
    if (!rutina) return;
    const box = document.getElementById('tv-today');
    const blocks = Object.keys(rutina.bloques || {}).map(k => ({
      bloque: k,
      ejercicios: rutina.bloques[k] || [],
    }));
    const list = blocks.map(b => `
      <button class="tv-bloque-card" data-bloque="${esc(b.bloque)}" tabindex="0">
        <span class="tv-bloque-name">Bloque ${esc(b.bloque)}</span>
        <span class="plan-muted">${b.ejercicios.length} ejercicios</span>
      </button>`).join('');
    box.innerHTML = `<div class="tv-card">
      <div class="tv-heading"><div><h2 class="tv-title">Elige un bloque</h2></div>
        <button class="btn-secondary" id="tv-volver" tabindex="0">← Hoy</button></div>
      <div class="tv-ex-grid">${list || '<p class="plan-muted">Sin bloques en el plan.</p>'}</div>
    </div>`;
    document.getElementById('tv-volver').addEventListener('click', () => renderTVHome());
    box.querySelectorAll('[data-bloque]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ej = blocks.find(b => b.bloque === btn.dataset.bloque).ejercicios;
        renderTVBlock(btn.dataset.bloque, ej);
      });
    });
  }

  function renderTVBlock(bloque, ejercicios) {
    const box = document.getElementById('tv-today');
    const list = ejercicios.map((ex, i) => `
      <button class="tv-ex-card" data-start="${i}" tabindex="0">
        <span class="tv-ex-icon">${ex.icon}</span>
        <span class="tv-ex-name">${esc(ex.ejercicio)}</span>
        <span class="tv-ex-meta">${ex.sets ? `${ex.sets}×` : ''}${esc(ex.reps)}${(ex.peso_kg_por_mancuerna || ex.peso_kg_total) ? ` @ ${ex.peso_kg_por_mancuerna || ex.peso_kg_total}kg` : ''}${ex.descanso_s ? ` · ${ex.descanso_s}s` : ''}</span>
      </button>`).join('');
    box.innerHTML = `<div class="tv-card">
      <div class="tv-heading"><div><h2 class="tv-title">Bloque ${esc(bloque)}</h2></div>
        <button class="btn-secondary" id="tv-volver" tabindex="0">← Bloques</button></div>
      <div class="tv-ex-grid">${list}</div>
    </div>`;
    document.getElementById('tv-volver').addEventListener('click', () => showBlockPicker());
    box.querySelectorAll('[data-start]').forEach(btn => {
      btn.addEventListener('click', () => startWorkout(ejercicios[Number(btn.dataset.start)]));
    });
  }

  /* ================= Guided workout ================= */
  const workoutIcon = document.getElementById('workout-icon');
  const workoutName = document.getElementById('workout-name');
  const workoutMeta = document.getElementById('workout-meta');
  const workoutMedia = document.getElementById('workout-media');
  const workoutTimer = document.getElementById('workout-timer');
  const workoutHint = document.getElementById('workout-hint');
  const workoutComplete = document.getElementById('workout-complete');
  const workoutCancel = document.getElementById('workout-cancel');
  const repsPanel = document.getElementById('workout-reps-panel');
  const repsSets = document.getElementById('workout-sets');
  const repsCount = document.getElementById('workout-reps');
  const repsWeight = document.getElementById('workout-weight');
  const workoutLabel = document.getElementById('workout-label');
  const coachBox = document.getElementById('workout-coach');
  const coachProgress = document.getElementById('coach-progress');
  const coachLine = document.getElementById('coach-line');
  const coachPrev = document.getElementById('coach-prev');
  const coachNext = document.getElementById('coach-next');
  const coachListen = document.getElementById('coach-listen');

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

  function startWorkout(ex, sourceItem) {
    sourceItem = sourceItem || null;
    workoutIcon.textContent = ex.icon || '🏋️';
    workoutName.textContent = ex.ejercicio || ex.name || 'Ejercicio';
    const guide = ex.guide || null;
    renderGuideMedia(workoutMedia, guide, 'guide-gif guide-gif--large');
    const planWeight = (ex.peso_kg_por_mancuerna || 0) || (ex.peso_kg_total || 0);
    const pesoLabel = planWeight ? ` @ ${planWeight}kg` : '';
    workoutLabel.textContent = (ex.sets ? `${ex.sets}×` : '') + (ex.reps ? ` ${ex.reps}` : '') + pesoLabel + (ex.descanso_s ? ` · descanso ${ex.descanso_s}s` : '');
    workoutMeta.textContent = guide ? 'Modo guiado: sígueme paso a paso' : 'Sigue el ejercicio y completa';

    repsPanel.hidden = !(ex.sets || ex.reps);
    repsSets.value = ex.sets || '';
    repsCount.value = ex.reps || '';
    const planWeight = (ex.peso_kg_por_mancuerna || 0) || (ex.peso_kg_total || 0);
    repsWeight.value = planWeight || '';

    coachSteps = guide && Array.isArray(guide.steps) ? guide.steps.slice() : [];
    coachIndex = 0;
    renderCoach();
    if (coachSteps.length) {
      Voice.speak([guide && guide.coach, coachSteps[0]].filter(Boolean).join('. '));
    }

    timerSeconds = 0;
    updateTimer();
    show('screen-workout');
    workoutComplete.focus();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => { timerSeconds++; updateTimer(); }, 1000);
  }

  function updateTimer() {
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const s = String(timerSeconds % 60).padStart(2, '0');
    workoutTimer.textContent = `⏱ ${m}:${s}`;
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function renderCoach() {
    if (!coachSteps.length) { coachBox.hidden = true; return; }
    coachBox.hidden = false;
    const n = Math.min(coachIndex, coachSteps.length - 1);
    const total = coachSteps.length;
    coachLine.textContent = coachSteps[n];
    coachProgress.innerHTML = coachSteps.map((_, i) =>
      `<span class="coach-dot ${i === n ? 'active' : ''}"></span>`).join('');
    coachPrev.disabled = n === 0;
    coachNext.disabled = n === total - 1;
  }

  function speakCoachStep() {
    if (!coachSteps.length) return;
    Voice.speak(coachSteps[Math.min(coachIndex, coachSteps.length - 1)]);
  }

  coachPrev.addEventListener('click', () => { if (coachIndex > 0) { coachIndex--; renderCoach(); speakCoachStep(); } });
  coachNext.addEventListener('click', () => { if (coachIndex < coachSteps.length - 1) { coachIndex++; renderCoach(); speakCoachStep(); } });
  coachListen.addEventListener('click', () => {
    if (!coachSteps.length) return;
    const t = [coachSteps[Math.min(coachIndex, coachSteps.length - 1)]].filter(Boolean).join('. ');
    Voice.speak(t);
  });

  workoutComplete.addEventListener('click', async () => {
    stopTimer();
    Voice.stop();
    const name = workoutName.textContent;
    const sets = parseInt(repsSets.value, 10);
    const reps = repsCount.value;
    const weight = parseFloat(repsWeight.value);
    try {
      const payload = { ejercicio: name };
      if (sets > 0) payload.sets = sets;
      if (reps && reps.length) payload.reps = reps;
      if (weight > 0) payload.peso_kg = weight;
      await api('POST', '/tracking/workout', payload);
      showResult('✓ Ejercicio registrado' + (mode === 'tv' ? ' · sigue con el siguiente' : ''));
    } catch (err) {
      showResult('No se pudo registrar: ' + err.message);
    }
  });

  workoutCancel.addEventListener('click', () => {
    stopTimer(); Voice.stop(); pendingStart = null;
    enterHome();
  });

  const resultOverlay = document.getElementById('result-overlay');
  const resultPoints = document.getElementById('result-points');
  const resultOk = document.getElementById('result-ok');

  function showResult(text) {
    resultPoints.textContent = text;
    resultOverlay.hidden = false;
    resultOk.focus();
  }
  resultOk.addEventListener('click', () => {
    resultOverlay.hidden = true;
    enterHome();
  });
  resultOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !resultOverlay.hidden) { resultOverlay.hidden = true; enterHome(); }
  });

  /* ================= MOBILE ================= */
  const mtabContainers = {
    alimentacion: document.getElementById('mtab-alimentacion'),
    rutina: document.getElementById('mtab-rutina'),
    seguimiento: document.getElementById('mtab-seguimiento'),
    perfil: document.getElementById('mtab-perfil'),
  };

  document.querySelectorAll('[data-mtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      mobileTab = btn.dataset.mtab;
      document.querySelectorAll('[data-mtab]').forEach(b => b.classList.toggle('active', b === btn));
      renderMobileTabs();
    });
  });

  function renderMobileTabs() {
    Object.keys(mtabContainers).forEach(k => {
      mtabContainers[k].hidden = k !== mobileTab;
    });
    if (mobileTab === 'alimentacion') renderAlimentacion();
    if (mobileTab === 'rutina') renderMobileRutina();
    if (mobileTab === 'seguimiento') renderSeguimiento();
    if (mobileTab === 'perfil') renderPerfil();
  }

  function renderAlimentacion() {
    const box = mtabContainers.alimentacion;
    api('GET', '/alimentacion').then(d => {
      const a = d.alimentacion;
      if (!a) {
        box.innerHTML = `<div class="m-card"><p class="plan-muted">Sin plan de alimentación. Impórtalo desde Perfil.</p></div>`;
        return;
      }
      const obj = a.objetivos || {};
      let html = `<div class="m-card">
        <h3 class="m-title">🎯 Objetivos diarios</h3>
        <p>${obj.kcal_dia || '-'} kcal · Proteína: ${esc(obj.proteina_g || '-')} g</p>
        ${obj.deficit_kcal ? `<p class="plan-muted">Déficit ${esc(obj.deficit_kcal)}</p>` : ''}
      </div>`;

      const dietTabs = (a.dieta_7_dias || []).map((d, i) =>
        `<button class="chip ${i === 0 ? 'active' : ''}" data-dieta="${i}" tabindex="0">${esc(d.etiqueta || `Día ${d.dia}`)}</button>`).join('');
      html += `<div class="m-card"><h3 class="m-title">📆 Menú semanal</h3>
        <div class="chip-row">${dietTabs || '<p class="plan-muted">Sin menú.</p>'}</div>
        <div id="diet-detail"></div></div>`;

      const lista = a.lista_compra || {};
      const listaHtml = Object.keys(lista).map(k => {
        const items = Array.isArray(lista[k]) ? lista[k] : [];
        return `<div class="plan-sub"><strong>${esc(k)}</strong></div>
          <ul class="plan-list">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
      }).join('');
      html += `<div class="m-card"><h3 class="m-title">🛒 Lista de la compra</h3>${listaHtml || '<p class="plan-muted">Sin lista.</p>'}</div>`;

      if (a.principios && a.principios.length) {
        html += `<div class="m-card"><h3 class="m-title">📌 Principios</h3>
          <ul class="plan-list">${a.principios.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
      }

      box.innerHTML = html;

      const diet = a.dieta_7_dias || [];
      function showDiet(i) {
        const d = diet[i];
        if (!d) { document.getElementById('diet-detail').innerHTML = ''; return; }
        const rows = [
          ['☀️ Desayuno', d.desayuno], ['🍽 Comida', d.comida], ['🥜 Snack', d.snack], ['🌙 Cena', d.cena],
        ].map(([label, val]) => val ? `<p><strong>${label}:</strong> ${esc(val)}</p>` : '').join('');
        document.getElementById('diet-detail').innerHTML = rows +
          `<div class="diet-check"><button class="btn-primary" data-comida-done tabindex="0">✓ Comidas hechas</button></div>`;
        document.querySelector('[data-comida-done]').addEventListener('click', async () => {
          await Promise.all(['desayuno', 'comida', 'snack', 'cena'].map(c =>
            api('POST', '/tracking/nutrition', { comida: c, done: 1 })));
          showResult('Menú del día anotado');
        });
      }
      box.querySelectorAll('[data-dieta]').forEach(btn => {
        btn.addEventListener('click', () => {
          box.querySelectorAll('[data-dieta]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          showDiet(Number(btn.dataset.dieta));
        });
      });
      if (diet.length) showDiet(0);
    }).catch(err => {
      box.innerHTML = `<div class="m-card"><p class="plan-muted">${esc(err.message)}</p></div>`;
    });
  }

  function renderMobileRutina() {
    const box = mtabContainers.rutina;
    api('GET', '/rutina').then(d => {
      const r = d.rutina;
      if (!r || !Object.keys(r.bloques || {}).length) {
        box.innerHTML = `<div class="m-card"><p class="plan-muted">Sin plan de rutina. Impórtalo desde Perfil.</p></div>`;
        return;
      }
      const days = (r.dias_semana || []).map(x => `${esc(x.dia)}: ${esc(x.bloque)}`).join(' · ');
      let html = `<div class="m-card"><h3 class="m-title">📅 Semana</h3><p>${esc(days || 'Sin días asignados')}</p></div>`;
      Object.keys(r.bloques).forEach(k => {
        const list = r.bloques[k] || [];
        const items = list.map(ex => `
          <div class="rutina-row" data-manual-start="${esc(ex.ejercicio)}">
            <span class="routine-ex-icon">${ex.icon}</span>
            <span class="routine-ex-name">${esc(ex.ejercicio)}</span>
            <span class="routine-ex-dur">${ex.sets ? `${ex.sets}×` : ''}${esc(ex.reps)}${(ex.peso_kg_por_mancuerna || ex.peso_kg_total) ? ` @ ${ex.peso_kg_por_mancuerna || ex.peso_kg_total}kg` : ''}${ex.descanso_s ? ` · ${ex.descanso_s}s` : ''}</span>
          </div>`).join('');
        html += `<div class="m-card"><h3 class="m-title">Bloque ${esc(k)}</h3>${items || '<p class="plan-muted">Vacío</p>'}</div>`;
      });
      box.innerHTML = html;
      box.querySelectorAll('[data-manual-start]').forEach(row => {
        row.addEventListener('click', () => {
          const name = row.dataset.manualStart;
          const ex = findExerciseByName(name);
          if (ex) { pendingStart = { ex, context: 'manual' }; startWorkout(ex); }
        });
      });
    }).catch(err => {
      box.innerHTML = `<div class="m-card"><p class="plan-muted">${esc(err.message)}</p></div>`;
    });
  }

  function findExerciseByName(name) {
    if (!plan || !plan.rutina) return null;
    for (const k of Object.keys(plan.rutina.bloques || {})) {
      const found = (plan.rutina.bloques[k] || []).find(e => e.ejercicio === name);
      if (found) return found;
    }
    return null;
  }

  function renderSeguimiento() {
    const box = mtabContainers.seguimiento;
    api('GET', '/tracking/summary').then(s => {
      let html = `<div class="m-card">
        <h3 class="m-title">📊 Hoy</h3>
        <p>${s.today_workouts} entrenos · 🔥 racha ${s.streak} días</p>
        <label>Peso actual (kg) <input type="number" id="weight-input" min="20" max="300" step="0.1" tabindex="0"></label>
        <button class="btn-primary" id="weight-save" tabindex="0">Guardar peso</button>
      </div>`;

      if (s.workouts.length) {
        html += `<div class="m-card"><h3 class="m-title">Últimos entrenos</h3>
          ${s.workouts.map(w => `<div class="hist-row">${esc(w.date)} · ${esc(w.ejercicio)} ${w.sets ? w.sets + '×' : ''}${esc(w.reps || '')}</div>`).join('')}</div>`;
      }
      if (s.weight.length) {
        html += `<div class="m-card"><h3 class="m-title">Peso reciente</h3>
          ${s.weight.map(w => `<div class="hist-row">${esc(w.date)} · ${w.weight_kg} kg</div>`).join('')}</div>`;
      }
      box.innerHTML = html;
      document.getElementById('weight-save').addEventListener('click', async () => {
        const w = parseFloat(document.getElementById('weight-input').value);
        if (w > 0) { await api('POST', '/tracking/weight', { weight_kg: w }); showResult('Peso guardado'); renderSeguimiento(); }
      });
    }).catch(err => {
      box.innerHTML = `<div class="m-card"><p class="plan-muted">${esc(err.message)}</p></div>`;
    });
  }

  function renderPerfil() {
    const box = mtabContainers.perfil;
    const u = currentUser;
    if (!u) return;
    box.innerHTML = `
      <div class="m-card">
        <h3 class="m-title">👤 ${esc(u.name)}</h3>
        <p class="plan-muted">${esc(u.has_plan ? 'Tiene plan importado' : 'Sin plan importado')}</p>
        <p class="plan-muted">Sexo: ${esc(u.sex)} · Objetivo: ${esc(u.goal)}${u.height_cm ? ` · ${u.height_cm} cm` : ''}${u.weight_kg ? ` · ${u.weight_kg} kg` : ''}</p>
      </div>
      <div class="m-card">
        <h3 class="m-title">📄 Importar plan (rutina + alimentación)</h3>
        <p class="plan-muted">Sube el archivo .json con tu plan. Los ejercicios se enlazan al catálogo de guías por nombre.</p>
        <input type="file" id="plan-file" accept="application/json,.json" tabindex="0">
        <button class="btn-primary" id="plan-upload" tabindex="0">Importar plan</button>
        <p id="plan-status" class="muted" hidden></p>
      </div>
      <div class="m-card">
        <h3 class="m-title">🌐 Modo</h3>
        <button class="btn-secondary" id="switch-tv" tabindex="0">📺 Ver en TV</button>
        <button class="btn-secondary" id="switch-movil" tabindex="0">📱 Ver en móvil</button>
      </div>
      <div class="m-card">
        <button class="btn-secondary" id="btn-logout2" tabindex="0">Cerrar sesión</button>
      </div>`;

    document.getElementById('plan-upload').addEventListener('click', async () => {
      const file = document.getElementById('plan-file').files[0];
      const status = document.getElementById('plan-status');
      status.hidden = false;
      if (!file) { status.textContent = 'Elige un archivo JSON primero.'; return; }
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        await api('PUT', '/profile/plan', json);
        status.textContent = 'Plan importado correctamente ✓';
        u.has_plan = true;
      } catch (err) {
        status.textContent = 'Error: ' + err.message;
      }
    });

    document.getElementById('switch-tv').addEventListener('click', () => { mode = 'tv'; enterHome(); });
    document.getElementById('switch-movil').addEventListener('click', () => { mode = 'movil'; enterHome(); });
    const logout2 = document.getElementById('btn-logout2');
    if (logout2) logout2.addEventListener('click', logout);
  }

  /* ---------- login ---------- */
  document.getElementById('btn-show-register').addEventListener('click', () => {
    show('screen-register'); document.getElementById('reg-name').focus();
  });
  document.getElementById('btn-show-login').addEventListener('click', () => {
    show('screen-login'); document.getElementById('login-name').focus();
  });

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const password = document.getElementById('login-password').value;
    try {
      const data = await api('POST', '/auth/login', { name, password });
      token = data.token; localStorage.setItem('gymbro-v2-token', token);
      currentUser = data.user;
      const chosen = await askMode();
      mode = chosen;
      await loadPlan();
      enterHome();
    } catch (err) {
      showError('login-error', err.message);
    }
  });

  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('reg-name').value.trim(),
      password: document.getElementById('reg-password').value,
      sex: document.getElementById('reg-sex').value || undefined,
      birth_year: document.getElementById('reg-birth').value || undefined,
      height_cm: document.getElementById('reg-height').value || undefined,
      weight_kg: document.getElementById('reg-weight').value || undefined,
      goal: document.getElementById('reg-goal').value,
      activity_level: document.getElementById('reg-activity').value,
    };
    try {
      const data = await api('POST', '/auth/register', body);
      token = data.token; localStorage.setItem('gymbro-v2-token', token);
      currentUser = data.user;
      const chosen = await askMode();
      mode = chosen;
      await loadPlan();
      enterHome();
    } catch (err) {
      showError('register-error', err.message);
    }
  });

  function hideOverlays() {
    const els = ['result-overlay', 'mode-overlay', 'overlay'];
    els.forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
    stopTimer();
    Voice.stop();
  }

  function forceLogout() {
    token = null; currentUser = null; plan = null; pendingStart = null;
    localStorage.removeItem('gymbro-v2-token');
    hideOverlays();
    show('screen-login');
    const ln = document.getElementById('login-name');
    if (ln) ln.focus();
  }

  function logout() {
    forceLogout();
  }
  const logoutBtns = [document.getElementById('btn-logout')];
  logoutBtns.forEach(b => { if (b) b.addEventListener('click', logout); });

  /* ---------- modal (guide preview) ---------- */
  const overlay = document.getElementById('overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalGuideMedia = document.getElementById('modal-guide-media');
  const modalGuideSteps = document.getElementById('modal-guide-steps');
  const modalGuideWatch = document.getElementById('modal-guide-watch');

  document.getElementById('modal-close').addEventListener('click', () => { overlay.hidden = true; });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.hidden = true; });

  /* ---------- keyboard (TV) ---------- */
  document.addEventListener('keydown', (e) => {
    if (!overlay.hidden || !resultOverlay.hidden || !modeOverlay.hidden) return;
    if (mode !== 'tv') return;
    const visible = document.querySelectorAll('.tv-home:not([hidden]) .tv-ex-card, .tv-home:not([hidden]) .tv-bloque-card');
    if (visible.length) {
      const current = Array.prototype.indexOf.call(visible, document.activeElement);
      if (current === -1) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault(); visible[(current + 1) % visible.length].focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault(); visible[(current - 1 + visible.length) % visible.length].focus();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); document.activeElement.click();
      }
    }
  });

  /* ---------- init ---------- */
  Voice.init();
  (async function init() {
    hideOverlays();
    if (!token) { show('screen-login'); return; }
    try {
      currentUser = await api('GET', '/profile');
      const chosen = await askMode();
      mode = chosen;
      await loadPlan();
      enterHome();
    } catch {
      forceLogout();
    }
  })();
})();
