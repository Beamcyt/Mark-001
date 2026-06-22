import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDhuDSnXjL6wIF_WH9lMiWP7jHDLK4Gdhs",
  authDomain: "mark-001-427ed.firebaseapp.com",
  projectId: "mark-001-427ed",
  storageBucket: "mark-001-427ed.firebasestorage.app",
  messagingSenderId: "436955943041",
  appId: "1:436955943041:web:65b189b552f16ed310bd80",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}
export async function signOutUser() {
  return signOut(auth);
}
export async function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}
export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export async function resetPasswordByEmail(email) {
  return sendPasswordResetEmail(auth, email);
}
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  return updatePassword(user, newPassword);
}
