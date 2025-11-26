import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from '../config/firebase';

export interface FCMNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendFCMNotification = async (
  tokens: string[],
  payload: FCMNotificationPayload
): Promise<{ success: string[]; failed: string[] }> => {
  const firebaseApp = getFirebaseAdmin();
  if (!firebaseApp) {
    console.warn('Firebase not initialized, skipping FCM notification');
    return { success: [], failed: tokens };
  }

  const validTokens = tokens.filter((token) => token && token.trim().length > 0);
  if (validTokens.length === 0) {
    return { success: [], failed: [] };
  }

  const message: admin.messaging.MulticastMessage = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    tokens: validTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    const successTokens: string[] = [];
    const failedTokens: string[] = [];

    response.responses.forEach((resp, idx) => {
      if (resp.success) {
        successTokens.push(validTokens[idx]);
      } else {
        failedTokens.push(validTokens[idx]);
        console.error('Failed to send notification:', resp.error);
      }
    });

    return { success: successTokens, failed: failedTokens };
  } catch (error) {
    console.error('FCM send error:', error);
    return { success: [], failed: validTokens };
  }
};

