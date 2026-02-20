import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, setPersistence, browserLocalPersistence, getRedirectResult } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Explicitly set parameters to ensure clean OAuth flow
// Explicitly set parameters to ensure clean OAuth flow and use the CORRECT Client ID
googleProvider.setCustomParameters({
    prompt: 'select_account',
    client_id: '81562499893-ur8s5hh4m8019htb6uo0j52qf7qg0s09.apps.googleusercontent.com'
});

/**
 * SAFARI OPTIMIZATION:
 * If login still fails on iPhone Safari, you MUST check:
 * 1. Firebase Console -> Authentication -> Settings -> Authorized Domains
 *    Add "book-psi-sage.vercel.app" (and your custom domain)
 * 2. Google Cloud Console -> APIs & Services -> Credentials
 *    Authorized redirect URIs must include:
 *    https://book-66383.firebaseapp.com/__/auth/handler
 */

// Safari often works better with session persistence for redirects, but user needs persistent login:
setPersistence(auth, browserLocalPersistence)
    .catch(err => console.error("Persistence error:", err));

// iOS Safari robust login: always use redirect
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithGoogleRedirect = () => signInWithRedirect(auth, googleProvider);
export const logout = () => signOut(auth);
// Export getRedirectResult strictly for component usage if needed (though already imported directly in components usually)
export { getRedirectResult };
