const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
let markers = [];

// Web Audio API tonen als feedback
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(frequency = 440, duration = 0.15, type = "sine") {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + duration,
  );
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
  play: () => playTone(523, 0.12),
  pauze: () => playTone(392, 0.18),
  markeer: () => {
    playTone(880, 0.08);
    setTimeout(() => playTone(1047, 0.12), 80);
  },
  spring: () => {
    playTone(784, 0.08);
    setTimeout(() => playTone(880, 0.1), 80);
  },
  verstuur: () => {
    playTone(659, 0.08);
    setTimeout(() => playTone(784, 0.1), 90);
  },
  einde: () => {
    playTone(523, 0.1);
    setTimeout(() => playTone(659, 0.1), 110);
    setTimeout(() => playTone(784, 0.15), 220);
  },
};

// UI updaten
audio.addEventListener("loadedmetadata", () => {
  document.getElementById("durationLabel").textContent =
    "0:" + String(Math.round(audio.duration)).padStart(2, "0");
});

audio.addEventListener("timeupdate", () => {
  const progress = audio.duration ? audio.currentTime / audio.duration : 0;
  document.getElementById("progressFill").style.width = progress * 100 + "%";
  document.getElementById("durationLabel").textContent =
    "0:" +
    String(
      Math.max(0, Math.round(audio.duration - audio.currentTime)),
    ).padStart(2, "0");
  updateWaveform(progress);
});

audio.addEventListener("play", () => {
  playBtn.textContent = "⏸";
  playBtn.setAttribute("aria-label", "Pauzeren");
});

audio.addEventListener("pause", () => {
  playBtn.textContent = "▶";
  playBtn.setAttribute("aria-label", "Afspelen");
});

audio.addEventListener("ended", () => {
  playBtn.textContent = "▶";
  playBtn.setAttribute("aria-label", "Afspelen");
  sounds.einde();
});

// Waveform
const waveformEl = document.getElementById("waveform");
for (let i = 0; i < 28; i++) {
  const bar = document.createElement("div");
  bar.className = "bar";
  bar.style.height = 6 + Math.round(Math.random() * 16) + "px";
  waveformEl.appendChild(bar);
}

function updateWaveform(progress) {
  const bars = waveformEl.querySelectorAll(".bar");
  const played = Math.floor(progress * bars.length);
  bars.forEach((bar, i) => {
    bar.className =
      "bar" + (i < played ? " played" : !audio.paused ? " active" : "");
  });
}

// Play / pause
function togglePlay() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (audio.paused) {
    audio.play();
    sounds.play();
  } else {
    audio.pause();
    sounds.pauze();
  }
}

playBtn.addEventListener("click", togglePlay);

// Spoelen
function skip(seconds) {
  audio.currentTime = Math.max(
    0,
    Math.min(audio.duration, audio.currentTime + seconds),
  );
  sounds.spring();
}

// Snelheid
const speeds = [1, 1.5, 2, 0.75];
let speedIndex = 0;

// Markeringen
function markMoment() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const t = Math.round(audio.currentTime);
  if (!markers.includes(t)) {
    markers.push(t);
    markers.sort((a, b) => a - b);
  }
  sounds.markeer();
  renderMarkers();
}

function renderMarkers() {
  const row = document.getElementById("markersRow");
  row.innerHTML = "";
  markers.forEach((t) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "marker-badge";
    btn.textContent = t + "s";
    btn.setAttribute(
      "aria-label",
      "Spring naar markering op " + t + " seconden",
    );
    btn.addEventListener("click", () => {
      audio.currentTime = t;
      sounds.spring();
    });
    li.appendChild(btn);
    row.appendChild(li);
  });
}

function goToNextMarker() {
  if (!markers.length) return;
  const t = Math.round(audio.currentTime);
  audio.currentTime = markers.find((m) => m > t) ?? markers[0];
  sounds.spring();
}

function goToPrevMarker() {
  if (!markers.length) return;
  const t = audio.currentTime;
  const before = markers.filter((m) => m < t - 2);
  audio.currentTime = before.length
    ? before[before.length - 1]
    : markers[markers.length - 1];
  sounds.spring();
}

// Reageren
function sendReply() {
  const input = document.getElementById("replyInput");
  const tekst = input.value.trim();
  if (!tekst) return;
  document.getElementById("replyBubble").textContent = tekst;
  document.getElementById("replyWrap").style.display = "flex";
  const now = new Date();
  document.getElementById("replyTime").textContent =
    now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
  input.value = "";
  sounds.verstuur();
}

// Voortgangsbalk klikken
document.getElementById("progressBar").addEventListener("click", (e) => {
  if (!audio.duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});

// Toetsenbord
document.addEventListener("keydown", (e) => {
  // Tab: pauzeer audio zodat VoiceOver kan spreken
  if (e.key === "Tab" && !audio.paused) {
    audio.pause();
    sounds.pauze();
  }

  const inVeld =
    e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT";

  if (inVeld) {
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      sendReply();
    }
    if (e.key === "Escape") {
      e.target.blur();
      playBtn.focus();
    }
    return;
  }

  if (e.altKey) {
    if (e.key === "ArrowLeft")  { e.preventDefault(); goToPrevMarker(); }
    if (e.key === "ArrowRight") { e.preventDefault(); goToNextMarker(); }
    return;
  }

  switch (e.key) {
    case " ":
      e.preventDefault();
      togglePlay();
      break;
    case "ArrowLeft":
      e.preventDefault();
      skip(-5);
      break;
    case "ArrowRight":
      e.preventDefault();
      skip(5);
      break;
    case "ArrowUp":
      e.preventDefault();
      speedIndex = (speedIndex + 1) % speeds.length;
      audio.playbackRate = speeds[speedIndex];
      break;
    case "ArrowDown":
      e.preventDefault();
      speedIndex = (speedIndex - 1 + speeds.length) % speeds.length;
      audio.playbackRate = speeds[speedIndex];
      break;
    case "m":
    case "M":
      markMoment();
      break;
    case "r":
    case "R":
      e.preventDefault();
      audio.pause();
      document.getElementById("replyInput").focus();
      break;
  }
});
