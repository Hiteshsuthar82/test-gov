import * as admin from 'firebase-admin';

let firebaseInitialized = false;

export const initializeFirebase = (): void => {
  if (firebaseInitialized) {
    return;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (projectId && privateKey && clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
      firebaseInitialized = true;
      console.log('Firebase Admin initialized');
    } else {
      console.warn('Firebase credentials not found. FCM notifications will be disabled.');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

export const getFirebaseAdmin = (): admin.app.App | null => {
  if (!firebaseInitialized) {
    return null;
  }
  return admin.app();
};

