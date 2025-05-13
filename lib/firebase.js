// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC8idBq0PAB6cP32qNzEav0yt6_vY-GyfA",
  authDomain: "poem-dcbe8.firebaseapp.com",
  projectId:"poem-dcbe8",
  storageBucket:"poem-dcbe8.firebasestorage.app",
  messagingSenderId:"987917667812",
  appId: "1:987917667812:web:c9172fb1559df464644bf1",
  measurementId:"G-D9HZ6R2T9P",
};
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export { app,auth, db, googleProvider };
