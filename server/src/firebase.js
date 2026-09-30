// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD4AFw7seip022RFgvdu7HBxy8N8JKPL0Y",
  authDomain: "studyflow-68540.firebaseapp.com",
  projectId: "studyflow-68540",
  storageBucket: "studyflow-68540.firebasestorage.app",
  messagingSenderId: "353637806913",
  appId: "1:353637806913:web:62fc3631c726179a3da7c0",
  measurementId: "G-ZLQY4ECLL6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
