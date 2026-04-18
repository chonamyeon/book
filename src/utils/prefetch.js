import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const prefetchCache = new Map();

export function prefetchStory(id) {
  if (prefetchCache.has(id)) return;
  const promise = getDoc(doc(db, 'adsenseBooks', id))
    .then(snap => snap.exists() ? { ...snap.data(), id } : null)
    .catch(() => null);
  prefetchCache.set(id, promise);
}

export { prefetchCache };
