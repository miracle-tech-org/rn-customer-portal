import {Alert, PermissionsAndroid, Platform} from 'react-native';
import {PUSH_CHANNEL_ID, PUSH_CHANNEL_NAME} from '../config/push';

export type PushTokenListener = (token: string) => void;
export type PushOpenHandler = () => void;

type RemoteMessage = {
  messageId?: string;
  notification?: {title?: string; body?: string} | null;
  data?: Record<string, string | object | undefined> | null;
};

type MessagingFn = {
  (): {
    requestPermission: () => Promise<number>;
    getToken: () => Promise<string>;
    onTokenRefresh: (listener: (token: string) => void) => () => void;
    onMessage: (
      listener: (message: RemoteMessage) => void | Promise<void>,
    ) => () => void;
    onNotificationOpenedApp: (
      listener: (message: RemoteMessage) => void,
    ) => () => void;
    getInitialNotification: () => Promise<RemoteMessage | null>;
    registerDeviceForRemoteMessages: () => Promise<void>;
    setBackgroundMessageHandler: (
      handler: (message: RemoteMessage) => Promise<void>,
    ) => void;
  };
  AuthorizationStatus: {
    AUTHORIZED: number;
    PROVISIONAL: number;
    DENIED: number;
    NOT_DETERMINED: number;
  };
};

let messagingModule: MessagingFn | null | undefined;
let initialized = false;
let lastToken: string | null = null;
let tokenListener: PushTokenListener | null = null;
let openHandler: PushOpenHandler | null = null;
const unsubscribers: Array<() => void> = [];

function getMessaging(): MessagingFn | null {
  if (messagingModule !== undefined) {
    return messagingModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    messagingModule = require('@react-native-firebase/messaging').default;
  } catch (error) {
    console.warn('[push] Firebase Messaging native module unavailable:', error);
    messagingModule = null;
  }

  return messagingModule ?? null;
}

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
  console.log('[push] Notification opened', type ? `(type=${String(type)})` : '');
  // Spec: tapping should open the app start URL (portal). Handler reloads/focuses WebView.
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

async function requestPermission(): Promise<boolean> {
  const messaging = getMessaging();
  if (!messaging) {
    return false;
  }

  const androidOk = await requestAndroidPostNotificationsPermission();
  if (!androidOk) {
    console.warn('[push] Android POST_NOTIFICATIONS denied');
    return false;
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  console.log('[push] Permission status:', authStatus, 'enabled=', enabled);
  return enabled;
}

function publishToken(token: string) {
  lastToken = token;
  console.log('[push] FCM token:', token);
  tokenListener?.(token);
}

/**
 * Call once at app startup (after React mount).
 */
export async function initPushNotifications(): Promise<string | null> {
  if (initialized) {
    return lastToken;
  }

  const messaging = getMessaging();
  if (!messaging) {
    console.warn(
      '[push] Skipping init — add google-services.json / GoogleService-Info.plist and rebuild.',
    );
    return null;
  }

  initialized = true;

  try {
    console.log(
      `[push] Android channel expected: "${PUSH_CHANNEL_ID}" (${PUSH_CHANNEL_NAME})`,
    );

    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    const allowed = await requestPermission();
    if (!allowed) {
      return null;
    }

    const token = await messaging().getToken();
    if (token) {
      publishToken(token);
    }

    unsubscribers.push(
      messaging().onTokenRefresh((newToken: string) => {
        publishToken(newToken);
      }),
    );

    unsubscribers.push(
      messaging().onMessage(async (remoteMessage: RemoteMessage) => {
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
      messaging().onNotificationOpenedApp((remoteMessage: RemoteMessage) => {
        handleNotificationOpen(remoteMessage);
      }),
    );

    const initial = await messaging().getInitialNotification();
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

export function registerBackgroundMessageHandler() {
  const messaging = getMessaging();
  if (!messaging) {
    return;
  }

  messaging().setBackgroundMessageHandler(async (remoteMessage: RemoteMessage) => {
    console.log('[push] Background message:', remoteMessage?.messageId);
  });
}
