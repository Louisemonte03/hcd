const audio = document.getElementById("audio");
let markers = [];

// Web Audio API — MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
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
  verstuur: () => {
    playTone(659, 0.08);
    setTimeout(() => playTone(784, 0.1), 90);
  },
  markeer: () => {
    playTone(880, 0.08);
    setTimeout(() => playTone(1047, 0.12), 80);
  },
  spring: () => {
    playTone(784, 0.08);
    setTimeout(() => playTone(880, 0.1), 80);
  },
  einde: () => {
    playTone(523, 0.1);
    setTimeout(() => playTone(659, 0.1), 110);
    setTimeout(() => playTone(784, 0.15), 220);
  },
};

function playSound(naam) {
  if (sounds[naam]) sounds[naam]();
}

// SpeechSynthesis — MDN: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
function speak(tekst) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(tekst);
  u.lang = "nl-NL";
  u.rate = 1.1;
  speechSynthesis.speak(u);
}

function speakAlsPaused(tekst) {
  if (audio.paused) speak(tekst);
}

audio.addEventListener("loadedmetadata", () => {
  updateDuration();
  document
    .getElementById("progressBar")
    .setAttribute("aria-valuemax", Math.round(audio.duration));
});

const waveformEl = document.getElementById("waveform");
for (let i = 0; i < 28; i++) {
  const h = 6 + Math.round(Math.random() * 16);
  const bar = document.createElement("div");
  bar.className = "bar";
  bar.style.height = h + "px";
  waveformEl.appendChild(bar);
}

function updateUI() {
  const btn = document.getElementById("playBtn");
  const playing = !audio.paused;
  btn.textContent = playing ? "⏸" : "▶";
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

// ARIA role="slider" — MDN: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/slider_role
// WAI-ARIA Authoring Practices — W3C: https://www.w3.org/WAI/ARIA/apg/
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

// ARIA live regions — MDN: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
function setStatus(msg, type) {
  const el = document.getElementById("statusBar");
  el.innerHTML = msg;
  el.className = "status-bar" + (type ? " " + type : "");
}

audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("play", updateUI);
audio.addEventListener("pause", updateUI);
audio.addEventListener("ended", () => {
  updateUI();
  playSound("einde");
  setStatus("Bericht afgespeeld", "");
  speak("Bericht afgespeeld");
});

// HTMLMediaElement — MDN: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
function togglePlay() {
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (audio.paused) {
    audio.play();
    playSound("play");
    setStatus("Bezig met luisteren...", "listening");
  } else {
    audio.pause();
    playSound("pauze");
    const sec = Math.round(audio.currentTime);
    setStatus(
      "Gepauzeerd &nbsp;— <kbd>Alt</kbd>+<kbd>Spatie</kbd> verdergaan",
      "",
    );
    speak("Gepauzeerd op " + sec + " seconden");
  }
}

function skip(seconds) {
  audio.currentTime = Math.max(
    0,
    Math.min(audio.duration, audio.currentTime + seconds),
  );
  const richting = seconds > 0 ? "vooruit" : "terug";
  const pos = Math.round(audio.currentTime);
  setStatus(
    Math.abs(seconds) + "s " + richting + " — positie: " + pos + "s",
    "",
  );
  speakAlsPaused(pos + " seconden");
}

function markMoment() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const t = Math.round(audio.currentTime);
  if (!markers.includes(t)) {
    markers.push(t);
    markers.sort((a, b) => a - b);
  }
  playSound("markeer");
  setStatus("Moment gemarkeerd op " + t + "s", "marked");
  speakAlsPaused("Markering op " + t + " seconden");
  renderMarkers();
}

function goToNextMarker() {
  if (markers.length === 0) {
    setStatus("Geen markeringen", "");
    speak("Geen markeringen");
    return;
  }
  const t = Math.round(audio.currentTime);
  const next = markers.find((m) => m > t) ?? markers[0];
  audio.currentTime = next;
  playSound("spring");
  setStatus("Naar markering " + next + "s gesprongen", "");
  speakAlsPaused(next + " seconden");
}

function goToPrevMarker() {
  if (markers.length === 0) {
    setStatus("Geen markeringen", "");
    speak("Geen markeringen");
    return;
  }
  const t = audio.currentTime;
  const THRESHOLD = 3;
  const before = markers.filter((m) => m < t);

  let target;
  if (before.length === 0) {
    target = markers[markers.length - 1];
  } else {
    const nearest = before[before.length - 1];
    if (t - nearest >= THRESHOLD) {
      target = nearest;
    } else {
      target =
        before.length > 1
          ? before[before.length - 2]
          : markers[markers.length - 1];
    }
  }
  audio.currentTime = target;
  playSound("spring");
  setStatus("Naar markering " + target + "s gesprongen", "");
  speakAlsPaused(target + " seconden");
}

function renderMarkers() {
  const row = document.getElementById("markersRow");
  row.innerHTML = "";
  markers.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "marker-badge";
    btn.textContent = "⚑ " + t + "s";
    btn.setAttribute(
      "aria-label",
      "Spring naar markering op " + t + " seconden",
    );
    btn.addEventListener("click", () => {
      audio.currentTime = t;
      playSound("spring");
      setStatus("Naar markering " + t + "s gesprongen", "");
      speak(t + " seconden");
    });
    row.appendChild(btn);
  });
}

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
  playSound("verstuur");
  setStatus("Reactie verstuurd ✓", "");
  speak("Reactie verstuurd");
}

document.getElementById("progressBar").addEventListener("click", (e) => {
  if (!audio.duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});

// KeyboardEvent — MDN: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
// Keyboard Accessibility — WebAIM: https://webaim.org/techniques/keyboard/
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    if (e.altKey && e.code === "Space") {
      e.preventDefault();
      togglePlay();
      return;
    }
    if (e.key === "Enter") sendReply();
    if (e.key === "Escape") {
      e.target.blur();
      document.getElementById("playBtn").focus();
      setStatus(
        "Terug naar speler &nbsp;— <kbd>Alt</kbd>+<kbd>Spatie</kbd> om af te spelen",
        "",
      );
      speak("Terug naar speler");
    }
    return;
  }

  if (e.altKey) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNextMarker();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrevMarker();
    }
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
      audio.playbackRate = Math.min(
        2,
        parseFloat((audio.playbackRate + 0.1).toFixed(1)),
      );
      setStatus("Snelheid: " + audio.playbackRate + "x", "");
      break;
    case "ArrowDown":
      e.preventDefault();
      audio.playbackRate = Math.max(
        0.5,
        parseFloat((audio.playbackRate - 0.1).toFixed(1)),
      );
      setStatus("Snelheid: " + audio.playbackRate + "x", "");
      break;
    case "m":
    case "M":
      markMoment();
      break;
    case "r":
    case "R":
      e.preventDefault();
      audio.pause();
      setStatus("Typ je reactie en druk Enter om te versturen", "");
      speak("Typ je reactie");
      document.getElementById("replyInput").focus();
      break;
  }
});
