import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Optimistically check if we have a session in storage to prevent flash of login screen
        const storedUser = localStorage.getItem('archive_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log("Auth State Changed:", currentUser ? "Logged In" : "Logged Out");
            if (currentUser) {
                // Save essential user info to localStorage as backup
                localStorage.setItem('archive_user', JSON.stringify({
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    photoURL: currentUser.photoURL
                }));
                setUser(currentUser);
            } else {
                // Only clear if we are sure (maybe on logout)
                // specific logout action should clear this.
                // For now, if firebase says out, we eventually trust it, but we might want to verify.
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading };
}
