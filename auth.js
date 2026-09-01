import { auth } from "./firebase.js";
import { createUserProfile } from "./database.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

// ---------- DOM ----------
const loginBtn = document.getElementById("loginBtn");
const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const accountAvatar = document.getElementById("accountAvatar");
const accountName = document.getElementById("accountName");
const loginLabel = document.querySelector(".login-label");

// ---------- Firebase ----------
const provider = new GoogleAuthProvider();

// Prevent clicking before Firebase finishes checking auth state
loginBtn.disabled = true;

// ---------- UI ----------
function showApp() {
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
}

function setLoginBusy(isBusy) {
  loginBtn.disabled = isBusy;
  loginBtn.classList.toggle("is-loading", isBusy);
  if (loginLabel) loginLabel.textContent = isBusy ? "Opening Google…" : "Continue with Google";
}

function showLogin() {
  loginScreen.style.display = "block";
  appScreen.style.display = "none";
}

// ---------- Login ----------
loginBtn.addEventListener("click", async () => {
  setLoginBusy(true);

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed:", error);
    setLoginBusy(false);
  }
});

// ---------- Authentication State ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Signed in:", user.displayName);

    await createUserProfile(user);

    if (accountAvatar) {
      const fallback = (user.displayName || "語").trim().charAt(0).toUpperCase();
      accountAvatar.textContent = fallback || "語";
    }
    if (accountName) accountName.textContent = user.displayName || "Study account";

    window.kotobaUser = user;
    showApp();
    window.dispatchEvent(new CustomEvent("kotoba:ready", { detail: { user } }));
  } else {
    console.log("❌ Not signed in");

    showLogin();

    setLoginBusy(false);
  }
});
