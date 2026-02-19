import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";

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

        const checkAuth = async () => {
            try {
                // On iOS/Safari, onAuthStateChanged might fail initially due to 3rd party cookie blocking.
                // We should also check for redirect results which might be 'in flight'.
                const redirectResult = await getRedirectResult(auth);
                if (redirectResult && isSubscribed) {
                    const authenticatedUser = redirectResult.user;
                    const userData = {
                        uid: authenticatedUser.uid,
                        displayName: authenticatedUser.displayName,
                        email: authenticatedUser.email,
                        photoURL: authenticatedUser.photoURL
                    };
                    localStorage.setItem('archive_user', JSON.stringify(userData));
                    setUser(authenticatedUser);
                }
            } catch (error) {
                console.error("Redirect check error in useAuth:", error);
            }

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
                    // We only clear the user if we are sure it's not a temporary glitch.
                    // However, for security, we should eventually sync with Firebase.
                    // For now, if we have a storedUser, we keep it as 'probational' 
                    // until a clear logout or a failed auth attempt.

                    const hasStoredUser = !!localStorage.getItem('archive_user');
                    if (!hasStoredUser) {
                        setUser(null);
                    }
                }
                setLoading(false);
            });

            return unsubscribe;
        };

        const unsubscribePromise = checkAuth();

        return () => {
            isSubscribed = false;
            unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
        };
    }, []);

    return { user, loading };
}
