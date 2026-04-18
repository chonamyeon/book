import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../upheld-dragon-488101-q7-ef15269bb6cb.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// think-and-grow-rich 책 조회
const booksRef = db.collection('books');
const q = await booksRef.where('title', '>=', '생각하라').where('title', '<=', '생각하라\uf8ff').get();
q.forEach(doc => {
  console.log(doc.id, JSON.stringify({ title: doc.data().title, amazonLink: doc.data().amazonLink }));
});
process.exit(0);
