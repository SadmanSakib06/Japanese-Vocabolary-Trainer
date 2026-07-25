import { auth } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

// ---------- DOM ----------
const loginBtn = document.getElementById("loginBtn");
const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");

// ---------- Firebase ----------
const provider = new GoogleAuthProvider();

// Prevent clicking before Firebase finishes checking auth state
loginBtn.disabled = true;

// ---------- UI ----------
function showApp() {
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
}

function showLogin() {
  loginScreen.style.display = "block";
  appScreen.style.display = "none";
}

// ---------- Login ----------
loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed:", error);
    loginBtn.disabled = false;
  }
});

// ---------- Authentication State ----------
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Signed in:", user.displayName);

    showApp();
  } else {
    console.log("❌ Not signed in");

    showLogin();
    loginBtn.disabled = false;
  }
});