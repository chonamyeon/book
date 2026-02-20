import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, setPersistence, browserLocalPersistence, getRedirectResult } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDRenQjyt9gknve6tUItfUnaGjfoEZx-8s",
    authDomain: "book-site-123.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "book-site-123",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "book-site-123.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "176157090689",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:176157090689:web:107f25429239f25ffd7e80"
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
export const loginWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);
    return signInWithPopup(auth, googleProvider);
};

export const loginWithGoogleRedirect = async () => {
    await setPersistence(auth, browserLocalPersistence);
    return signInWithRedirect(auth, googleProvider);
};
export const logout = () => signOut(auth);
// Export getRedirectResult strictly for component usage if needed (though already imported directly in components usually)
export { getRedirectResult };
