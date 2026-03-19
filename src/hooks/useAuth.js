import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

// localStorage에서 캐시된 유저 정보 읽기 (즉시 반환)
const getCachedUser = () => {
    try {
        const cached = localStorage.getItem('auth_user_cache');
        return cached ? JSON.parse(cached) : null;
    } catch { return null; }
};

export function useAuth() {
    const cachedUser = getCachedUser();
    // 캐시 있으면 loading=false로 시작 → 프로필 즉시 표시
    const [user, setUser] = useState(cachedUser);
    const [loading, setLoading] = useState(!cachedUser);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser || null);
            setLoading(false);
            if (currentUser) {
                localStorage.setItem('auth_user_cache', JSON.stringify({
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    photoURL: currentUser.photoURL,
                }));
            } else {
                localStorage.removeItem('auth_user_cache');
            }
        });
        return unsubscribe;
    }, []);

    return { user, loading };
}
