/**
 * Continuous Multi-Project Demo Loop
 * Launcher only — does not modify the project HTML files.
 */

(() => {
  "use strict";

  const PROJECTS = [
    {
      id: "01",
      type: "html",
      src: "arbased.html",
      label: "PROJECT 01",
      title: "CHIP2STARTUP AR LEARNING PLATFORM",
      short: "01",
      duration: 14000,
    },
    {
      id: "02",
      type: "html",
      src: "chipdesignbypass.html",
      label: "PROJECT 02",
      title: "AR CHIP DESIGN EXPLORER",
      short: "02",
      duration: 14000,
    },
    {
      id: "03",
      type: "html",
      src: "arsmartcampus.html",
      label: "PROJECT 03",
      title: "RUAS SMART CAMPUS",
      short: "03",
      duration: 14000,
    },
    {
      id: "04",
      type: "html",
      src: "ardrone.html",
      label: "PROJECT 04",
      title: "RUAS AR DRONE PLATFORM",
      short: "04",
      duration: 14000,
    },
    {
      id: "05",
      type: "html",
      src: "venoclot-w-heater.html",
      label: "PROJECT 05",
      title: "VENOCLOT DEVICE INSPECTION",
      short: "05",
      duration: 14000,
    },
    {
      id: "06",
      type: "video",
      src: "InShot_20260916_164134127.mp4",
      label: "PROJECT 06",
      title: "SHOWCASE VIDEO",
      short: "VID",
      duration: 20000,
    },
  ];

  const FADE_MS = 850;
  const INTRO_MS = 2200;
  const CONTROLS_HIDE_MS = 4000;
  const LOAD_TIMEOUT_MS = 15000;
  const UNAVAILABLE_HOLD_MS = 2500;
  const DEFAULT_DURATION = 14000;
  const VIDEO_MAX_MS = 90000;

  /** @typedef {"boot"|"intro"|"playing"|"paused"|"stopped"|"transitioning"} DemoState */

  const state = {
    /** @type {DemoState} */
    mode: "boot",
    index: 0,
    activeSlot: 0,
    timerId: null,
    progressId: null,
    projectStartedAt: 0,
    durationMs: DEFAULT_DURATION,
    remainingMs: 0,
    controlsHideId: null,
    transitioning: false,
    loadSerial: 0,
    showingVideo: false,
  };

  const els = {
    intro: document.getElementById("intro"),
    introLogo: document.getElementById("intro-logo"),
    introA: document.getElementById("intro-a"),
    introB: document.getElementById("intro-b"),
    introRule: document.getElementById("intro-rule"),
    brandStack: document.getElementById("brand-stack"),
    stage: document.getElementById("stage"),
    frames: [
      document.getElementById("frame-a"),
      document.getElementById("frame-b"),
    ],
    videoPanel: document.getElementById("video-panel"),
    video: document.getElementById("demo-video"),
    veil: document.getElementById("transition-veil"),
    badgeNum: document.getElementById("badge-num"),
    badgeTitle: document.getElementById("badge-title"),
    progressFill: document.getElementById("progress-fill"),
    progressDots: document.getElementById("progress-dots"),
    jumpRow: document.getElementById("jump-row"),
    errorToast: document.getElementById("error-toast"),
    controls: document.getElementById("controls"),
    btnPlay: document.getElementById("btn-play"),
    btnPause: document.getElementById("btn-pause"),
    btnStop: document.getElementById("btn-stop"),
    btnRestart: document.getElementById("btn-restart"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    btnFs: document.getElementById("btn-fs"),
  };

  // ---------- helpers ----------

  function clearTimer() {
    if (state.timerId != null) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
  }

  function clearProgress() {
    if (state.progressId != null) {
      clearInterval(state.progressId);
      state.progressId = null;
    }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function otherSlot(slot) {
    return slot === 0 ? 1 : 0;
  }

  function project() {
    return PROJECTS[state.index];
  }

  function safeDuration(ms) {
    const n = Number(ms);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_DURATION;
  }

  function updateBadge() {
    const p = project();
    els.badgeNum.textContent = p.label;
    els.badgeTitle.textContent = p.title;
    els.brandStack.classList.add("visible");
  }

  function buildProgressDots() {
    const frag = document.createDocumentFragment();
    PROJECTS.forEach((p, i) => {
      if (i > 0) {
        const seg = document.createElement("span");
        seg.className = "seg";
        frag.appendChild(seg);
      }
      const label = document.createElement("span");
      label.className = "label";
      label.dataset.i = String(i);
      label.textContent = p.label;
      frag.appendChild(label);
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.dataset.i = String(i);
      frag.appendChild(dot);
    });
    els.progressDots.innerHTML = "";
    els.progressDots.appendChild(frag);
  }

  function buildJumpButtons() {
    els.jumpRow.innerHTML = "";
    PROJECTS.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ctrl-btn jump";
      btn.dataset.index = String(i);
      btn.title = `${p.label} — ${p.title}`;
      btn.textContent = p.short;
      btn.addEventListener("click", () => jumpTo(i));
      els.jumpRow.appendChild(btn);
    });
  }

  function updateProgressDots() {
    els.progressDots.querySelectorAll(".label").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.i) === state.index);
    });
    els.progressDots.querySelectorAll(".dot").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.i) === state.index);
    });
    els.jumpRow.querySelectorAll(".jump").forEach((el) => {
      el.classList.toggle("active-state", Number(el.dataset.index) === state.index);
    });
  }

  function setProgress(pct) {
    els.progressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function showError(msg) {
    els.errorToast.textContent = msg;
    els.errorToast.classList.add("visible");
  }

  function hideError() {
    els.errorToast.classList.remove("visible");
  }

  function updatePlayPauseUI() {
    const playing = state.mode === "playing" || state.mode === "transitioning";
    els.btnPlay.classList.toggle("active-state", playing);
    els.btnPause.classList.toggle("active-state", state.mode === "paused");
    els.btnStop.classList.toggle("active-state", state.mode === "stopped");
  }

  // ---------- controls visibility ----------

  function revealControls() {
    els.controls.classList.add("revealed");
    if (state.controlsHideId) clearTimeout(state.controlsHideId);
    state.controlsHideId = setTimeout(() => {
      els.controls.classList.remove("revealed");
    }, CONTROLS_HIDE_MS);
  }

  function bindControlReveal() {
    const poke = () => {
      revealControls();
      window.focus();
    };
    ["hotzone-top", "hotzone-right"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("mouseenter", poke);
        el.addEventListener("mousemove", poke, { passive: true });
      }
    });
    els.controls.addEventListener("mouseenter", poke);
    els.controls.addEventListener("mousedown", poke);
    window.addEventListener("touchstart", poke, { passive: true });
  }

  // ---------- media helpers ----------

  function unloadFrame(iframe) {
    iframe.classList.remove("active", "fading-in", "fading-out");
    iframe.style.opacity = "";
    iframe.dataset.loadSerial = "0";
    try {
      iframe.removeAttribute("src");
      iframe.srcdoc =
        "<!doctype html><title></title><body style='margin:0;background:#01050c'></body>";
    } catch (_) {
      /* ignore */
    }
  }

  function unloadAllFrames() {
    els.frames.forEach(unloadFrame);
  }

  function stopVideo() {
    try {
      els.video.pause();
      els.video.currentTime = 0;
    } catch (_) {
      /* ignore */
    }
  }

  function pauseVideo() {
    try {
      els.video.pause();
    } catch (_) {
      /* ignore */
    }
  }

  async function playVideoFromStart() {
    try {
      els.video.currentTime = 0;
      els.video.muted = true;
      els.video.loop = true;
      els.video.playbackRate = 0.5;
      await els.video.play();
    } catch (_) {
      /* autoplay may be blocked — still show the frame */
    }
  }

  async function resumeVideo() {
    try {
      els.video.muted = true;
      els.video.playbackRate = 0.5;
      await els.video.play();
    } catch (_) {
      /* ignore */
    }
  }

  function hideVideoPanel() {
    els.videoPanel.classList.remove("active", "fading-in", "fading-out");
    els.videoPanel.style.opacity = "";
    els.videoPanel.setAttribute("aria-hidden", "true");
    stopVideo();
    state.showingVideo = false;
  }

  function frameLooksReady(iframe, srcFile) {
    try {
      const doc = iframe.contentWindow && iframe.contentWindow.document;
      if (!doc) return false;
      const href = iframe.contentWindow.location.href || "";
      if (!href || href === "about:blank" || href.startsWith("about:")) return false;
      if (!href.includes(srcFile)) return false;
      if (doc.readyState !== "complete" && doc.readyState !== "interactive") return false;
      return true;
    } catch (_) {
      const current = iframe.getAttribute("src") || iframe.src || "";
      return current.includes(srcFile) && !current.includes("about:");
    }
  }

  function loadProjectInto(iframe, src) {
    return new Promise((resolve) => {
      let settled = false;
      const serial = String(++state.loadSerial);
      const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const sep = src.includes("?") ? "&" : "?";
      const fullSrc = `${src}${sep}_demo=${token}`;
      const srcFile = src.split("?")[0];

      try {
        iframe.removeAttribute("srcdoc");
      } catch (_) {
        /* ignore */
      }

      iframe.dataset.loadSerial = serial;

      const finish = (ok) => {
        if (settled) return;
        if (iframe.dataset.loadSerial !== serial) return;
        settled = true;
        iframe.removeEventListener("load", onLoad);
        clearTimeout(timeoutId);
        clearInterval(pollId);
        resolve(ok);
      };

      const onLoad = () => {
        setTimeout(() => {
          if (iframe.dataset.loadSerial !== serial) return;
          if (frameLooksReady(iframe, srcFile)) finish(true);
        }, 50);
      };

      const pollId = setInterval(() => {
        if (iframe.dataset.loadSerial !== serial) return;
        if (frameLooksReady(iframe, srcFile)) finish(true);
      }, 200);

      const timeoutId = setTimeout(() => {
        if (frameLooksReady(iframe, srcFile)) finish(true);
        else finish(false);
      }, LOAD_TIMEOUT_MS);

      iframe.addEventListener("load", onLoad);
      iframe.src = fullSrc;
    });
  }

  function getVideoHoldMs(fallback) {
    const d = els.video.duration;
    const rate = 0.5;
    if (Number.isFinite(d) && d > 0) {
      // Wall-clock time for one full playthrough at 0.5x
      return Math.min(Math.round((d * 1000) / rate), VIDEO_MAX_MS);
    }
    return safeDuration(fallback);
  }

  function ensureVideoReady() {
    return new Promise((resolve) => {
      if (Number.isFinite(els.video.duration) && els.video.duration > 0) {
        resolve(true);
        return;
      }
      const done = (ok) => {
        els.video.removeEventListener("loadedmetadata", onMeta);
        els.video.removeEventListener("error", onErr);
        clearTimeout(t);
        resolve(ok);
      };
      const onMeta = () => done(true);
      const onErr = () => done(false);
      const t = setTimeout(() => done(Number.isFinite(els.video.duration) && els.video.duration > 0), 8000);
      els.video.addEventListener("loadedmetadata", onMeta);
      els.video.addEventListener("error", onErr);
      try {
        els.video.load();
      } catch (_) {
        /* ignore */
      }
    });
  }

  // ---------- progress ticker ----------

  function startProgressTicker(durationMs) {
    clearProgress();
    const dur = safeDuration(durationMs);
    state.durationMs = dur;
    state.projectStartedAt = performance.now();
    state.remainingMs = dur;

    const tick = () => {
      if (state.mode !== "playing") return;
      const elapsed = performance.now() - state.projectStartedAt;
      const left = Math.max(0, dur - elapsed);
      state.remainingMs = left;
      setProgress((elapsed / dur) * 100);
      if (left <= 0) clearProgress();
    };

    tick();
    state.progressId = setInterval(tick, 100);
  }

  function scheduleAdvance(ms) {
    clearTimer();
    const delay = safeDuration(ms);
    state.timerId = setTimeout(() => {
      state.timerId = null;
      if (state.mode === "playing" && !state.transitioning) {
        goNext();
      }
    }, delay);
  }

  function beginPlayback(holdMs) {
    state.mode = "playing";
    updatePlayPauseUI();
    setProgress(0);
    startProgressTicker(holdMs);
    scheduleAdvance(holdMs);
  }

  // ---------- core show / transition ----------

  async function showProject(index, { resumeMode = null, force = false } = {}) {
    if (state.transitioning && !force) return;

    const intended =
      resumeMode ||
      (state.mode === "paused" || state.mode === "stopped" ? state.mode : "playing");

    state.transitioning = true;
    state.mode = "transitioning";
    clearTimer();
    clearProgress();
    updatePlayPauseUI();

    state.index = ((index % PROJECTS.length) + PROJECTS.length) % PROJECTS.length;
    const p = project();
    updateProgressDots();
    hideError();
    els.veil.classList.add("on");

    let loaded = true;
    let holdMs = safeDuration(p.duration);

    if (p.type === "video") {
      // Fade out any active iframe, show looping video
      els.frames.forEach((f) => {
        if (f.classList.contains("active") || getComputedStyle(f).opacity !== "0") {
          f.classList.add("fading-out");
          f.classList.remove("active");
        }
      });

      els.videoPanel.classList.remove("active", "fading-out");
      els.videoPanel.style.opacity = "0";
      els.videoPanel.setAttribute("aria-hidden", "false");

      loaded = await ensureVideoReady();
      holdMs = loaded ? getVideoHoldMs(p.duration) : UNAVAILABLE_HOLD_MS;
      if (!loaded) showError("Video unavailable — continuing…");

      els.videoPanel.classList.add("fading-in");
      els.videoPanel.style.opacity = "1";
      await playVideoFromStart();
      await wait(FADE_MS);

      els.videoPanel.classList.remove("fading-in");
      els.videoPanel.classList.add("active");
      els.videoPanel.style.opacity = "";
      unloadAllFrames();
      state.showingVideo = true;
    } else {
      // HTML project via dual iframe slots
      if (state.showingVideo) {
        els.videoPanel.classList.add("fading-out");
        els.videoPanel.classList.remove("active");
        pauseVideo();
      }

      const fromSlot = state.activeSlot;
      const toSlot = otherSlot(fromSlot);
      const fromFrame = els.frames[fromSlot];
      const toFrame = els.frames[toSlot];

      toFrame.classList.remove("active", "fading-out", "fading-in");
      toFrame.style.opacity = "0";

      loaded = await loadProjectInto(toFrame, p.src);
      holdMs = safeDuration(loaded ? p.duration : UNAVAILABLE_HOLD_MS);
      if (!loaded) showError("Project unavailable — continuing…");

      toFrame.classList.add("fading-in");
      toFrame.style.opacity = "1";

      const fromSrc = fromFrame.getAttribute("src") || fromFrame.src || "";
      const fromHasContent =
        fromSrc &&
        !fromSrc.includes("about:") &&
        (fromFrame.classList.contains("active") || getComputedStyle(fromFrame).opacity !== "0");

      if (fromFrame !== toFrame && fromHasContent) {
        fromFrame.classList.add("fading-out");
        fromFrame.classList.remove("active");
      }

      await wait(FADE_MS);

      toFrame.classList.remove("fading-in");
      toFrame.classList.add("active");
      toFrame.style.opacity = "";

      if (fromFrame !== toFrame) unloadFrame(fromFrame);
      if (state.showingVideo) hideVideoPanel();

      state.activeSlot = toSlot;
      state.showingVideo = false;
    }

    updateBadge();
    els.veil.classList.remove("on");
    if (loaded) hideError();

    try {
      window.focus();
    } catch (_) {
      /* ignore */
    }

    state.transitioning = false;

    if (state.mode === "paused" || state.mode === "stopped") {
      updatePlayPauseUI();
      setProgress(0);
      state.remainingMs = holdMs;
      if (p.type === "video") pauseVideo();
      return;
    }

    if (intended === "paused" || intended === "stopped") {
      state.mode = intended;
      state.remainingMs = holdMs;
      updatePlayPauseUI();
      setProgress(0);
      if (p.type === "video") pauseVideo();
      return;
    }

    beginPlayback(holdMs);
  }

  async function jumpTo(index) {
    if (state.transitioning) return;
    if (index === state.index && state.mode === "playing") return;
    clearTimer();
    clearProgress();
    await showProject(index, { resumeMode: "playing", force: true });
    revealControls();
  }

  async function goNext() {
    if (state.transitioning) return;
    clearTimer();
    clearProgress();
    const next = (state.index + 1) % PROJECTS.length;
    const resumeMode =
      state.mode === "stopped" || state.mode === "paused" ? state.mode : "playing";
    await showProject(next, { resumeMode });
  }

  async function goPrev() {
    if (state.transitioning) return;
    clearTimer();
    clearProgress();
    const prev = (state.index - 1 + PROJECTS.length) % PROJECTS.length;
    const resumeMode =
      state.mode === "stopped" || state.mode === "paused" ? state.mode : "playing";
    await showProject(prev, { resumeMode });
  }

  // ---------- transport ----------

  function pauseInternal(asStopped) {
    if (state.mode === "playing") {
      const elapsed = performance.now() - state.projectStartedAt;
      state.remainingMs = Math.max(200, safeDuration(state.durationMs) - elapsed);
    }
    clearTimer();
    clearProgress();
    if (state.showingVideo) pauseVideo();
    state.mode = asStopped ? "stopped" : "paused";
    updatePlayPauseUI();
  }

  function play() {
    if (state.transitioning) return;
    if (state.mode === "playing") return;

    if (state.mode === "paused") {
      state.mode = "playing";
      updatePlayPauseUI();
      if (state.showingVideo) resumeVideo();

      const remaining = safeDuration(state.remainingMs || state.durationMs);
      const total = safeDuration(state.durationMs);
      const already = Math.max(0, total - remaining);
      state.projectStartedAt = performance.now() - already;

      clearProgress();
      const tick = () => {
        if (state.mode !== "playing") return;
        const elapsed = performance.now() - state.projectStartedAt;
        const left = Math.max(0, total - elapsed);
        state.remainingMs = left;
        setProgress((elapsed / total) * 100);
        if (left <= 0) clearProgress();
      };
      tick();
      state.progressId = setInterval(tick, 100);
      scheduleAdvance(remaining);
      return;
    }

    if (state.mode === "stopped") {
      state.mode = "playing";
      updatePlayPauseUI();
      if (state.showingVideo) {
        playVideoFromStart();
      }
      const p = project();
      const dur =
        p.type === "video" ? getVideoHoldMs(p.duration) : safeDuration(p.duration);
      setProgress(0);
      startProgressTicker(dur);
      scheduleAdvance(dur);
      return;
    }

    showProject(state.index);
  }

  function pause() {
    if (state.mode === "transitioning") {
      state.mode = "paused";
      clearTimer();
      clearProgress();
      if (state.showingVideo) pauseVideo();
      updatePlayPauseUI();
      return;
    }
    if (state.mode !== "playing") return;
    pauseInternal(false);
  }

  function stop() {
    if (state.mode === "stopped") return;
    if (state.mode === "transitioning") {
      state.mode = "stopped";
      clearTimer();
      clearProgress();
      if (state.showingVideo) pauseVideo();
      updatePlayPauseUI();
      return;
    }
    pauseInternal(true);
  }

  async function restart() {
    clearTimer();
    clearProgress();
    state.remainingMs = 0;
    state.mode = "playing";
    updatePlayPauseUI();
    setProgress(0);
    await showProject(0, { force: true });
  }

  function toggleFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  function togglePlayPause() {
    if (state.mode === "playing") pause();
    else play();
  }

  // ---------- intro ----------

  async function runIntro() {
    state.mode = "intro";
    els.introLogo.classList.add("show");
    await wait(450);
    els.introA.classList.add("show");
    await wait(450);
    els.introRule.classList.add("show");
    await wait(350);
    els.introB.classList.add("show");
    await wait(INTRO_MS - 700);
    els.intro.classList.add("hidden");
    await wait(700);
    els.intro.style.display = "none";
    els.brandStack.classList.add("visible");
  }

  // ---------- keyboard ----------

  function onKey(e) {
    const key = e.key;
    if (key === " " || key === "Spacebar") {
      e.preventDefault();
      togglePlayPause();
      revealControls();
    } else if (key === "Escape") {
      e.preventDefault();
      stop();
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      revealControls();
    } else if (key === "ArrowRight") {
      e.preventDefault();
      goNext();
      revealControls();
    } else if (key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
      revealControls();
    } else if (key === "f" || key === "F") {
      toggleFullscreen();
      revealControls();
    } else if (key >= "1" && key <= "6") {
      e.preventDefault();
      jumpTo(Number(key) - 1);
    }
  }

  function bindUI() {
    els.btnPlay.addEventListener("click", () => play());
    els.btnPause.addEventListener("click", () => pause());
    els.btnStop.addEventListener("click", () => stop());
    els.btnRestart.addEventListener("click", () => restart());
    els.btnPrev.addEventListener("click", () => goPrev());
    els.btnNext.addEventListener("click", () => goNext());
    els.btnFs.addEventListener("click", () => toggleFullscreen());
    window.addEventListener("keydown", onKey);
    bindControlReveal();
  }

  window.__DEMO_LOOP__ = {
    getState: () => ({
      mode: state.mode,
      index: state.index,
      transitioning: state.transitioning,
      showingVideo: state.showingVideo,
      remainingMs: state.remainingMs,
      durationMs: state.durationMs,
      project: project(),
    }),
    projects: PROJECTS,
    play,
    pause,
    stop,
    restart,
    goNext,
    goPrev,
    jumpTo,
  };

  async function boot() {
    buildProgressDots();
    buildJumpButtons();
    bindUI();
    updateProgressDots();
    revealControls();
    await runIntro();
    state.mode = "playing";
    await showProject(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
