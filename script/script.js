const audio = document.getElementById("audio");
let markers = [];

// ── Audio metadata geladen ──
audio.addEventListener("loadedmetadata", () => {
  updateDuration();
  document
    .getElementById("progressBar")
    .setAttribute("aria-valuemax", Math.round(audio.duration));
});

// ── Waveform bars genereren ──
const waveformEl = document.getElementById("waveform");
for (let i = 0; i < 28; i++) {
  const h = 6 + Math.round(Math.random() * 16);
  const bar = document.createElement("div");
  bar.className = "bar";
  bar.style.height = h + "px";
  waveformEl.appendChild(bar);
}

// ── UI updaten ──
function updateUI() {
  const btn = document.getElementById("playBtn");
  const playing = !audio.paused;
  btn.textContent = playing ? "\u23F8" : "\u25B6";
  btn.setAttribute("aria-pressed", playing ? "true" : "false");
  btn.setAttribute("aria-label", playing ? "Pauzeren" : "Afspelen");
}

function updateDuration() {
  const remaining = audio.duration
    ? Math.round(audio.duration - audio.currentTime)
    : 0;
  document.getElementById("durationLabel").textContent =
    "0:" + String(remaining).padStart(2, "0");
}

function updateProgress() {
  const progress = audio.duration ? audio.currentTime / audio.duration : 0;
  document.getElementById("progressFill").style.width = progress * 100 + "%";
  document
    .getElementById("progressBar")
    .setAttribute("aria-valuenow", Math.round(audio.currentTime));
  updateDuration();
  updateWaveform(progress);
}

function updateWaveform(progress) {
  const bars = waveformEl.querySelectorAll(".bar");
  const played = Math.floor(progress * bars.length);
  bars.forEach((bar, i) => {
    bar.className =
      "bar" + (i < played ? " played" : !audio.paused ? " active" : "");
  });
}

function setStatus(msg, type) {
  const el = document.getElementById("statusBar");
  el.innerHTML = msg;
  el.className = "status-bar" + (type ? " " + type : "");
}

// ── Audio events ──
audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("play", updateUI);
audio.addEventListener("pause", updateUI);
audio.addEventListener("ended", () => {
  updateUI();
  setStatus("Bericht afgespeeld", "");
});

// ── Play / Pause ──
function togglePlay() {
  if (audio.paused) {
    audio.play();
    setStatus("Bezig met luisteren...", "listening");
  } else {
    audio.pause();
    setStatus("Gepauzeerd &nbsp;— <kbd>Space</kbd> verdergaan", "");
  }
}

// ── Skip ──
function skip(seconds) {
  audio.currentTime = Math.max(
    0,
    Math.min(audio.duration, audio.currentTime + seconds),
  );
  const richting = seconds > 0 ? "vooruit" : "terug";
  setStatus(
    Math.abs(seconds) +
      "s " +
      richting +
      " — positie: " +
      Math.round(audio.currentTime) +
      "s",
    "",
  );
}

// ── Markeer moment ──
function markMoment() {
  const t = Math.round(audio.currentTime);
  if (!markers.includes(t)) {
    markers.push(t);
    markers.sort((a, b) => a - b);
  }
  setStatus("Moment gemarkeerd op " + t + "s", "marked");
  renderMarkers();
}

function renderMarkers() {
  const row = document.getElementById("markersRow");
  row.innerHTML = "";
  markers.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "marker-badge";
    btn.textContent = "\u2691 " + t + "s";
    btn.setAttribute(
      "aria-label",
      "Spring naar markering op " + t + " seconden",
    );
    btn.addEventListener("click", () => {
      audio.currentTime = t;
      setStatus("Naar markering " + t + "s gesprongen", "");
    });
    row.appendChild(btn);
  });
}

// ── Tekstreactie versturen ──
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
  setStatus("Reactie verstuurd ✓", "");
}

// ── Klik op progress bar ──
document.getElementById("progressBar").addEventListener("click", (e) => {
  if (!audio.duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});

// ── Keyboard ──
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    if (e.key === "Enter") sendReply();
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
    case "m":
    case "M":
      markMoment();
      break;
  }
});
