const geluidPlay = new Audio("sounds/message.mp3");
const geluidOpnemen = new Audio("sounds/opnemen.mp3");
const geluidPauze = new Audio("sounds/pauze.mp3");
const geluidVerstuur = new Audio("sounds/verstuur.mp3");
const geluidVerwijder = new Audio("sounds/Verwijder.mp3");

function handlePlay() {
  geluidPlay.play();
  if (playing) return;
  playing = true;
  window.speechSynthesis.cancel(); // ← reset eerst
  document.getElementById("status").textContent = "Bezig met luisteren...";
  window.speechSynthesis.speak(bericht);
}

let playing = false;
let opgenomenTekst = "";

// spraakbericht
const bericht = new SpeechSynthesisUtterance(
  "Hé! Hoe gaat het met je? Ik wilde je even wat vragen over het feest aankomend weekend. Heb jij al nagedacht of je komt? Want ik ben aan het plannen wie er allemaal bij zijn. Oh ja, en tweede vraag, kom je dan zaterdag of zondag? Want we twijfelen nog over de dag. En als laatste, wil je wat meenemen? Bijvoorbeeld drinken of snacks? Laat het me even weten!",
);
bericht.lang = "nl-NL";
bericht.rate = 0.6;

// spraakherkenning
const herkenning = new webkitSpeechRecognition();
herkenning.lang = "nl-NL";
herkenning.continuous = false;

herkenning.onresult = function (event) {
  opgenomenTekst = event.results[0][0].transcript;
  // tekst niet meer tonen
};

function handlePause() {
  geluidPauze.play();
  playing = false;
  window.speechSynthesis.pause();
  document.getElementById("status").textContent =
    "Microfoon aan — spreek je reactie in";
  document.getElementById("stopOpname").style.display = "block";
  herkenning.start(); // ← microfoon gaat automatisch aan
}

function handleStopOpname() {
  geluidOpnemen.play();
  herkenning.stop(); // ← microfoon gaat uit
  document.getElementById("status").textContent =
    "Opname gestopt — druk Enter om te versturen";
  document.getElementById("stopOpname").style.display = "none";
  document.getElementById("verstuurBtn").style.display = "block";
}

function handleOpnieuw() {
  geluidVerwijder.play();
  herkenning.stop();
  opgenomenTekst = "";
  document.getElementById("status").textContent =
    "Microfoon aan — spreek je reactie in";
  document.getElementById("verstuurBtn").style.display = "none";
  document.getElementById("stopOpname").style.display = "block";
  herkenning.start(); // ← meteen opnieuw beginnen
}

function handleVerstuur() {
  geluidVerstuur.play();
  document.getElementById("status").textContent = "Reactie verstuurd!";
  document.getElementById("verstuurBtn").style.display = "none";
  handleGaVerder();
}

function handleGaVerder() {
  playing = true;
  window.speechSynthesis.resume();
  document.getElementById("status").textContent = "Bezig met luisteren...";
}

document.addEventListener("keydown", function (event) {
  if (event.key === " ") {
    event.preventDefault();
    if (!playing) {
      handlePlay();
    } else {
      handlePause();
    }
  }

  if (event.key === "n" || event.key === "N") {
    handleOpnieuw();
  }

  if (event.key === "Enter") {
    handleVerstuur();
  }
});
