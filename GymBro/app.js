(function () {
  const cards = Array.from(document.querySelectorAll('.card'));
  const overlay = document.getElementById('overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalStart = document.getElementById('modal-start');
  const modalClose = document.getElementById('modal-close');

  const trainingInfo = {
    cardio:   { title: 'Cardio',       desc: 'Quema calorías con sesiones de cardio adaptadas a tu nivel.' },
    strength: { title: 'Fuerza',       desc: 'Ejercicios de fuerza para ganar músculo desde casa.' },
    yoga:     { title: 'Yoga',         desc: 'Mejora tu flexibilidad y equilibrio con rutinas guiadas.' },
    hiit:     { title: 'HIIT',         desc: 'Entrenamiento de alta intensidad para resultados rápidos.' },
    dance:    { title: 'Baile',        desc: 'Rutinas de baile para ejercitarte divirtiéndote.' },
    meditation: { title: 'Meditación', desc: 'Despeja tu mente y reduce el estrés.' },
  };

  let focusIndex = 0;

  function setFocus(idx) {
    focusIndex = (idx + cards.length) % cards.length;
    cards[focusIndex].focus();
  }

  function openModal(category) {
    const info = trainingInfo[category];
    if (!info) return;
    modalTitle.textContent = info.title;
    modalDesc.textContent = info.desc;
    overlay.hidden = false;
    modalStart.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    cards[focusIndex].focus();
  }

  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      focusIndex = i;
      openModal(card.dataset.category);
    });
  });

  modalStart.addEventListener('click', () => {
    closeModal();
  });

  modalClose.addEventListener('click', closeModal);

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.hidden) return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocus(focusIndex + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocus(focusIndex - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocus(focusIndex + 3);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocus(focusIndex - 3);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        cards[focusIndex]?.click();
        break;
    }
  });

  setFocus(0);
})();
