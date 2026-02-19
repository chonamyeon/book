import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Important: explicit call to handle redirect result on mount
                await getRedirectResult(auth);
            } catch (err) {
                console.error("Global redirect login error:", err);
            }

            const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                setUser(currentUser || auth.currentUser);
                setLoading(false);
            });
            return unsubscribe;
        };

        const authUnsubscribe = initAuth();

        return () => {
            authUnsubscribe.then(unsub => unsub && unsub());
        };
    }, []);

    return { user, loading };
}
