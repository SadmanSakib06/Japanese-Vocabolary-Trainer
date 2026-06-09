let voices = [];

voices = speechSynthesis.getVoices();

speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices();
};

const sessionSizeInput = document.getElementById("sessionSize");

const progressBar = document.getElementById("progressBar");

const progressText = document.getElementById("progressText");

const startBtn = document.getElementById("startBtn");
const showBtn = document.getElementById("showBtn");
const knowBtn = document.getElementById("knowBtn");
const missBtn = document.getElementById("missBtn");

const card = document.getElementById("card");
const japaneseDiv = document.getElementById("japanese");
const meaningDiv = document.getElementById("meaning");

let showingMeaning = false;
let currentJapanese = "";
let currentMeaning = "";

let vocabList = [];
let known = 0;
let missed = 0;
let currentIndex = 0;
let sessionWords = [];

function loadNextWord() {
  if (currentIndex >= sessionWords.length) {

    const accuracy =
        ((known / sessionWords.length) * 100).toFixed(1);

    japaneseDiv.textContent = "🎉 Session Complete";

    meaningDiv.innerHTML =
        `
        Correct: ${known}<br>
        Missed: ${missed}<br>
        Accuracy: ${accuracy}%
        `;

    startBtn.style.display = "inline-block";
    sessionSizeInput.style.display = "inline-block";

    return;
}

  const line = sessionWords[currentIndex];

  const [japanese, meaning] = line.split(",", 2);

  currentMeaning = meaning;

  japaneseDiv.textContent = japanese;
  const progress = ((currentIndex + 1) / sessionWords.length) * 100;

  progressBar.style.width = `${progress}%`;

  progressText.textContent = `${currentIndex + 1} / ${sessionWords.length}`;

  meaningDiv.textContent = "";

  const speech = new SpeechSynthesisUtterance(japanese);

  speech.voice = voices.find((voice) => voice.name === "Google 日本語");

  speech.lang = "ja-JP";

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

startBtn.addEventListener("click", async () => {
  const response = await fetch("vocab.txt");
  const text = await response.text();

  vocabList = text.split("\n").filter((line) => line.trim() !== "");

  const sessionSize = parseInt(sessionSizeInput.value);

  sessionWords = [...vocabList]
    .sort(() => Math.random() - 0.5)
    .slice(0, sessionSize);

  currentIndex = 0;

  known = 0;
  missed = 0;
  startBtn.style.display = "none";

sessionSizeInput.style.display = "none";

  loadNextWord();
});

showBtn.addEventListener("click", () => {
  meaningDiv.textContent = currentMeaning;

  const speech = new SpeechSynthesisUtterance(currentMeaning);

  speech.voice = voices.find((voice) => voice.name === "Google UK English Female");

  speech.lang = "en-US";

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
});

knowBtn.addEventListener("click", () => {
  known++;

  currentIndex++;

  loadNextWord();
});

missBtn.addEventListener("click", () => {
  missed++;

  currentIndex++;

  loadNextWord();
});

if ("serviceWorker" in navigator) {

    navigator.serviceWorker.register(
        "./service-worker.js"
    );

}
