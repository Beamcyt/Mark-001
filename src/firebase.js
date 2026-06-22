import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDhuDSnXjL6wIF_WH9lMiWP7jHDLK4Gdhs",
  authDomain: "mark-001-427ed.firebaseapp.com",
  projectId: "mark-001-427ed",
  storageBucket: "mark-001-427ed.firebasestorage.app",
  messagingSenderId: "436955943041",
  appId: "1:436955943041:web:65b189b552f16ed310bd80"
};

const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}
export async function signOutUser() {
  return signOut(auth);
}
