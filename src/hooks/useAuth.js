import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const TRIAL_DAYS = 7;
const ADMIN_EMAILS = ['adia902222@gmail.com'];

const getCachedUser = () => {
    try {
        const cached = localStorage.getItem('auth_user_cache');
        return cached ? JSON.parse(cached) : null;
    } catch { return null; }
};

const getCachedAccess = () => {
    try {
        const cached = localStorage.getItem('auth_access_cache');
        return cached ? JSON.parse(cached) : null;
    } catch { return null; }
};

function computeAccess(firestoreData) {
    if (!firestoreData) return { hasAccess: false, trialDaysLeft: 0, isPremium: false };

    const { isPremium, trialStartDate, premiumEndDate } = firestoreData;

    if (isPremium) {
        // premiumEndDate 체크 (없으면 영구)
        if (premiumEndDate) {
            const end = premiumEndDate.toDate ? premiumEndDate.toDate() : new Date(premiumEndDate);
            if (new Date() > end) return { hasAccess: false, trialDaysLeft: 0, isPremium: false };
        }
        return { hasAccess: true, trialDaysLeft: 0, isPremium: true };
    }

    if (trialStartDate) {
        const start = trialStartDate.toDate ? trialStartDate.toDate() : new Date(trialStartDate);
        const trialEnd = new Date(start);
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
        const now = new Date();
        if (now < trialEnd) {
            const msLeft = trialEnd - now;
            const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
            return { hasAccess: true, trialDaysLeft: daysLeft, isPremium: false };
        }
    }

    return { hasAccess: false, trialDaysLeft: 0, isPremium: false };
}

export function useAuth() {
    const cachedUser = getCachedUser();
    const cachedAccess = getCachedAccess();

    const [user, setUser] = useState(cachedUser);
    const [loading, setLoading] = useState(!cachedUser);
    const [hasAccess, setHasAccess] = useState(cachedAccess?.hasAccess ?? false);
    const [trialDaysLeft, setTrialDaysLeft] = useState(cachedAccess?.trialDaysLeft ?? 0);
    const [isPremium, setIsPremium] = useState(cachedAccess?.isPremium ?? false);

    useEffect(() => {
        let firestoreUnsub = null;

        const authUnsub = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser || null);
            setLoading(false);

            if (currentUser) {
                localStorage.setItem('auth_user_cache', JSON.stringify({
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    photoURL: currentUser.photoURL,
                }));

                // Firestore 구독 → trial/premium 상태 실시간 감지
                // 어드민 이메일은 항상 프리미엄
                if (ADMIN_EMAILS.includes(currentUser.email)) {
                    setHasAccess(true);
                    setIsPremium(true);
                    setTrialDaysLeft(0);
                    localStorage.setItem('auth_access_cache', JSON.stringify({ hasAccess: true, isPremium: true, trialDaysLeft: 0 }));
                }

                firestoreUnsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
                    if (snap.exists()) {
                        // 어드민 이메일은 Firestore 상태와 무관하게 항상 프리미엄 유지
                        if (ADMIN_EMAILS.includes(currentUser.email)) return;
                        const access = computeAccess(snap.data());
                        setHasAccess(access.hasAccess);
                        setTrialDaysLeft(access.trialDaysLeft);
                        setIsPremium(access.isPremium);
                        localStorage.setItem('auth_access_cache', JSON.stringify(access));
                    }
                });
            } else {
                localStorage.removeItem('auth_user_cache');
                localStorage.removeItem('auth_access_cache');
                if (firestoreUnsub) firestoreUnsub();
                setHasAccess(false);
                setTrialDaysLeft(0);
                setIsPremium(false);
            }
        });

        return () => {
            authUnsub();
            if (firestoreUnsub) firestoreUnsub();
        };
    }, []);

    return { user, loading, hasAccess, trialDaysLeft, isPremium };
}
