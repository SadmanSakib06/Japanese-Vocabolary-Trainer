import { saveWordResult, getUserProgress } from "./database.js";

let voices = [];

voices = speechSynthesis.getVoices();

speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices();
};

const sessionSizeInput = document.getElementById("sessionSize");

const levelSelect = document.getElementById("levelSelect");

const autoRevealCheckbox = document.getElementById("autoReveal");

const progressBar = document.getElementById("progressBar");

const progressText = document.getElementById("progressText");

const startBtn = document.getElementById("startBtn");
const knowBtn = document.getElementById("knowBtn");
const missBtn = document.getElementById("missBtn");

const card = document.getElementById("card");
const japaneseDiv = document.getElementById("japanese");
const meaningDiv = document.getElementById("meaning");

// let showingMeaning = false;
let currentJapanese = "";
let currentMeaning = "";

let vocabList = [];
let known = 0;
let missed = 0;
let currentIndex = 0;
let sessionWords = [];
let revealTimer;
let sessionActive = false;

function revealMeaning() {
  meaningDiv.textContent = currentMeaning;

  const speech = new SpeechSynthesisUtterance(currentMeaning);

  speech.voice = voices.find(
    (voice) => voice.name === "Google UK English Female",
  );

  speech.lang = "en-US";

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

function loadNextWord() {
  if (currentIndex >= sessionWords.length) {
    sessionActive = false;

    knowBtn.disabled = true;
    missBtn.disabled = true;
    const accuracy = ((known / sessionWords.length) * 100).toFixed(1);

    japaneseDiv.textContent = "🎉 Session Complete";

    meaningDiv.innerHTML = `
        Correct: ${known}<br>
        Missed: ${missed}<br>
        Accuracy: ${accuracy}%
        `;

    startBtn.style.display = "inline-block";
    sessionSizeInput.style.display = "inline-block";
    levelSelect.style.display = "inline-block";
    autoRevealCheckbox.parentElement.style.display = "flex";

    return;
  }

  const line = sessionWords[currentIndex];

  const [japanese, meaning] = line.split(",", 2);

  currentJapanese = japanese;
  currentMeaning = meaning;

  japaneseDiv.textContent = japanese;

  const progress = ((currentIndex + 1) / sessionWords.length) * 100;

  progressBar.style.width = `${progress}%`;

  progressText.textContent = `${currentIndex + 1} / ${sessionWords.length}`;

  meaningDiv.textContent = "";
  clearTimeout(revealTimer);

  if (autoRevealCheckbox.checked) {
    revealTimer = setTimeout(() => {
      revealMeaning();
    }, 3000);
  }

  const speech = new SpeechSynthesisUtterance(currentJapanese);

  speech.voice = voices.find((voice) => voice.name === "Google 日本語");

  speech.lang = "ja-JP";

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

function createSmartSession(vocabList, progress, sessionSize) {
  const progressMap = new Map();

  progress.forEach((item) => {
    const key = item.word + "," + item.meaning;

    progressMap.set(key, item);
  });

  const newWords = [];
  const weakWords = [];
  const otherWords = [];

  vocabList.forEach((line) => {
    const [word, meaning] = line.split(",", 2);

    const key = word + "," + meaning;

    const history = progressMap.get(key);

    if (!history) {
      newWords.push(line);
    } else if (history.timesMissed > 0) {
      weakWords.push(line);
    } else {
      otherWords.push(line);
    }
  });

  // 50% weak
  // 30% new
  // 20% other

  const weakCount = Math.floor(sessionSize * 0.5);
  const newCount = Math.floor(sessionSize * 0.3);

  const session = [
    ...weakWords.sort(() => Math.random() - 0.5),

    ...newWords.sort(() => Math.random() - 0.5),

    ...otherWords.sort(() => Math.random() - 0.5),
  ];

  return session.slice(0, sessionSize);
}

startBtn.addEventListener("click", async () => {
  const level = levelSelect.value;

  const response = await fetch(`vocab_${level}.txt`);
  const text = await response.text();

  vocabList = text.split("\n").filter((line) => line.trim() !== "");

  const sessionSize = parseInt(sessionSizeInput.value);

  const progress = await getUserProgress();

  sessionWords = createSmartSession(vocabList, progress, sessionSize);

  currentIndex = 0;

  sessionActive = true;

  knowBtn.disabled = false;
  missBtn.disabled = false;

  known = 0;
  missed = 0;
  startBtn.style.display = "none";

  sessionSizeInput.style.display = "none";
  levelSelect.style.display = "none";
  autoRevealCheckbox.parentElement.style.display = "none";

  loadNextWord();
});

knowBtn.addEventListener("click", async () => {
  if (!sessionActive) return;
  clearTimeout(revealTimer);
  speechSynthesis.cancel();

  await saveWordResult(currentJapanese, currentMeaning, "correct");

  known++;
  currentIndex++;

  loadNextWord();
});

missBtn.addEventListener("click", async () => {
  if (!sessionActive) return;
  clearTimeout(revealTimer);
  speechSynthesis.cancel();

  await saveWordResult(currentJapanese, currentMeaning, "missed");

  missed++;

  currentIndex++;

  loadNextWord();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && sessionActive) {
    knowBtn.click();
  }

  if (event.code === "Space" && sessionActive) {
    event.preventDefault();

    const speech = new SpeechSynthesisUtterance(currentJapanese);

    speech.voice = voices.find((voice) => voice.name === "Google 日本語");

    speech.lang = "ja-JP";

    speechSynthesis.cancel();
    speechSynthesis.speak(speech);
  }

  if (event.key.toLowerCase() === "r" && sessionActive) {
    if (!autoRevealCheckbox.checked) {
      revealMeaning();
    }
  }

  if (event.key.toLowerCase() === "n" && sessionActive) {
    missBtn.click();
  }
});

function createSakura() {
  const container = document.getElementById("sakura-container");

  for (let i = 0; i < 50; i++) {
    const sakura = document.createElement("div");
    sakura.className = "sakura";

    // Random size (3px - 8px)
    const size = 3 + Math.random() * 5;
    sakura.style.width = size + "px";
    sakura.style.height = size + "px";

    // Random horizontal position
    sakura.style.left = Math.random() * 100 + "%";

    // Random opacity
    sakura.style.opacity = 0.08 + Math.random() * 0.12;

    // Random fall speed (8s - 14s)
    sakura.style.animationDuration = 8 + Math.random() * 6 + "s";

    // Random start delay
    sakura.style.animationDelay = Math.random() * 5 + "s";

    container.appendChild(sakura);
  }
}

createSakura();

// if ("serviceWorker" in navigator) {
//   navigator.serviceWorker.register("./service-worker.js");
// }
