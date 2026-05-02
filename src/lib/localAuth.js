/** Google Identity만 사용하는 클라이언트 세션 (Vercel 미사용) */
export const AUTH_CHANGE_EVENT = 'whiteboard-auth-change';

function decodeJwtPayload(credential) {
  const part = credential.split('.')[1];
  if (!part) return null;
  const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

export function parseGoogleCredential(credential) {
  const p = decodeJwtPayload(credential);
  if (!p?.sub) return null;
  return {
    uid: p.sub,
    email: p.email || '',
    displayName: p.name || p.email || 'User',
    photoURL: p.picture || '',
  };
}

export function setGoogleSession(credential) {
  const user = parseGoogleCredential(credential);
  if (!user) throw new Error('Invalid Google credential');
  localStorage.setItem('auth_user_cache', JSON.stringify(user));
  localStorage.setItem(
    'auth_access_cache',
    JSON.stringify({ hasAccess: true, isPremium: false, trialDaysLeft: 0 }),
  );
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  return user;
}

export function logout() {
  try {
    window.google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    /* ignore */
  }
  localStorage.removeItem('auth_user_cache');
  localStorage.removeItem('auth_access_cache');
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}
