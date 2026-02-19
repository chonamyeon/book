import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export function useAuth() {
    const [user, setUser] = useState(() => {
        // Initialize from localStorage to prevent flash of logged-out state
        const storedUser = localStorage.getItem('archive_user');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                console.error("Failed to parse stored user", e);
                return null;
            }
        }
        return null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isSubscribed = true;

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!isSubscribed) return;

            console.log("Auth State Changed:", currentUser ? "Logged In" : "Logged Out");

            if (currentUser) {
                const userData = {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    photoURL: currentUser.photoURL
                };
                localStorage.setItem('archive_user', JSON.stringify(userData));
                setUser(currentUser);
            } else {
                // CRITICAL: On Safari, if currentUser is null, it might be due to blocked cookies.
                // We trust localStorage until explicit logout clears it.
                // However, if firebase says null, we must eventually respect it or we'll never log out properly
                // if the token is truly invalid.
                // But for the 'refresh loop' issue, staying logged in via local storage is the fix.

                const hasStoredUser = !!localStorage.getItem('archive_user');
                if (!hasStoredUser) {
                    setUser(null);
                }
            }
            setLoading(false);
        });

        return () => {
            isSubscribed = false;
            unsubscribe();
        };
    }, []);

    return { user, loading };
}
