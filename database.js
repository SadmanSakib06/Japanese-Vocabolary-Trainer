import { app, auth } from "./firebase.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const db = getFirestore(app);

console.log("✅ Firestore connected!");

// ---------- Create User Profile ----------
async function createUserProfile(user) {
  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    name: user.displayName,
    email: user.email,
    createdAt: serverTimestamp(),
  });

  console.log("✅ User profile saved!");
}

function createWordId(word, meaning) {
  const text = word + "_" + meaning;

  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  return "word_" + Math.abs(hash);
}

// ---------- Save Word Result ----------
async function saveWordResult(japanese, meaning, result) {
  const user = auth.currentUser;

  if (!user) {
    console.log("❌ No user logged in");
    return;
  }

  const wordId = createWordId(japanese, meaning);

  const wordRef = doc(db, "users", user.uid, "vocabulary", wordId);

  const wordSnap = await getDoc(wordRef);

  if (!wordSnap.exists()) {
    await setDoc(wordRef, {
      word: japanese,

      meaning: meaning,

      timesSeen: 1,

      timesCorrect: result === "correct" ? 1 : 0,

      timesMissed: result === "missed" ? 1 : 0,

      lastReviewed: serverTimestamp(),
    });
  } else {
    await updateDoc(wordRef, {
      timesSeen: increment(1),

      timesCorrect: result === "correct" ? increment(1) : increment(0),

      timesMissed: result === "missed" ? increment(1) : increment(0),

      lastReviewed: serverTimestamp(),
    });
  }

  console.log("✅ Saved:", japanese, result);
}

// ---------- Get User Progress ----------
async function getUserProgress() {
  const user = auth.currentUser;

  if (!user) {
    console.log("❌ No user logged in");
    return [];
  }

  const vocabRef = collection(db, "users", user.uid, "vocabulary");

  const snapshot = await getDocs(vocabRef);

  const progress = [];

  snapshot.forEach((doc) => {
    progress.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  console.log("✅ Progress loaded:", progress);

  return progress;
}

export { db, createUserProfile, saveWordResult, getUserProgress };
