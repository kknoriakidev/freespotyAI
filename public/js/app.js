(function () {
  'use strict';

  const state = {
    tracks: [],
    currentIndex: -1,
    isPlaying: false,
    shuffle: false,
    repeat: 'off',
    volume: 0.8,
    muted: false,
    prevVolume: 0.8,
    liked: new Set(JSON.parse(localStorage.getItem('spotifree.liked') || '[]')),
    searchQuery: ''
  };

  const els = {
    audio: document.getElementById('audioEl'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    playIcon: document.getElementById('playIcon'),
    pauseIcon: document.getElementById('pauseIcon'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    repeatBtn: document.getElementById('repeatBtn'),
    seekBar: document.getElementById('seekBar'),
    currentTime: document.getElementById('currentTime'),
    durationTime: document.getElementById('durationTime'),
    volumeBar: document.getElementById('volumeBar'),
    muteBtn: document.getElementById('muteBtn'),
    playerCover: document.getElementById('playerCover'),
    playerTitle: document.getElementById('playerTitle'),
    playerArtist: document.getElementById('playerArtist'),
    playerLike: document.getElementById('playerLike'),
    trackCards: document.getElementById('trackCards'),
    quickTracks: document.getElementById('quickTracks'),
    emptyState: document.getElementById('emptyState'),
    sidebarTrackList: document.getElementById('sidebarTrackList'),
    uploadForm: document.getElementById('uploadForm'),
    coverInput: document.getElementById('coverInput'),
    coverPreview: document.getElementById('coverPreview'),
    coverPlaceholder: document.getElementById('coverPlaceholder'),
    audioInput: document.getElementById('audioInput'),
    audioFileName: document.getElementById('audioFileName'),
    titleInput: document.getElementById('titleInput'),
    artistInput: document.getElementById('artistInput'),
    albumInput: document.getElementById('albumInput'),
    submitUploadBtn: document.getElementById('submitUploadBtn'),
    resetUploadBtn: document.getElementById('resetUploadBtn'),
    uploadStatus: document.getElementById('uploadStatus'),
    refreshLibrary: document.getElementById('refreshLibrary'),
    emptyUploadBtn: document.getElementById('emptyUploadBtn'),
    openUploadBtn: document.getElementById('openUploadBtn'),
    searchInput: document.getElementById('searchInput'),
    uploadModal: document.getElementById('uploadModal'),
    modalGoForm: document.getElementById('modalGoForm'),
    heroTitle: document.querySelector('.hero__title')
  };

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
  }

  function setRangeFill(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const val = Number(input.value) || 0;
    const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
    input.style.setProperty('--val', pct + '%');
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function greetingByTime() {
    const h = new Date().getHours();
    if (h < 6) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  }

  async function fetchTracks() {
    try {
      const res = await fetch('/api/tracks', { cache: 'no-store' });
      if (!res.ok) throw new Error('Не удалось загрузить треки');
      const data = await res.json();
      state.tracks = Array.isArray(data.tracks) ? data.tracks : [];
      renderAll();
    } catch (err) {
      console.error(err);
      setStatus('Ошибка загрузки списка треков: ' + err.message, 'error');
    }
  }

  function getFilteredTracks() {
    if (!state.searchQuery) return state.tracks;
    const q = state.searchQuery.toLowerCase();
    return state.tracks.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.artist || '').toLowerCase().includes(q) ||
      (t.album || '').toLowerCase().includes(q)
    );
  }

  function renderAll() {
    renderCards();
    renderQuick();
    renderSidebarList();
    updatePlayerLikeUI();
  }

  function renderCards() {
    const tracks = getFilteredTracks();
    if (!tracks.length) {
      els.trackCards.innerHTML = '';
      els.emptyState.classList.add('show');
      return;
    }
    els.emptyState.classList.remove('show');

    els.trackCards.innerHTML = tracks.map((t, i) => {
      const idx = state.tracks.indexOf(t);
      const cover = t.coverUrl
        ? `<img class="card__cover" src="${escapeHtml(t.coverUrl)}" alt="${escapeHtml(t.title)}" loading="lazy" />`
        : `<div class="card__cover--ph">♪</div>`;
      return `
        <div class="card" data-index="${idx}" data-id="${escapeHtml(t.id)}">
          <div class="card__cover-wrap">
            ${cover}
            <button class="card__play" data-action="play" data-index="${idx}" title="Воспроизвести">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
          <button class="card__menu" data-action="delete" data-id="${escapeHtml(t.id)}" title="Удалить">×</button>
          <div class="card__title">${escapeHtml(t.title)}</div>
          <div class="card__artist">${escapeHtml(t.artist || 'Unknown Artist')}</div>
        </div>
      `;
    }).join('');
  }

  function renderQuick() {
    const top = state.tracks.slice(0, 6);
    if (!top.length) {
      els.quickTracks.innerHTML = '';
      return;
    }
    els.quickTracks.innerHTML = top.map(t => {
      const idx = state.tracks.indexOf(t);
      const cover = t.coverUrl
        ? `<img class="quick-card__cover" src="${escapeHtml(t.coverUrl)}" alt="${escapeHtml(t.title)}" loading="lazy" />`
        : `<div class="quick-card__cover quick-card__cover--ph">♪</div>`;
      return `
        <div class="quick-card" data-index="${idx}">
          ${cover}
          <div class="quick-card__title">${escapeHtml(t.title)}</div>
          <button class="quick-card__play" data-action="play" data-index="${idx}" title="Воспроизвести">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      `;
    }).join('');
  }

  function renderSidebarList() {
    if (!state.tracks.length) {
      els.sidebarTrackList.innerHTML = `<div class="sidebar__track-item" style="cursor:default;color:#6a6a6a"><div class="sidebar__track-meta"><div class="sidebar__track-title" style="color:#6a6a6a">Нет треков</div><div class="sidebar__track-artist">Загрузи свой первый</div></div></div>`;
      return;
    }
    els.sidebarTrackList.innerHTML = state.tracks.map((t, i) => {
      const cover = t.coverUrl
        ? `<img class="sidebar__track-thumb" src="${escapeHtml(t.coverUrl)}" alt="" loading="lazy" />`
        : `<div class="sidebar__track-thumb" style="display:flex;align-items:center;justify-content:center;color:#6a6a6a">♪</div>`;
      const active = i === state.currentIndex ? 'active' : '';
      return `
        <div class="sidebar__track-item ${active}" data-index="${i}" data-action="play">
          ${cover}
          <div class="sidebar__track-meta">
            <div class="sidebar__track-title">${escapeHtml(t.title)}</div>
            <div class="sidebar__track-artist">${escapeHtml(t.artist || 'Unknown Artist')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function loadTrack(index, autoplay) {
    if (index < 0 || index >= state.tracks.length) return;
    state.currentIndex = index;
    const t = state.tracks[index];
    els.audio.src = t.audioUrl;
    els.audio.load();

    els.playerTitle.textContent = t.title;
    els.playerArtist.textContent = t.artist || 'Unknown Artist';

    els.playerCover.innerHTML = t.coverUrl
      ? `<img src="${escapeHtml(t.coverUrl)}" alt="${escapeHtml(t.title)}" />`
      : `<span class="player__cover-fallback">♪</span>`;

    updatePlayerLikeUI();
    renderSidebarList();

    if (autoplay) {
      play();
    }
  }

  function play() {
    if (state.currentIndex === -1 && state.tracks.length) {
      loadTrack(0, false);
    }
    const p = els.audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(err => {
        console.warn('Play failed:', err);
        setStatus('Не получилось запустить воспроизведение: ' + err.message, 'error');
      });
    }
  }

  function pause() {
    els.audio.pause();
  }

  function togglePlay() {
    if (!state.tracks.length) {
      setStatus('Сначала загрузи трек ниже', 'progress');
      return;
    }
    if (state.currentIndex === -1) {
      loadTrack(0, true);
      return;
    }
    if (els.audio.paused) play();
    else pause();
  }

  function nextTrack() {
    if (!state.tracks.length) return;
    let next;
    if (state.shuffle) {
      if (state.tracks.length === 1) next = 0;
      else {
        do {
          next = Math.floor(Math.random() * state.tracks.length);
        } while (next === state.currentIndex);
      }
    } else {
      next = state.currentIndex + 1;
      if (next >= state.tracks.length) {
        if (state.repeat === 'all') next = 0;
        else {
          pause();
          return;
        }
      }
    }
    loadTrack(next, true);
  }

  function prevTrack() {
    if (!state.tracks.length) return;
    if (els.audio.currentTime > 3) {
      els.audio.currentTime = 0;
      return;
    }
    let prev = state.currentIndex - 1;
    if (prev < 0) prev = state.tracks.length - 1;
    loadTrack(prev, true);
  }

  function updatePlayerLikeUI() {
    const t = state.tracks[state.currentIndex];
    if (!t) {
      els.playerLike.classList.remove('active');
      els.playerLike.textContent = '♡';
      return;
    }
    const liked = state.liked.has(t.id);
    els.playerLike.classList.toggle('active', liked);
    els.playerLike.textContent = liked ? '♥' : '♡';
  }

  function toggleLike() {
    const t = state.tracks[state.currentIndex];
    if (!t) return;
    if (state.liked.has(t.id)) state.liked.delete(t.id);
    else state.liked.add(t.id);
    localStorage.setItem('spotifree.liked', JSON.stringify(Array.from(state.liked)));
    updatePlayerLikeUI();
  }

  function setStatus(msg, type) {
    els.uploadStatus.textContent = msg || '';
    els.uploadStatus.className = 'upload-status';
    if (type) els.uploadStatus.classList.add(type);
  }

  async function handleUpload(e) {
    e.preventDefault();

    const audioFile = els.audioInput.files && els.audioInput.files[0];
    const coverFile = els.coverInput.files && els.coverInput.files[0];
    const title = els.titleInput.value.trim();
    const artist = els.artistInput.value.trim();
    const album = els.albumInput.value.trim();

    if (!audioFile) {
      setStatus('Выбери аудиофайл', 'error');
      return;
    }
    if (!title) {
      setStatus('Введи название трека', 'error');
      return;
    }

    const fd = new FormData();
    fd.append('audio', audioFile);
    if (coverFile) fd.append('cover', coverFile);
    fd.append('title', title);
    fd.append('artist', artist);
    fd.append('album', album);

    els.submitUploadBtn.disabled = true;
    setStatus('Загрузка...', 'progress');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      setStatus('Готово! Трек добавлен в библиотеку.', 'success');
      els.uploadForm.reset();
      resetCoverPreview();
      els.audioFileName.textContent = 'Файл не выбран';
      await fetchTracks();
    } catch (err) {
      console.error(err);
      setStatus('Ошибка загрузки: ' + err.message, 'error');
    } finally {
      els.submitUploadBtn.disabled = false;
    }
  }

  function resetCoverPreview() {
    els.coverPreview.src = '';
    els.coverPreview.classList.remove('show');
    els.coverPlaceholder.classList.remove('hide');
  }

  function handleCoverChange() {
    const file = els.coverInput.files && els.coverInput.files[0];
    if (!file) {
      resetCoverPreview();
      return;
    }
    const url = URL.createObjectURL(file);
    els.coverPreview.src = url;
    els.coverPreview.classList.add('show');
    els.coverPlaceholder.classList.add('hide');
  }

  function handleAudioChange() {
    const file = els.audioInput.files && els.audioInput.files[0];
    els.audioFileName.textContent = file ? file.name : 'Файл не выбран';
    if (file && !els.titleInput.value.trim()) {
      const guess = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      els.titleInput.value = guess.slice(0, 200);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    if (!confirm('Удалить этот трек?')) return;
    try {
      const res = await fetch('/api/tracks/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || ('HTTP ' + res.status));
      }
      const removedIdx = state.tracks.findIndex(t => t.id === id);
      if (removedIdx === state.currentIndex) {
        pause();
        state.currentIndex = -1;
        els.playerTitle.textContent = 'Ничего не играет';
        els.playerArtist.textContent = 'Выбери трек из библиотеки';
        els.playerCover.innerHTML = '<span class="player__cover-fallback">♪</span>';
        els.audio.src = '';
      } else if (removedIdx !== -1 && removedIdx < state.currentIndex) {
        state.currentIndex--;
      }
      await fetchTracks();
    } catch (err) {
      console.error(err);
      alert('Не удалось удалить: ' + err.message);
    }
  }

  function openModal() {
    els.uploadModal.classList.add('open');
    els.uploadModal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    els.uploadModal.classList.remove('open');
    els.uploadModal.setAttribute('aria-hidden', 'true');
  }

  function scrollToForm() {
    closeModal();
    els.uploadForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => els.titleInput.focus(), 400);
  }

  function bindEvents() {
    els.playPauseBtn.addEventListener('click', togglePlay);
    els.nextBtn.addEventListener('click', nextTrack);
    els.prevBtn.addEventListener('click', prevTrack);

    els.shuffleBtn.addEventListener('click', () => {
      state.shuffle = !state.shuffle;
      els.shuffleBtn.classList.toggle('active', state.shuffle);
    });

    els.repeatBtn.addEventListener('click', () => {
      const order = ['off', 'all', 'one'];
      const i = order.indexOf(state.repeat);
      state.repeat = order[(i + 1) % order.length];
      els.repeatBtn.classList.toggle('active', state.repeat !== 'off');
      els.repeatBtn.title = state.repeat === 'one' ? 'Повтор трека'
        : state.repeat === 'all' ? 'Повтор всех'
        : 'Повтор выключен';
    });

    els.audio.addEventListener('play', () => {
      state.isPlaying = true;
      els.playIcon.style.display = 'none';
      els.pauseIcon.style.display = '';
      els.playPauseBtn.title = 'Пауза';
    });

    els.audio.addEventListener('pause', () => {
      state.isPlaying = false;
      els.playIcon.style.display = '';
      els.pauseIcon.style.display = 'none';
      els.playPauseBtn.title = 'Воспроизвести';
    });

    els.audio.addEventListener('timeupdate', () => {
      const dur = els.audio.duration || 0;
      const cur = els.audio.currentTime || 0;
      const pct = dur ? (cur / dur) * 1000 : 0;
      els.seekBar.value = pct;
      setRangeFill(els.seekBar);
      els.currentTime.textContent = formatTime(cur);
    });

    els.audio.addEventListener('loadedmetadata', () => {
      els.durationTime.textContent = formatTime(els.audio.duration);
      setRangeFill(els.seekBar);
    });

    els.audio.addEventListener('ended', () => {
      if (state.repeat === 'one') {
        els.audio.currentTime = 0;
        play();
      } else {
        nextTrack();
      }
    });

    els.audio.addEventListener('error', () => {
      setStatus('Не удалось воспроизвести файл', 'error');
    });

    els.seekBar.addEventListener('input', () => {
      const dur = els.audio.duration || 0;
      const pct = Number(els.seekBar.value) / 1000;
      els.audio.currentTime = dur * pct;
      setRangeFill(els.seekBar);
    });

    els.volumeBar.addEventListener('input', () => {
      const v = Number(els.volumeBar.value) / 100;
      state.volume = v;
      state.muted = v === 0;
      els.audio.volume = v;
      els.audio.muted = false;
      setRangeFill(els.volumeBar);
      localStorage.setItem('spotifree.volume', String(v));
    });

    els.muteBtn.addEventListener('click', () => {
      if (state.muted || els.audio.volume === 0) {
        const v = state.prevVolume || 0.8;
        state.muted = false;
        state.volume = v;
        els.audio.volume = v;
        els.audio.muted = false;
        els.volumeBar.value = Math.round(v * 100);
      } else {
        state.prevVolume = state.volume;
        state.muted = true;
        els.audio.volume = 0;
        els.audio.muted = true;
        els.volumeBar.value = 0;
      }
      setRangeFill(els.volumeBar);
    });

    els.playerLike.addEventListener('click', toggleLike);

    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) {
        const card = e.target.closest('.card, .quick-card, .sidebar__track-item');
        if (card && card.dataset.index !== undefined) {
          const idx = Number(card.dataset.index);
          loadTrack(idx, true);
        }
        return;
      }
      const action = target.dataset.action;
      if (action === 'play') {
        e.stopPropagation();
        const idx = Number(target.dataset.index);
        loadTrack(idx, true);
      } else if (action === 'delete') {
        e.stopPropagation();
        handleDelete(target.dataset.id);
      }
    });

    els.uploadForm.addEventListener('submit', handleUpload);
    els.uploadForm.addEventListener('reset', () => {
      resetCoverPreview();
      setStatus('', '');
      els.audioFileName.textContent = 'Файл не выбран';
    });
    els.coverInput.addEventListener('change', handleCoverChange);
    els.audioInput.addEventListener('change', handleAudioChange);

    els.refreshLibrary.addEventListener('click', (e) => {
      e.preventDefault();
      fetchTracks();
    });

    els.emptyUploadBtn.addEventListener('click', () => {
      els.uploadForm.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => els.titleInput.focus(), 400);
    });

    els.openUploadBtn.addEventListener('click', openModal);
    els.modalGoForm.addEventListener('click', scrollToForm);
    els.uploadModal.addEventListener('click', (e) => {
      if (e.target.dataset.close !== undefined) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' && e.shiftKey) {
        nextTrack();
      } else if (e.code === 'ArrowLeft' && e.shiftKey) {
        prevTrack();
      } else if (e.code === 'Escape') {
        closeModal();
      }
    });

    els.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderCards();
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        if (view === 'search') els.searchInput.focus();
        if (view === 'library' || view === 'home') {
          document.querySelector('.cards').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function restoreVolume() {
    const stored = parseFloat(localStorage.getItem('spotifree.volume'));
    const v = isFinite(stored) ? stored : 0.8;
    state.volume = v;
    state.prevVolume = v || 0.8;
    els.audio.volume = v;
    els.volumeBar.value = Math.round(v * 100);
    setRangeFill(els.volumeBar);
    setRangeFill(els.seekBar);
  }

  function init() {
    els.heroTitle.textContent = greetingByTime();
    bindEvents();
    restoreVolume();
    fetchTracks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
