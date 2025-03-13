import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentSingleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyD37J9kI6wId-r0yj77fdImUaUkjmz9fpM",
  authDomain: "orbit-646f4.firebaseapp.com",
  projectId: "orbit-646f4",
  storageBucket: "orbit-646f4.appspot.com",
  messagingSenderId: "265100810237",
  appId: "1:265100810237:web:addda7fdaf2170686dab94",
  measurementId: "G-8EYC4TP4QJ"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Initialize Auth with persistence
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Auth persistence set successfully');
  })
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });

// Initialize Firestore with persistent cache
let db;
try {
  db = initializeFirestore(app, {
    cache: persistentLocalCache({
      tabManager: persistentSingleTabManager()
    })
  });
  console.log('Firestore initialized successfully');
} catch (error) {
  console.error('Error initializing Firestore:', error);
  console.log('Falling back to default Firestore initialization');
  db = getFirestore(app);
}

// Initialize Storage
let storage;
try {
  storage = getStorage(app);
  console.log('Storage initialized successfully');
} catch (error) {
  console.error('Error initializing Storage:', error);
  throw error;
}

// Initialize Analytics only in browser environment and if supported
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log('Analytics initialized successfully');
      } else {
        console.log('Analytics not supported in this environment');
      }
    })
    .catch(error => {
      console.error('Error checking analytics support:', error);
    });
}

// Enable emulators in development
if (process.env.NODE_ENV === 'development') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Emulators connected successfully');
  } catch (error) {
    console.error('Error connecting to emulators:', error);
  }
}

export { auth, db, storage, analytics };
export default app; 