import admin from 'firebase-admin';
import path from 'path';
import { env } from './env';

const serviceAccountPath = env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!admin.apps.length) {
  try {
    if (serviceAccountPath) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin Initialized');
    } else {
      console.warn('Firebase Service Account Path not provided. Auth will not work properly.');
    }
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

export default admin;
