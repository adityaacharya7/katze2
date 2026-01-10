// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5mIWyf9mdbyDThBXTBV3XeKe_oKRWmUs",
  authDomain: "katze-172b9.firebaseapp.com",
  projectId: "katze-172b9",
  storageBucket: "katze-172b9.firebasestorage.app",
  messagingSenderId: "132871428572",
  appId: "1:132871428572:web:f3c506972b90b2f16f9719",
  measurementId: "G-ZTGHWK09SY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
