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
const progressContainer = document.getElementById("progressContainer");
const startBtn = document.getElementById("startBtn");
const knowBtn = document.getElementById("knowBtn");
const missBtn = document.getElementById("missBtn");
const replayBtn = document.getElementById("replayBtn");
const card = document.getElementById("card");
const cardState = document.getElementById("cardState");
const japaneseDiv = document.getElementById("japanese");
const meaningDiv = document.getElementById("meaning");
const answerArea = document.querySelector(".answer-area");
const statPracticed = document.getElementById("statPracticed");
const statPracticedSub = document.getElementById("statPracticedSub");
const statAccuracy = document.getElementById("statAccuracy");
const statAccuracySub = document.getElementById("statAccuracySub");
const statReview = document.getElementById("statReview");
const statReviewSub = document.getElementById("statReviewSub");
const accuracyBar = document.getElementById("accuracyBar");
const snapshotCards = document.querySelectorAll(".snapshot-card");
const sizePresets = document.querySelectorAll(".size-preset");
const sizePresetsWrap = document.querySelector(".size-presets");
const levelChoices = document.querySelectorAll(".level-choice");

// Keep the visible level picker and the existing select value in sync.
levelChoices.forEach((choice) => {
  choice.addEventListener("click", () => {
    const value = choice.dataset.level;
    if (!value || !levelSelect) return;

    levelSelect.value = value;
    levelChoices.forEach((item) => {
      const active = item === choice;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
  });
});
const sessionResults = document.getElementById("sessionResults");
const resultAccuracyRing = document.getElementById("resultAccuracyRing");
const resultCorrect = document.getElementById("resultCorrect");
const resultMissed = document.getElementById("resultMissed");
const resultTime = document.getElementById("resultTime");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultAgainBtn = document.getElementById("resultAgainBtn");
const resultSetupBtn = document.getElementById("resultSetupBtn");
const sessionFeedback = document.getElementById("session-feedback");
const feedbackLayer = document.getElementById("feedback-layer");
const nekoLeft = document.getElementById("neko-left");
const nekoRight = document.getElementById("neko-right");

let currentJapanese = "";
let currentMeaning = "";
let vocabList = [];
let known = 0;
let missed = 0;
let currentIndex = 0;
let sessionWords = [];
let revealTimer;
let sessionActive = false;
let isSaving = false;
let transitionTimer;
let sessionStartedAt = 0;


function refreshStudySnapshot(progress) {
  const records = Array.isArray(progress) ? progress : [];
  const practiced = records.length;
  const totalSeen = records.reduce((sum, item) => sum + Number(item.timesSeen || 0), 0);
  const totalCorrect = records.reduce((sum, item) => sum + Number(item.timesCorrect || 0), 0);
  const accuracy = totalSeen ? Math.round((totalCorrect / totalSeen) * 100) : 0;
  const needsReview = records.filter((item) => Number(item.timesMissed || 0) > 0).length;

  if (statPracticed) statPracticed.textContent = practiced.toLocaleString();
  if (statPracticedSub) statPracticedSub.textContent = practiced === 1 ? "word in your library" : "unique words in your library";
  if (statAccuracy) statAccuracy.textContent = totalSeen ? `${accuracy}%` : "—";
  if (statAccuracySub) statAccuracySub.textContent = totalSeen ? `${totalSeen.toLocaleString()} total reviews` : "No reviews yet";
  if (accuracyBar) accuracyBar.style.width = `${accuracy}%`;
  if (statReview) statReview.textContent = needsReview.toLocaleString();
  if (statReviewSub) statReviewSub.textContent = needsReview ? "Words with at least one miss" : "You’re all caught up";

  snapshotCards.forEach((item) => item.classList.remove("snapshot-loading"));
}

async function loadStudySnapshot() {
  snapshotCards.forEach((item) => item.classList.add("snapshot-loading"));
  try {
    const progress = await getUserProgress();
    refreshStudySnapshot(progress);
  } catch (error) {
    console.error("Unable to load study snapshot:", error);
    snapshotCards.forEach((item) => item.classList.remove("snapshot-loading"));
    if (statPracticed) statPracticed.textContent = "—";
    if (statAccuracy) statAccuracy.textContent = "—";
    if (statReview) statReview.textContent = "—";
  }
}

function syncSizePresetState(value) {
  sizePresets.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.size) === Number(value));
  });
}

sizePresets.forEach((button) => {
  button.addEventListener("click", () => {
    sessionSizeInput.value = button.dataset.size;
    syncSizePresetState(button.dataset.size);
  });
});

sessionSizeInput.addEventListener("input", () => syncSizePresetState(sessionSizeInput.value));


window.addEventListener("kotoba:ready", loadStudySnapshot);
if (window.kotobaUser) loadStudySnapshot();

function getJapaneseVoice() {
  return voices.find((voice) => voice.name === "Google 日本語")
    || voices.find((voice) => voice.lang?.toLowerCase().startsWith("ja"))
    || null;
}

function getEnglishVoice() {
  return voices.find((voice) => voice.name === "Google UK English Female")
    || voices.find((voice) => voice.lang?.toLowerCase().startsWith("en-gb"))
    || voices.find((voice) => voice.lang?.toLowerCase().startsWith("en"))
    || null;
}

function speakJapanese() {
  if (!currentJapanese) return;

  const speech = new SpeechSynthesisUtterance(currentJapanese);
  speech.voice = getJapaneseVoice();
  speech.lang = "ja-JP";
  speech.rate = 0.9;
  speech.pitch = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);

  if (replayBtn) {
    replayBtn.classList.remove("is-playing");
    void replayBtn.offsetWidth;
    replayBtn.classList.add("is-playing");
  }
}

function revealMeaning() {
  if (!sessionActive || !currentMeaning || meaningDiv.classList.contains("is-visible")) return;

  meaningDiv.textContent = currentMeaning;
  meaningDiv.classList.remove("is-visible");
  void meaningDiv.offsetWidth;
  meaningDiv.classList.add("is-visible");

  card.classList.remove("is-revealing");
  void card.offsetWidth;
  card.classList.add("is-revealing");

  const speech = new SpeechSynthesisUtterance(currentMeaning);
  speech.voice = getEnglishVoice();
  speech.lang = "en-US";
  speech.rate = 0.95;

  speechSynthesis.cancel();
  speechSynthesis.speak(speech);

  if (cardState) cardState.textContent = "Meaning revealed";
}

function animateCardOut(callback) {
  clearTimeout(transitionTimer);
  card.classList.add("is-leaving");

  transitionTimer = setTimeout(() => {
    callback();
    card.classList.remove("is-leaving");
    card.classList.add("is-entering");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => card.classList.remove("is-entering"));
    });
  }, 180);
}

function setAnswerState(state) {
  answerArea.classList.remove("answer-success", "answer-miss");
  if (state) answerArea.classList.add(state === "correct" ? "answer-success" : "answer-miss");
}

function showSessionFeedback(result) {
  if (!sessionFeedback) return;

  const isCorrect = result === "correct";
  sessionFeedback.textContent = isCorrect ? "Nice recall" : "Worth another look";
  sessionFeedback.classList.remove("is-correct", "is-missed", "is-visible");
  sessionFeedback.classList.add(isCorrect ? "is-correct" : "is-missed");
  sessionFeedback.hidden = false;

  if (nekoLeft) nekoLeft.classList.add(isCorrect ? "celebrate" : "encourage");
  if (nekoRight) nekoRight.classList.add(isCorrect ? "celebrate" : "encourage");

  requestAnimationFrame(() => sessionFeedback.classList.add("is-visible"));

  window.setTimeout(() => {
    sessionFeedback.classList.remove("is-visible");
    if (nekoLeft) nekoLeft.classList.remove("celebrate", "encourage");
    if (nekoRight) nekoRight.classList.remove("celebrate", "encourage");
    window.setTimeout(() => {
      if (sessionFeedback) sessionFeedback.hidden = true;
    }, 220);
  }, 520);
}

function createFeedbackParticles(result) {
  if (!feedbackLayer) return;

  feedbackLayer.querySelectorAll(".feedback-particle").forEach((particle) => particle.remove());

  const count = result === "correct" ? 10 : 6;
  const glyph = result === "correct" ? "✦" : "·";

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = `feedback-particle ${result === "correct" ? "is-correct" : "is-missed"}`;
    particle.textContent = glyph;
    particle.style.setProperty("--x", `${(Math.random() - 0.5) * 190}px`);
    particle.style.setProperty("--y", `${-35 - Math.random() * 95}px`);
    particle.style.setProperty("--r", `${Math.round((Math.random() - 0.5) * 70)}deg`);
    particle.style.setProperty("--d", `${250 + Math.random() * 220}ms`);
    feedbackLayer.appendChild(particle);
  }

  window.setTimeout(() => {
    feedbackLayer.querySelectorAll(".feedback-particle").forEach((particle) => particle.remove());
  }, 650);
}

function celebrateSessionStart() {
  document.body.classList.remove("session-starting");
  void document.body.offsetWidth;
  document.body.classList.add("session-starting");
  window.setTimeout(() => document.body.classList.remove("session-starting"), 700);
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getResultMessage(accuracy) {
  if (accuracy >= 90) {
    return ["Excellent work.", "Your recall is looking strong. Keep the momentum going."];
  }
  if (accuracy >= 75) {
    return ["Great progress.", "A solid session. A little more repetition will make these words stick."];
  }
  if (accuracy >= 50) {
    return ["Good effort.", "You are building the foundation. Your missed words are already queued for review."];
  }
  return ["Keep going.", "Every miss gives you a better target for the next round."];
}

function animateResultNumber(element, target, suffix = "") {
  if (!element) return;

  const end = Number(target) || 0;
  const duration = 650;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = `${Math.round(end * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function showSessionResults() {
  const total = sessionWords.length;
  const accuracy = total ? Math.round((known / total) * 100) : 0;
  const duration = sessionStartedAt ? Date.now() - sessionStartedAt : 0;
  const [title, message] = getResultMessage(accuracy);

  if (resultTitle) resultTitle.textContent = title;
  if (resultMessage) resultMessage.textContent = message;
  if (resultAccuracyRing) resultAccuracyRing.textContent = "0%";
  if (resultCorrect) resultCorrect.textContent = "0";
  if (resultMissed) resultMissed.textContent = "0";
  if (resultTime) resultTime.textContent = formatDuration(duration);

  card.hidden = true;
  answerArea.hidden = true;
  const keyboardHint = document.querySelector(".keyboard-hint");
  if (keyboardHint) keyboardHint.hidden = true;
  sessionResults.hidden = false;
  sessionResults.classList.remove("is-visible");
  void sessionResults.offsetWidth;
  sessionResults.classList.add("is-visible");

  animateResultNumber(resultCorrect, known);
  animateResultNumber(resultMissed, missed);

  if (resultAccuracyRing) {
    let current = 0;
    const start = performance.now();
    const ringDuration = 800;

    const animateRing = (now) => {
      const progress = Math.min(1, (now - start) / ringDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(accuracy * eased);
      resultAccuracyRing.textContent = `${current}%`;
      sessionResults.style.setProperty("--result-progress", `${current * 3.6}deg`);
      if (progress < 1) requestAnimationFrame(animateRing);
    };

    requestAnimationFrame(animateRing);
  }
}

function hideSessionResults() {
  if (!sessionResults) return;
  sessionResults.hidden = true;
  sessionResults.classList.remove("is-visible");
  card.hidden = false;
  answerArea.hidden = false;
  const keyboardHint = document.querySelector(".keyboard-hint");
  if (keyboardHint) keyboardHint.hidden = false;
}

function loadNextWord(withTransition = false) {
  const render = () => {
    setAnswerState(null);

    if (currentIndex >= sessionWords.length) {
      sessionActive = false;
      isSaving = false;
      knowBtn.disabled = true;
      missBtn.disabled = true;
      if (replayBtn) replayBtn.disabled = true;

      progressBar.style.width = "100%";
      progressContainer?.setAttribute("aria-valuenow", "100");
      progressText.textContent = `${known} / ${sessionWords.length} correct`;

      startBtn.style.display = "inline-flex";
      sessionSizeInput.style.display = "inline-block";
      levelSelect.style.display = "inline-block";
      if (sizePresetsWrap) sizePresetsWrap.style.display = "flex";
      autoRevealCheckbox.parentElement.style.display = "flex";

      showSessionResults();
      loadStudySnapshot();
      return;
    }

    card.classList.remove("session-complete", "is-revealing");

    // Re-enable the study controls for every new card. They are disabled
    // during answer saving to prevent double submissions.
    knowBtn.disabled = false;
    missBtn.disabled = false;
    if (replayBtn) replayBtn.disabled = false;

    const line = sessionWords[currentIndex];
    const [japanese, meaning] = line.split(",", 2);

    currentJapanese = japanese.trim();
    currentMeaning = (meaning || "").trim();

    japaneseDiv.textContent = currentJapanese;
    meaningDiv.textContent = "";
    meaningDiv.classList.remove("is-visible");
    clearTimeout(revealTimer);

    const progress = ((currentIndex + 1) / sessionWords.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressContainer?.setAttribute("aria-valuenow", String(Math.round(progress)));
    progressText.textContent = `${currentIndex + 1} / ${sessionWords.length}`;
    if (cardState) cardState.textContent = "Think of the meaning";

    if (autoRevealCheckbox.checked) {
      revealTimer = setTimeout(() => revealMeaning(), 3000);
    }

    speakJapanese();
  };

  if (withTransition) animateCardOut(render);
  else render();
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

  const shuffledWeak = weakWords.sort(() => Math.random() - 0.5);
  const shuffledNew = newWords.sort(() => Math.random() - 0.5);
  const shuffledOther = otherWords.sort(() => Math.random() - 0.5);

  const weakCount = Math.min(shuffledWeak.length, Math.floor(sessionSize * 0.5));
  const newCount = Math.min(shuffledNew.length, Math.floor(sessionSize * 0.3));

  const chosen = [
    ...shuffledWeak.slice(0, weakCount),
    ...shuffledNew.slice(0, newCount),
    ...shuffledOther,
  ];

  // Back-fill any unused slots so small datasets still create a full session.
  if (chosen.length < sessionSize) {
    const used = new Set(chosen);
    const remainder = [
      ...shuffledWeak.slice(weakCount),
      ...shuffledNew.slice(newCount),
    ].sort(() => Math.random() - 0.5);

    for (const line of remainder) {
      if (chosen.length >= sessionSize) break;
      if (!used.has(line)) {
        chosen.push(line);
        used.add(line);
      }
    }
  }

  return chosen.slice(0, sessionSize);
}

startBtn.addEventListener("click", async () => {
  const level = levelSelect.value;
  const sessionSize = Math.max(1, parseInt(sessionSizeInput.value, 10) || 100);

  startBtn.disabled = true;
  startBtn.querySelector("span:first-child").textContent = "Preparing…";

  try {
    const response = await fetch(`vocab_${level}.txt`);
    if (!response.ok) throw new Error(`Vocabulary file not found: ${level}`);

    const text = await response.text();
    vocabList = text.split("\n").map((line) => line.trim()).filter(Boolean);

    const progress = await getUserProgress();
    sessionWords = createSmartSession(vocabList, progress, Math.min(sessionSize, vocabList.length));

    currentIndex = 0;
    known = 0;
    missed = 0;
    sessionActive = sessionWords.length > 0;
    isSaving = false;
    sessionStartedAt = Date.now();
    hideSessionResults();
    celebrateSessionStart();

    if (!sessionActive) throw new Error("No vocabulary words available for this level.");

    knowBtn.disabled = false;
    missBtn.disabled = false;
    if (replayBtn) replayBtn.disabled = false;

    startBtn.style.display = "none";
    sessionSizeInput.style.display = "none";
    levelSelect.style.display = "none";
    if (sizePresetsWrap) sizePresetsWrap.style.display = "none";
    autoRevealCheckbox.parentElement.style.display = "none";

    loadNextWord();
  } catch (error) {
    console.error("Unable to start session:", error);
    progressText.textContent = "Could not start session";
    cardState && (cardState.textContent = "Please try again");
  } finally {
    startBtn.disabled = false;
    startBtn.querySelector("span:first-child").textContent = "Start session";
  }
});

async function handleAnswer(result) {
  if (!sessionActive || isSaving) return;

  isSaving = true;
  clearTimeout(revealTimer);
  speechSynthesis.cancel();
  if (replayBtn) replayBtn.classList.remove("is-playing");

  setAnswerState(result);
  showSessionFeedback(result);
  createFeedbackParticles(result);
  card.classList.add(result === "correct" ? "flash-correct" : "flash-miss");

  knowBtn.disabled = true;
  missBtn.disabled = true;
  if (replayBtn) replayBtn.disabled = true;

  try {
    await saveWordResult(currentJapanese, currentMeaning, result);

    if (result === "correct") known++;
    else missed++;

    currentIndex++;

    setTimeout(() => card.classList.remove("flash-correct", "flash-miss"), 260);
    loadNextWord(true);
  } catch (error) {
    console.error("Unable to save answer:", error);
    setAnswerState(null);
    knowBtn.disabled = false;
    missBtn.disabled = false;
    if (replayBtn) replayBtn.disabled = false;
  } finally {
    isSaving = false;
  }
}

knowBtn.addEventListener("click", () => handleAnswer("correct"));
missBtn.addEventListener("click", () => handleAnswer("missed"));
replayBtn?.addEventListener("click", speakJapanese);

resultAgainBtn?.addEventListener("click", () => {
  startBtn.click();
});

resultSetupBtn?.addEventListener("click", () => {
  hideSessionResults();
  document.querySelector(".setup-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
});

card.addEventListener("click", () => {
  if (sessionActive && !meaningDiv.classList.contains("is-visible")) revealMeaning();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && sessionActive) {
    event.preventDefault();
    knowBtn.click();
  }

  if (event.code === "Space" && sessionActive) {
    event.preventDefault();
    speakJapanese();
  }

  if (event.key.toLowerCase() === "r" && sessionActive) {
    event.preventDefault();
    revealMeaning();
  }

  if (event.key.toLowerCase() === "n" && sessionActive) {
    event.preventDefault();
    missBtn.click();
  }
});

function createSakura() {
  const container = document.getElementById("sakura-container");

  for (let i = 0; i < 50; i++) {
    const sakura = document.createElement("div");
    sakura.className = "sakura";

    const size = 3 + Math.random() * 5;
    sakura.style.width = size + "px";
    sakura.style.height = size + "px";
    sakura.style.left = Math.random() * 100 + "%";
    sakura.style.opacity = 0.08 + Math.random() * 0.12;
    sakura.style.animationDuration = 8 + Math.random() * 6 + "s";
    sakura.style.animationDelay = Math.random() * 5 + "s";

    container.appendChild(sakura);
  }
}

createSakura();
