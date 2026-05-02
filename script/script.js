// ============================================================
//  Voicebericht Navigator — script.js
//  Gemaakt voor Ihab, testpersoon Human Centered Design
//
//  Dit script regelt alles: audio afspelen, toetsenbord-
//  bediening, geluids-feedback en spraakfeedback.
//  Hieronder staat bij elk stuk uitgelegd wat het doet en
//  waarom het zo is gebouwd.
// ============================================================


// ── 1. Globale variabelen ──────────────────────────────────
//
// audio    → het <audio>-element uit de HTML. Hiermee kunnen
//            we het bestand afspelen, pauzeren en de positie
//            opvragen of aanpassen.
//
// markers  → een gewone array (lijst) met tijdposities in
//            seconden. Elke keer als Ihab een moment markeert
//            (toets M) komt er een getal bij, bv. [6, 12, 22].

const audio = document.getElementById("audio");
let markers = [];


// ── 2. Web Audio API — toon-feedback ──────────────────────
//
// De Web Audio API laat je geluiden genereren in de browser
// zonder een geluidsbestand te hoeven laden.
// Bron: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
//
// AudioContext is het centrale object. Alle audio-knooppunten
// (oscillator, gain) worden hieraan gekoppeld.
//
// De fallback (window.webkitAudioContext) is voor oudere
// Safari-versies die de API onder een andere naam kennen.

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// playTone maakt één korte toon aan.
//
// frequency  → de toonhoogte in Hz. C5 = 523 Hz, G4 = 392 Hz.
//              Hoe hoger het getal, hoe hoger de toon.
// duration   → hoe lang de toon klinkt (in seconden).
// type       → de golfvorm: "sine" = zachte sinusgolf (standaard).
//
// Hoe het werkt:
//   Oscillator  → genereert de toon op de gewenste frequentie
//   GainNode    → regelt het volume; wij laten het snel wegsterven
//                 zodat de toon niet abrupt stopt maar uitklinkt
//   destination → de luidsprekers van de gebruiker
//
// Bron oscillator: https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode
// Bron gain:       https://developer.mozilla.org/en-US/docs/Web/API/GainNode

function playTone(frequency = 440, duration = 0.15, type = "sine") {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Verbind de knooppunten: oscillator → gain → luidsprekers
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = type;
  osc.frequency.value = frequency;

  // Zet volume direct op 0.25 (25%) bij de start van de toon
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);

  // Laat het volume exponentieel dalen naar bijna 0 aan het einde.
  // exponentialRamp klinkt natuurlijker dan een plotselinge stop.
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// sounds is een object met een snelkoppeling per actie.
// Elke actie heeft een eigen toon (of twee na elkaar) zodat
// Ihab zonder te kijken hoort wat er is gebeurd.
//
// setTimeout zorgt dat de tweede toon iets later klinkt,
// waardoor je een oplopend akkoord hoort (melodisch effect).
//
// Muzieknoten ter referentie:
//   C5 = 523 Hz  |  E5 = 659 Hz  |  G5 = 784 Hz
//   G4 = 392 Hz  |  A5 = 880 Hz  |  C6 = 1047 Hz

const sounds = {
  play:    () => playTone(523, 0.12),           // C5 — helder startsignaal
  pauze:   () => playTone(392, 0.18),           // G4 — iets lager, rustiger
  verstuur: () => {
    playTone(659, 0.08);                        // E5
    setTimeout(() => playTone(784, 0.1), 90);  // G5 — twee tonen omhoog = "klaar"
  },
  markeer: () => {
    playTone(880, 0.08);                        // A5
    setTimeout(() => playTone(1047, 0.12), 80); // C6 — hoog, alert
  },
  spring: () => {
    playTone(784, 0.08);                        // G5
    setTimeout(() => playTone(880, 0.1), 80);  // A5 — kleine stap omhoog = "gesprongen"
  },
  einde: () => {
    playTone(523, 0.1);                         // C5
    setTimeout(() => playTone(659, 0.1), 110); // E5
    setTimeout(() => playTone(784, 0.15), 220); // G5 — oplopend akkoord = "klaar"
  },
};

// Hulpfunctie zodat je simpelweg playSound("play") kunt schrijven.
function playSound(naam) {
  if (sounds[naam]) sounds[naam]();
}


// ── 3. Spraakfeedback via SpeechSynthesis ─────────────────
//
// De Web Speech API laat de browser tekst hardop voorlezen.
// Dit is anders dan een screenreader — wij sturen dit zelf
// aan vanuit JavaScript.
//
// Bron: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
//
// speechSynthesis.cancel() stopt eventuele vorige uitspraken
// zodat berichten elkaar niet overlappen.

function speak(tekst) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(tekst);
  u.lang = "nl-NL"; // Nederlandse stem
  u.rate = 1.1;     // Iets sneller dan normaal, maar nog goed verstaanbaar
  speechSynthesis.speak(u);
}

// speakAlsPaused spreekt alleen als de audio op dat moment
// gepauzeerd is. Dit voorkomt dat de stem door het voicebericht
// heen praat terwijl Ihab aan het luisteren is.
// Tijdens afspelen geeft alleen de toon feedback.

function speakAlsPaused(tekst) {
  if (audio.paused) speak(tekst);
}


// ── 4. Audio-metadata laden ───────────────────────────────
//
// Het "loadedmetadata" event vuurt zodra de browser de duur
// van het audiobestand kent. Pas dan kunnen we de progress bar
// en het tijdlabel correct instellen.
//
// aria-valuemax vertelt een screenreader wat het maximum van
// de slider is — in dit geval de totale duur in seconden.
// Bron ARIA slider: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/slider_role

audio.addEventListener("loadedmetadata", () => {
  updateDuration();
  document
    .getElementById("progressBar")
    .setAttribute("aria-valuemax", Math.round(audio.duration));
});


// ── 5. Waveform genereren ─────────────────────────────────
//
// De golfvorm bestaat uit 28 kleine <div>-balkjes die we
// dynamisch aanmaken met JavaScript (createElement).
// De hoogte van elk balkje is willekeurig (Math.random),
// zodat het op een echte audiogolf lijkt.
//
// aria-hidden="true" staat al op het waveform-element in de
// HTML, dus de screenreader slaat dit blok volledig over.

const waveformEl = document.getElementById("waveform");
for (let i = 0; i < 28; i++) {
  const h = 6 + Math.round(Math.random() * 16); // hoogte tussen 6 en 22 px
  const bar = document.createElement("div");
  bar.className = "bar";
  bar.style.height = h + "px";
  waveformEl.appendChild(bar);
}


// ── 6. UI updaten ─────────────────────────────────────────
//
// updateUI past de speelknop aan op basis van de audio-status.
// aria-pressed en aria-label worden meegegeven zodat de
// screenreader altijd de juiste toestand uitleest:
// "Pauzeren, schakelknop, ingedrukt" of "Afspelen, schakelknop".

function updateUI() {
  const btn = document.getElementById("playBtn");
  const playing = !audio.paused;
  btn.textContent = playing ? "⏸" : "▶";
  btn.setAttribute("aria-pressed", playing ? "true" : "false");
  btn.setAttribute("aria-label", playing ? "Pauzeren" : "Afspelen");
}

// updateDuration toont de resterende tijd in het label (bv. "0:18").
// Het label heeft aria-hidden="true" in de HTML, dus de screenreader
// leest dit NIET voor — we willen niet dat elke seconde wordt
// aangekondigd terwijl Ihab aan het luisteren is.
//
// padStart(2, "0") zorgt dat seconden altijd 2 cijfers zijn: "0:04"
// in plaats van "0:4".

function updateDuration() {
  const remaining = audio.duration
    ? Math.round(audio.duration - audio.currentTime)
    : 0;
  document.getElementById("durationLabel").textContent =
    "0:" + String(remaining).padStart(2, "0");
}

// updateProgress wordt elke ~250ms aangeroepen via "timeupdate".
// Het berekent hoever de audio is als percentage (0 tot 1)
// en past daar de breedte van de progress bar op aan.

function updateProgress() {
  const progress = audio.duration ? audio.currentTime / audio.duration : 0;
  document.getElementById("progressFill").style.width = progress * 100 + "%";
  document
    .getElementById("progressBar")
    .setAttribute("aria-valuenow", Math.round(audio.currentTime));
  updateDuration();
  updateWaveform(progress);
}

// updateWaveform kleurt de balkjes in op basis van voortgang:
//   .played  → al voorbijgegaan (groen)
//   .active  → speelt nu (donkergroen, animeert)
//   geen     → nog niet bereikt (grijs)

function updateWaveform(progress) {
  const bars = waveformEl.querySelectorAll(".bar");
  const played = Math.floor(progress * bars.length);
  bars.forEach((bar, i) => {
    bar.className =
      "bar" + (i < played ? " played" : !audio.paused ? " active" : "");
  });
}

// setStatus toont een bericht in de statusbalk onderaan.
// De balk heeft géén aria-live meer — we willen niet dat de
// screenreader elke statuswijziging uitspreekt terwijl de
// audio speelt. Feedback via speak() doen we zelf en alleen
// als de audio gepauzeerd is (zie speakAlsPaused).

function setStatus(msg, type) {
  const el = document.getElementById("statusBar");
  el.innerHTML = msg;
  el.className = "status-bar" + (type ? " " + type : "");
}


// ── 7. Audio-events ───────────────────────────────────────
//
// addEventListener koppelt een functie aan een gebeurtenis.
// "timeupdate" vuurt elke keer als de afspeelpositie verandert
// (ongeveer 4× per seconde).
// "play" en "pause" vuren als de audio start of stopt.
// "ended"  vuurt als het bericht volledig is afgespeeld.

audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("play", updateUI);
audio.addEventListener("pause", updateUI);
audio.addEventListener("ended", () => {
  updateUI();
  playSound("einde");
  setStatus("Bericht afgespeeld", "");
  speak("Bericht afgespeeld"); // audio is nu klaar, dus spreken is oké
});


// ── 8. Play / Pause ───────────────────────────────────────
//
// De AudioContext mag door browsers pas starten na een
// gebruikershandeling (klik of toetsaanslag). Als hij
// gesuspended is, moet je hem eerst hervatten met .resume().
// Bron: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/state

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
    setStatus("Gepauzeerd &nbsp;— <kbd>Alt</kbd>+<kbd>Spatie</kbd> verdergaan", "");
    // Audio is nu gepauzeerd, dus speak() mag — Ihab hoort geen overlap
    speak("Gepauzeerd op " + sec + " seconden");
  }
}


// ── 9. Skip (5 seconden voor/achteruit) ──────────────────
//
// Math.max en Math.min zorgen dat je nooit voorbij het begin
// of het einde van het bestand kunt springen.
// Math.max(0, x)             → nooit negatief
// Math.min(audio.duration, x) → nooit voorbij het einde

function skip(seconds) {
  audio.currentTime = Math.max(
    0,
    Math.min(audio.duration, audio.currentTime + seconds),
  );
  const richting = seconds > 0 ? "vooruit" : "terug";
  const pos = Math.round(audio.currentTime);
  setStatus(Math.abs(seconds) + "s " + richting + " — positie: " + pos + "s", "");
  speakAlsPaused(pos + " seconden"); // alleen spreken als gepauzeerd
}


// ── 10. Markeer moment ────────────────────────────────────
//
// markers.includes(t) voorkomt duplicaten: als Ihab twee keer
// snel op M drukt terwijl de positie nog hetzelfde is, wordt
// er maar één markering toegevoegd.
//
// .sort((a, b) => a - b) sorteert de array numeriek van klein
// naar groot, zodat Alt+← en Alt+→ altijd in de juiste volgorde
// door de markeringen lopen.

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


// ── 11. Navigeren tussen markeringen ─────────────────────
//
// goToNextMarker zoekt de eerstvolgende markering na de
// huidige positie. Als er geen is (je zit al na de laatste)
// springt hij terug naar de eerste — wrap-around gedrag.
//
// Array.find() geeft het eerste element terug waarvoor de
// voorwaarde (m > t) waar is, of undefined als er geen is.
// De ?? operator (nullish coalescing) geeft dan markers[0].
// Bron: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing

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

// goToPrevMarker werkt zoals de vorige-knop in Spotify:
//
//   Scenario A — je bent al >3 seconden voorbij een markering:
//     → ga terug naar die markering (zoals Spotify "herstart huidig nummer")
//
//   Scenario B — je bent net voorbij een markering (<3s):
//     → sla die over en ga naar de een daarvoor
//
// THRESHOLD = 3 seconden is de grens tussen de twee scenario's.
// .filter() geeft alle markeringen terug die voor de huidige
// positie liggen. De laatste in die lijst is de dichtsbijzijnde.

function goToPrevMarker() {
  if (markers.length === 0) {
    setStatus("Geen markeringen", "");
    speak("Geen markeringen");
    return;
  }
  const t = audio.currentTime;
  const THRESHOLD = 3;
  const before = markers.filter((m) => m < t); // alle markeringen vóór nu

  let target;
  if (before.length === 0) {
    // geen markering voor de huidige positie → ga naar de laatste
    target = markers[markers.length - 1];
  } else {
    const nearest = before[before.length - 1]; // dichtstbijzijnde markering
    if (t - nearest >= THRESHOLD) {
      target = nearest; // scenario A: terug naar deze markering
    } else {
      // scenario B: ga naar de markering daarvóór
      target = before.length > 1 ? before[before.length - 2] : markers[markers.length - 1];
    }
  }
  audio.currentTime = target;
  playSound("spring");
  setStatus("Naar markering " + target + "s gesprongen", "");
  speakAlsPaused(target + " seconden");
}

// renderMarkers tekent de markerings-badgeknoppen opnieuw.
// Elke keer als de markers-array verandert, wordt de rij
// volledig leeggemaakt (innerHTML = "") en opnieuw opgebouwd.
//
// setAttribute("aria-label", ...) geeft elk knopje een
// beschrijvende naam voor de screenreader, ook al staat er
// alleen "⚑ 12s" als tekst zichtbaar.

function renderMarkers() {
  const row = document.getElementById("markersRow");
  row.innerHTML = "";
  markers.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "marker-badge";
    btn.textContent = "⚑ " + t + "s";
    btn.setAttribute("aria-label", "Spring naar markering op " + t + " seconden");
    btn.addEventListener("click", () => {
      audio.currentTime = t;
      playSound("spring");
      setStatus("Naar markering " + t + "s gesprongen", "");
      speak(t + " seconden");
    });
    row.appendChild(btn);
  });
}


// ── 12. Tekstreactie versturen ────────────────────────────
//
// .trim() verwijdert spaties aan het begin en einde van de
// invoer. Zo wordt een per ongeluk ingevoerde spatie niet
// als reactie verstuurd.
//
// new Date() geeft het huidige tijdstip. We halen uren en
// minuten eruit om een WhatsApp-achtige tijdstempel te maken.

function sendReply() {
  const input = document.getElementById("replyInput");
  const tekst = input.value.trim();
  if (!tekst) return; // stop als het tekstveld leeg is

  document.getElementById("replyBubble").textContent = tekst;
  document.getElementById("replyWrap").style.display = "flex";

  const now = new Date();
  document.getElementById("replyTime").textContent =
    now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");

  input.value = ""; // leeg het veld na versturen
  playSound("verstuur");
  setStatus("Reactie verstuurd ✓", "");
  speak("Reactie verstuurd");
}


// ── 13. Klik op progress bar ─────────────────────────────
//
// getBoundingClientRect() geeft de positie en afmetingen van
// een element op het scherm. Door de muisklik-x te delen door
// de breedte weten we op welk percentage de gebruiker klikte.
// Dat percentage × de totale duur geeft de nieuwe positie.

document.getElementById("progressBar").addEventListener("click", (e) => {
  if (!audio.duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});


// ── 14. Toetsenbord-bediening ─────────────────────────────
//
// Het hele prototype is bedienbaar zonder muis — alleen via
// het toetsenbord. Dit is het kernidee voor Ihab.
//
// document.addEventListener("keydown") luistert naar ELKE
// toetsaanslag op de pagina.
//
// e.target is het element dat op dat moment de focus heeft.
// Als de focus in een tekstveld (textarea of input) zit,
// gelden andere regels — anders zou spatie het veld leegmaken
// of pijltjes de cursor verplaatsen in plaats van de audio.
//
// Bron keyboard events: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent

document.addEventListener("keydown", (e) => {

  // ── Focus zit in het tekstveld ──
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {

    // Alt+Spatie werkt ook in het tekstveld zodat Ihab kan
    // pauzeren terwijl hij zijn reactie aan het typen is.
    // e.preventDefault() voorkomt dat de browser iets anders
    // doet met die toetscombinatie (bv. venster-menu openen).
    if (e.altKey && e.code === "Space") {
      e.preventDefault();
      togglePlay();
      return;
    }

    // Enter verstuurt de reactie (in plaats van een nieuwe regel)
    if (e.key === "Enter") sendReply();

    // Escape verlaat het tekstveld en geeft focus terug aan
    // de speelknop. .blur() verwijdert de focus van het veld.
    // .focus() zet hem op de speelknop.
    if (e.key === "Escape") {
      e.target.blur();
      document.getElementById("playBtn").focus();
      setStatus(
        "Terug naar speler &nbsp;— <kbd>Alt</kbd>+<kbd>Spatie</kbd> om af te spelen",
        "",
      );
      speak("Terug naar speler");
    }
    return; // stop hier — overige toetsen werken normaal in het veld
  }

  // ── Alt-combinaties (buiten tekstveld) ──
  // e.altKey is true als de Alt-toets ingedrukt is.
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

  // ── Losse toetsen (buiten tekstveld, zonder Alt) ──
  // switch/case is een nettere manier dan veel if/else-blokken
  // als je meerdere waarden van dezelfde variabele wilt testen.
  switch (e.key) {

    case " ": // Spatie = play/pause
      e.preventDefault(); // voorkomt dat de pagina scrollt
      togglePlay();
      break;

    case "ArrowLeft": // pijl links = 5s terug
      e.preventDefault();
      skip(-5);
      break;

    case "ArrowRight": // pijl rechts = 5s vooruit
      e.preventDefault();
      skip(5);
      break;

    case "ArrowUp": // pijl omhoog = sneller afspelen (max 2×)
      e.preventDefault();
      audio.playbackRate = Math.min(
        2,
        parseFloat((audio.playbackRate + 0.1).toFixed(1)),
      );
      setStatus("Snelheid: " + audio.playbackRate + "x", "");
      break;

    case "ArrowDown": // pijl omlaag = langzamer afspelen (min 0.5×)
      e.preventDefault();
      audio.playbackRate = Math.max(
        0.5,
        parseFloat((audio.playbackRate - 0.1).toFixed(1)),
      );
      setStatus("Snelheid: " + audio.playbackRate + "x", "");
      break;

    case "m": // M = markeer huidig moment
    case "M":
      markMoment();
      break;

    case "r": // R = start tekstreactie (pauzeert audio, opent tekstveld)
    case "R":
      e.preventDefault();
      audio.pause();
      setStatus("Typ je reactie en druk Enter om te versturen", "");
      speak("Typ je reactie");
      document.getElementById("replyInput").focus();
      break;
  }
});
