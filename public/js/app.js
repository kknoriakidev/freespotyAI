(function () {
  'use strict';

  const API = {
    tracks: '/api/tracks',
    upload: '/api/upload',
    deleteTrack: (id) => `/api/tracks/${id}`
  };

  const state = {
    tracks: [],
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'off',
    volume: 0.7,
    lastVolume: 0.7,
    filter: 'all'
  };

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = state.volume;

  // ---------- DOM ----------
  const el = {
    tracksGrid: document.getElementById('tracks-grid'),
    trackList: document.getElementById('track-list'),
    emptyState: document.getElementById('empty-state'),
    heroTitle: document.getElementById('hero-title'),
    playerCover: document.getElementById('player-cover'),
    playerTitle: document.getElementById('player-title'),
    playerAuthor: document.getElementById('player-author'),
    btnPlay: document.getElementById('btn-play'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnRepeat: document.getElementById('btn-repeat'),
    btnLike: document.getElementById('btn-like'),
    btnMute: document.getElementById('btn-mute'),
    seek: document.getElementById('seek'),
    timeCurrent: document.getElementById('time-current'),
    timeTotal: document.getElementById('time-total'),
    volume: document.getElementById('volume'),
    openUpload: document.getElementById('open-upload'),
    modal: document.getElementById('upload-modal'),
    form: document.getElementById('upload-form'),
    uploadError: document.getElementById('upload-error'),
    submitBtn: document.querySelector('.submit-btn'),
    submitLabel: document.querySelector('.submit-btn .btn-label'),
    submitSpinner: document.querySelector('.submit-btn .btn-spinner'),
    navBack: document.getElementById('nav-back'),
    navFwd: document.getElementById('nav-fwd'),
    playlistItems: document.querySelectorAll('.playlist-item')
  };

  // ---------- UTILS ----------
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setGreeting() {
    const h = new Date().getHours();
    let greet = 'Добрый вечер';
    if (h < 6) greet = 'Доброй ночи';
    else if (h < 12) greet = 'Доброе утро';
    else if (h < 18) greet = 'Добрый день';
    el.heroTitle.textContent = greet;
  }

  function fallbackCoverHtml() {
    return `<svg viewBox="0 0 24 24" width="40%" height="40%" fill="#6a6a6a"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>`;
  }

  function updateRangeFill(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const val = Number(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.backgroundSize = `${pct}% 100%`;
  }

  // ---------- DATA ----------
  async function loadTracks() {
    try {
      const res = await fetch(API.tracks);
      if (!res.ok) throw new Error('Не удалось загрузить треки');
      state.tracks = await res.json();
      renderTracks();
    } catch (err) {
      console.error(err);
      state.tracks = [];
      renderTracks();
    }
  }

  function visibleTracks() {
    if (state.filter === 'recent') {
      return state.tracks.slice(0, 8);
    }
    return state.tracks;
  }

  // ---------- RENDER ----------
  function renderTracks() {
    const tracks = visibleTracks();
    if (tracks.length === 0) {
      el.tracksGrid.innerHTML = '';
      el.trackList.innerHTML = '';
      el.emptyState.hidden = false;
      return;
    }
    el.emptyState.hidden = true;

    // Grid (top cards)
    const cardLimit = 12;
    el.tracksGrid.innerHTML = tracks.slice(0, cardLimit).map((t) => {
      const cover = t.cover
        ? `<img src="${escapeHtml(t.cover)}" alt="${escapeHtml(t.title)}" />`
        : fallbackCoverHtml();
      return `
        <div class="track-card" data-id="${escapeHtml(t.id)}">
          <div class="cover">${cover}</div>
          <div class="title">${escapeHtml(t.title)}</div>
          <div class="author">${escapeHtml(t.author)}</div>
          <button class="play-overlay" data-play-id="${escapeHtml(t.id)}" aria-label="Play">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.05 3.606l13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"/></svg>
          </button>
        </div>
      `;
    }).join('');

    // List (rows)
    el.trackList.innerHTML = tracks.map((t, i) => {
      const cover = t.cover
        ? `<img src="${escapeHtml(t.cover)}" alt="" />`
        : fallbackCoverHtml();
      const playingClass = state.currentIndex >= 0 && state.tracks[state.currentIndex] && state.tracks[state.currentIndex].id === t.id ? 'playing' : '';
      return `
        <li class="track-row ${playingClass}" data-id="${escapeHtml(t.id)}">
          <div class="index">${i + 1}</div>
          <div class="row-cover">${cover}</div>
          <div class="row-title">${escapeHtml(t.title)}</div>
          <div class="row-author">${escapeHtml(t.author)}</div>
          <button class="row-delete" data-delete-id="${escapeHtml(t.id)}" title="Удалить">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.47 2.47a.75.75 0 0 1 1.06 0L12 10.94l8.47-8.47a.75.75 0 1 1 1.06 1.06L13.06 12l8.47 8.47a.75.75 0 1 1-1.06 1.06L12 13.06l-8.47 8.47a.75.75 0 0 1-1.06-1.06L10.94 12 2.47 3.53a.75.75 0 0 1 0-1.06z"/></svg>
          </button>
        </li>
      `;
    }).join('');
  }

  function highlightPlaying() {
    document.querySelectorAll('.track-row').forEach((row) => {
      row.classList.remove('playing');
    });
    if (state.currentIndex < 0) return;
    const cur = state.tracks[state.currentIndex];
    if (!cur) return;
    const row = document.querySelector(`.track-row[data-id="${cur.id}"]`);
    if (row) row.classList.add('playing');
  }

  // ---------- PLAYBACK ----------
  function playByIndex(index) {
    if (index < 0 || index >= state.tracks.length) return;
    const track = state.tracks[index];
    if (!track) return;
    state.currentIndex = index;
    audio.src = track.url;
    audio.play().then(() => {
      state.isPlaying = true;
      updatePlayButton();
    }).catch((err) => {
      console.error('Playback failed:', err);
      state.isPlaying = false;
      updatePlayButton();
    });
    updatePlayerMeta(track);
    highlightPlaying();
  }

  function playById(id) {
    const idx = state.tracks.findIndex((t) => t.id === id);
    if (idx >= 0) playByIndex(idx);
  }

  function togglePlay() {
    if (state.currentIndex === -1) {
      if (state.tracks.length > 0) playByIndex(0);
      return;
    }
    if (audio.paused) {
      audio.play().then(() => {
        state.isPlaying = true;
        updatePlayButton();
      }).catch(() => {});
    } else {
      audio.pause();
      state.isPlaying = false;
      updatePlayButton();
    }
  }

  function playNext() {
    if (state.tracks.length === 0) return;
    if (state.isShuffle) {
      let next = Math.floor(Math.random() * state.tracks.length);
      if (state.tracks.length > 1 && next === state.currentIndex) {
        next = (next + 1) % state.tracks.length;
      }
      playByIndex(next);
      return;
    }
    const next = (state.currentIndex + 1) % state.tracks.length;
    playByIndex(next);
  }

  function playPrev() {
    if (state.tracks.length === 0) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prev = (state.currentIndex - 1 + state.tracks.length) % state.tracks.length;
    playByIndex(prev);
  }

  function updatePlayerMeta(track) {
    el.playerTitle.textContent = track.title;
    el.playerAuthor.textContent = track.author;
    if (track.cover) {
      el.playerCover.src = track.cover;
      el.playerCover.hidden = false;
    } else {
      el.playerCover.hidden = true;
      el.playerCover.removeAttribute('src');
    }
  }

  function updatePlayButton() {
    el.iconPlay.hidden = state.isPlaying;
    el.iconPause.hidden = !state.isPlaying;
    el.btnPlay.title = state.isPlaying ? 'Пауза' : 'Воспроизвести';
  }

  // ---------- AUDIO EVENTS ----------
  audio.addEventListener('loadedmetadata', () => {
    el.timeTotal.textContent = formatTime(audio.duration);
    el.seek.max = audio.duration || 100;
  });

  audio.addEventListener('timeupdate', () => {
    el.timeCurrent.textContent = formatTime(audio.currentTime);
    if (!seekDragging) {
      el.seek.value = audio.currentTime || 0;
      updateRangeFill(el.seek);
    }
  });

  audio.addEventListener('ended', () => {
    if (state.repeatMode === 'one') {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    if (state.repeatMode === 'all' || state.currentIndex < state.tracks.length - 1 || state.isShuffle) {
      playNext();
    } else {
      state.isPlaying = false;
      updatePlayButton();
    }
  });

  audio.addEventListener('play', () => { state.isPlaying = true; updatePlayButton(); });
  audio.addEventListener('pause', () => { state.isPlaying = false; updatePlayButton(); });

  // ---------- SEEK / VOLUME ----------
  let seekDragging = false;
  el.seek.addEventListener('input', () => {
    seekDragging = true;
    el.timeCurrent.textContent = formatTime(Number(el.seek.value));
    updateRangeFill(el.seek);
  });
  el.seek.addEventListener('change', () => {
    audio.currentTime = Number(el.seek.value);
    seekDragging = false;
  });

  el.volume.addEventListener('input', () => {
    const v = Number(el.volume.value) / 100;
    state.volume = v;
    audio.volume = v;
    if (v > 0) state.lastVolume = v;
    updateRangeFill(el.volume);
  });

  el.btnMute.addEventListener('click', () => {
    if (audio.volume > 0) {
      state.lastVolume = audio.volume;
      audio.volume = 0;
      el.volume.value = 0;
    } else {
      audio.volume = state.lastVolume || 0.7;
      el.volume.value = Math.round(audio.volume * 100);
    }
    updateRangeFill(el.volume);
  });

  // ---------- CONTROLS ----------
  el.btnPlay.addEventListener('click', togglePlay);
  el.btnNext.addEventListener('click', playNext);
  el.btnPrev.addEventListener('click', playPrev);

  el.btnShuffle.addEventListener('click', () => {
    state.isShuffle = !state.isShuffle;
    el.btnShuffle.classList.toggle('active', state.isShuffle);
  });

  el.btnRepeat.addEventListener('click', () => {
    const order = ['off', 'all', 'one'];
    const next = order[(order.indexOf(state.repeatMode) + 1) % order.length];
    state.repeatMode = next;
    el.btnRepeat.classList.toggle('active', next !== 'off');
    el.btnRepeat.title = next === 'off' ? 'Повтор' : next === 'all' ? 'Повтор всего' : 'Повтор одного';
  });

  el.btnLike.addEventListener('click', () => {
    el.btnLike.classList.toggle('active');
  });

  // ---------- DELEGATED CLICKS ----------
  document.addEventListener('click', (ev) => {
    const playId = ev.target.closest('[data-play-id]');
    if (playId) {
      ev.stopPropagation();
      playById(playId.dataset.playId);
      return;
    }
    const card = ev.target.closest('.track-card');
    if (card && card.dataset.id) {
      playById(card.dataset.id);
      return;
    }
    const delBtn = ev.target.closest('[data-delete-id]');
    if (delBtn) {
      ev.stopPropagation();
      deleteTrack(delBtn.dataset.deleteId);
      return;
    }
    const row = ev.target.closest('.track-row');
    if (row && row.dataset.id) {
      playById(row.dataset.id);
    }
  });

  async function deleteTrack(id) {
    if (!confirm('Удалить этот трек?')) return;
    try {
      const res = await fetch(API.deleteTrack(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Не удалось удалить');
      const cur = state.tracks[state.currentIndex];
      if (cur && cur.id === id) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        state.currentIndex = -1;
        state.isPlaying = false;
        el.playerTitle.textContent = 'Ничего не играет';
        el.playerAuthor.textContent = '';
        el.playerCover.hidden = true;
        updatePlayButton();
      }
      await loadTracks();
    } catch (err) {
      alert(err.message);
    }
  }

  // ---------- PLAYLISTS ----------
  el.playlistItems.forEach((item) => {
    item.addEventListener('click', () => {
      el.playlistItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      state.filter = item.dataset.filter || 'all';
      renderTracks();
    });
  });

  // ---------- MODAL / UPLOAD ----------
  function openModal() {
    el.modal.hidden = false;
    el.uploadError.hidden = true;
    el.form.reset();
  }

  function closeModal() {
    el.modal.hidden = true;
    el.uploadError.hidden = true;
  }

  el.openUpload.addEventListener('click', openModal);
  document.querySelectorAll('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !el.modal.hidden) closeModal();
    if (ev.key === ' ' && ev.target.tagName !== 'INPUT' && ev.target.tagName !== 'TEXTAREA') {
      ev.preventDefault();
      togglePlay();
    }
    if (ev.key === 'ArrowRight' && ev.target.tagName !== 'INPUT') playNext();
    if (ev.key === 'ArrowLeft' && ev.target.tagName !== 'INPUT') playPrev();
  });

  el.form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    el.uploadError.hidden = true;

    const formData = new FormData(el.form);
    const trackFile = formData.get('track');
    if (!trackFile || (trackFile instanceof File && trackFile.size === 0)) {
      el.uploadError.textContent = 'Пожалуйста, выберите аудио-файл.';
      el.uploadError.hidden = false;
      return;
    }

    el.submitBtn.disabled = true;
    el.submitLabel.textContent = 'Загрузка...';
    el.submitSpinner.hidden = false;

    try {
      const res = await fetch(API.upload, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      closeModal();
      await loadTracks();
    } catch (err) {
      el.uploadError.textContent = err.message;
      el.uploadError.hidden = false;
    } finally {
      el.submitBtn.disabled = false;
      el.submitLabel.textContent = 'Опубликовать';
      el.submitSpinner.hidden = true;
    }
  });

  // ---------- NAV BUTTONS ----------
  el.navBack.addEventListener('click', () => history.back());
  el.navFwd.addEventListener('click', () => history.forward());

  // ---------- INIT ----------
  el.volume.value = Math.round(state.volume * 100);
  updateRangeFill(el.volume);
  updateRangeFill(el.seek);
  setGreeting();
  loadTracks();
})();
