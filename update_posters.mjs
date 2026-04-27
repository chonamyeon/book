import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDRenQjyt9gknve6tUItfUnaGjfoEZx-8s',
  authDomain: 'archiview.store',
  projectId: 'book-site-123',
  storageBucket: 'book-site-123.firebasestorage.app',
  messagingSenderId: '176157090689',
  appId: '1:176157090689:web:107f25429239f25ffd7e80'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const updates = {
  editorial_hero_poster: '/images/posters/editorial_hero_poster.jpg',
  library_hero_poster: '/images/posters/library_hero_poster.jpg',
  notes_hero_poster: '/images/posters/notes_hero_poster.jpg',
  profile_hero_poster: '/images/posters/profile_hero_poster.jpg',
  youtube_hero_poster: '/images/posters/youtube_hero_poster.jpg',
};

const ref = doc(db, 'site_design', 'main');
await updateDoc(ref, updates);
console.log('Firestore updated with poster paths.');
process.exit(0);
