import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { doc, setDoc, serverTimestamp, addDoc, deleteDoc, collection } from 'firebase/firestore';
import { enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Log page view correctly using the imported logEvent function
logEvent(analytics, 'page_view');

// Initialize Firestore with settings
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser doesn\'t support persistence.');
  }
});

// Helper function to verify Firestore connection
export const verifyFirestoreConnection = async () => {
  try {
    const testDoc = await addDoc(collection(db, '_test_connection'), {
      timestamp: serverTimestamp()
    });
    await deleteDoc(testDoc);
    console.log('Firestore connection verified');
    return true;
  } catch (error) {
    console.error('Firestore connection error:', error);
    return false;
  }
};

// Helper function to create/update user document
export const updateUserData = async (user) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userData = {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastSeen: serverTimestamp(),
  };

  try {
    await setDoc(userRef, userData, { merge: true });
  } catch (error) {
    console.error('Error updating user data:', error);
  }
};

export { db, auth, analytics }; // Export all necessary components