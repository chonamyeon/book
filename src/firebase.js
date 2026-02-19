import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, setPersistence, browserSessionPersistence } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCPfT_tnG5ms3DXPWBFFw4jP2n71tD3E28",
    authDomain: "book-66383.firebaseapp.com",
    projectId: "book-66383",
    storageBucket: "book-66383.firebasestorage.app",
    messagingSenderId: "449271998600",
    appId: "1:449271998600:web:b1699676c3f76176cbd73d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * SAFARI OPTIMIZATION:
 * If login still fails on iPhone Safari, you MUST check:
 * 1. Firebase Console -> Authentication -> Settings -> Authorized Domains
 *    Add "book-psi-sage.vercel.app" (and your custom domain)
 * 2. Google Cloud Console -> APIs & Services -> Credentials
 *    Authorized redirect URIs must include:
 *    https://book-66383.firebaseapp.com/__/auth/handler
 */

// Safari often works better with session persistence for redirects
setPersistence(auth, browserSessionPersistence)
    .catch(err => console.error("Persistence error:", err));

// iOS Safari robust login: always use redirect
export const loginWithGoogle = () => signInWithRedirect(auth, googleProvider);
export const loginWithGoogleRedirect = () => signInWithRedirect(auth, googleProvider);
export const logout = () => signOut(auth);
