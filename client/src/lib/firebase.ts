import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const isMock = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ,
};

const app = !isMock ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null;
const auth = app ? getAuth(app) : null;
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider, isMock };
