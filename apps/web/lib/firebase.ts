import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Public web config for the "edux-9da63" Firebase project. This is safe to
// ship in the client bundle — Firebase web API keys identify the project,
// they don't grant access on their own. Access is controlled from the
// Firebase console instead: restrict Authentication > Settings > Authorized
// domains to the production domain, and enable only the sign-in providers
// (e.g. Email/Password) you actually want.
const firebaseConfig = {
  apiKey: "AIzaSyCAXKQk9dEpgU6h2_KhzbOSqIOVroejHVA",
  authDomain: "edux-9da63.firebaseapp.com",
  projectId: "edux-9da63",
  storageBucket: "edux-9da63.firebasestorage.app",
  messagingSenderId: "467027278596",
  appId: "1:467027278596:web:a0ab70c442ba056070ae51",
  measurementId: "G-680LJS69VN",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
