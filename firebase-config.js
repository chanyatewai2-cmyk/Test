// Shared Firebase configuration for ZenBoostMm
// This is a Firebase Web SDK config. Do NOT put service-account/private keys here.
const firebaseConfig = {
  apiKey: "AIzaSyDprUbjS2uDbwrHhYQbA43GvviUFRzNqs4",
  authDomain: "zenboostmm.firebaseapp.com",
  projectId: "zenboostmm",
  storageBucket: "zenboostmm.firebasestorage.app",
  messagingSenderId: "913894334273",
  appId: "1:913894334273:web:4712ddbf2b92d2d4024bc0",
  measurementId: "G-WBN07PF0KZ"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.firebaseAuth = firebase.auth();
window.firebaseDB = firebase.firestore();
