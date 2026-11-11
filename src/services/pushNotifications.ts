import {Alert, PermissionsAndroid, Platform} from 'react-native';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission as requestMessagingPermission,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import {PUSH_CHANNEL_ID, PUSH_CHANNEL_NAME} from '../config/push';

export type PushTokenListener = (token: string) => void;
export type PushOpenHandler = () => void;

let initialized = false;
let lastToken: string | null = null;
let tokenListener: PushTokenListener | null = null;
let openHandler: PushOpenHandler | null = null;
const unsubscribers: Array<() => void> = [];

export function setPushTokenListener(listener: PushTokenListener | null) {
  tokenListener = listener;
  if (listener && lastToken) {
    listener(lastToken);
  }
}

export function setPushOpenHandler(handler: PushOpenHandler | null) {
  openHandler = handler;
}

export function getLastFcmToken(): string | null {
  return lastToken;
}

function handleNotificationOpen(remoteMessage?: RemoteMessage | null) {
  const type = remoteMessage?.data?.type;
  console.log(
    '[push] Notification opened',
    type ? `(type=${String(type)})` : '',
  );
  // Spec: tapping opens the portal start URL.
  openHandler?.();
}

async function requestAndroidPostNotificationsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || typeof Platform.Version !== 'number') {
    return true;
  }
  if (Platform.Version < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensurePermission(): Promise<boolean> {
  const androidOk = await requestAndroidPostNotificationsPermission();
  if (!androidOk) {
    console.warn('[push] Android POST_NOTIFICATIONS denied');
    return false;
  }

  const messaging = getMessaging();
  const authStatus = await requestMessagingPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  console.log('[push] Permission status:', authStatus, 'enabled=', enabled);
  return enabled;
}

function publishToken(token: string) {
  lastToken = token;
  console.log('');
  console.log('========== DEVICE FCM TOKEN ==========');
  console.log(token);
  console.log('======================================');
  console.log(
    '[push] Copy this token to Firebase Console → Messaging → Send test message',
  );
  console.log('');
  tokenListener?.(token);
}

/**
 * Call once at app startup (after React mount).
 * Uses RN Firebase v26+ modular API (no default export).
 */
export async function initPushNotifications(): Promise<string | null> {
  if (initialized) {
    return lastToken;
  }
  initialized = true;

  try {
    const messaging = getMessaging();

    console.log(
      `[push] Android channel expected: "${PUSH_CHANNEL_ID}" (${PUSH_CHANNEL_NAME})`,
    );

    if (Platform.OS === 'ios') {
      await registerDeviceForRemoteMessages(messaging);
    }

    const allowed = await ensurePermission();
    if (!allowed) {
      return null;
    }

    const token = await getToken(messaging);
    if (token) {
      publishToken(token);
    }

    unsubscribers.push(
      onTokenRefresh(messaging, (newToken: string) => {
        publishToken(newToken);
      }),
    );

    unsubscribers.push(
      onMessage(messaging, async (remoteMessage: RemoteMessage) => {
        const title =
          remoteMessage.notification?.title ||
          (remoteMessage.data?.title as string) ||
          'Smart Bus';
        const body =
          remoteMessage.notification?.body ||
          (remoteMessage.data?.body as string) ||
          'You have a new alert';

        console.log('[push] Foreground message:', title, body);

        Alert.alert(title, body, [
          {text: 'Dismiss', style: 'cancel'},
          {
            text: 'Open',
            onPress: () => handleNotificationOpen(remoteMessage),
          },
        ]);
      }),
    );

    unsubscribers.push(
      onNotificationOpenedApp(messaging, (remoteMessage: RemoteMessage) => {
        handleNotificationOpen(remoteMessage);
      }),
    );

    const initial = await getInitialNotification(messaging);
    if (initial) {
      setTimeout(() => handleNotificationOpen(initial), 500);
    }

    return lastToken;
  } catch (error) {
    console.warn('[push] initPushNotifications failed:', error);
    return null;
  }
}

export function teardownPushNotifications() {
  while (unsubscribers.length) {
    const unsub = unsubscribers.pop();
    try {
      unsub?.();
    } catch {
      // ignore
    }
  }
  initialized = false;
}

/**
 * Background/quit handler must be registered in index.js (outside React).
 */
export function registerBackgroundMessageHandler() {
  try {
    const messaging = getMessaging();
    setBackgroundMessageHandler(messaging, async (remoteMessage: RemoteMessage) => {
      console.log('[push] Background message:', remoteMessage?.messageId);
    });
  } catch (error) {
    console.warn('[push] Failed to register background handler:', error);
  }
}
