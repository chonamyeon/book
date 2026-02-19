import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";

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

// Set explicit persistence for mobile reliability
setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithGoogleRedirect = () => signInWithRedirect(auth, googleProvider);
export const logout = () => signOut(auth);
