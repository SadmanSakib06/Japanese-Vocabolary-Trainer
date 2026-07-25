// Import Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDS5myqkqG_f11ZrdCzpwZZL1tRn4cpeY8",
  authDomain: "jlpt-hub-76bc6.firebaseapp.com",
  projectId: "jlpt-hub-76bc6",
  storageBucket: "jlpt-hub-76bc6.firebasestorage.app",
  messagingSenderId: "622516033368",
  appId: "1:622516033368:web:42bf66962f71cdc51c772d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

// Verify the connection
console.log("✅ Firebase connected!");

// Export the app for later use
export { app, auth };