import { useState, useEffect } from 'react';
import { AUTH_CHANGE_EVENT } from '../lib/localAuth';

const TRIAL_DAYS = 7;
const ADMIN_EMAILS = ['adia902222@gmail.com'];

const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('auth_user_cache');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

function computeLocalAccess(user) {
  if (!user?.email) return { hasAccess: true, trialDaysLeft: 0, isPremium: false };
  if (ADMIN_EMAILS.includes(user.email)) {
    return { hasAccess: true, trialDaysLeft: 0, isPremium: true };
  }
  const raw = localStorage.getItem(`whiteboard_access_${user.uid}`);
  if (!raw) return { hasAccess: true, trialDaysLeft: TRIAL_DAYS, isPremium: false };
  try {
    const staticDataLike = JSON.parse(raw);
    const { isPremium, trialStartDate, premiumEndDate } = staticDataLike;
    if (isPremium) {
      if (premiumEndDate) {
        const end = premiumEndDate.toDate ? premiumEndDate.toDate() : new Date(premiumEndDate);
        if (new Date() > end) return { hasAccess: true, trialDaysLeft: 0, isPremium: false };
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
    return { hasAccess: true, trialDaysLeft: 0, isPremium: false };
  } catch {
    return { hasAccess: true, trialDaysLeft: 0, isPremium: false };
  }
}

export function useAuth() {
  const cachedUser = getCachedUser();

  const [user, setUser] = useState(cachedUser);
  const [loading] = useState(false);
  const acc = computeLocalAccess(cachedUser);
  const [hasAccess, setHasAccess] = useState(acc.hasAccess);
  const [trialDaysLeft, setTrialDaysLeft] = useState(acc.trialDaysLeft);
  const [isPremium, setIsPremium] = useState(acc.isPremium);

  useEffect(() => {
    const sync = () => {
      const u = getCachedUser();
      setUser(u);
      if (!u) {
        setHasAccess(true);
        setTrialDaysLeft(0);
        setIsPremium(false);
        return;
      }
      const a = computeLocalAccess(u);
      setHasAccess(a.hasAccess);
      setTrialDaysLeft(a.trialDaysLeft);
      setIsPremium(a.isPremium);
      localStorage.setItem('auth_access_cache', JSON.stringify(a));
    };
    sync();
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { user, loading, hasAccess, trialDaysLeft, isPremium };
}
