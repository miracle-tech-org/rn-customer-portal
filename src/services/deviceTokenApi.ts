import {
  buildDeviceInfo,
  DEFAULT_USER_TYPE,
  FCM_REGISTER_URL,
  type PortalUserType,
} from '../config/push';

export type RegisterDeviceResult = {
  ok: boolean;
  status: number;
  message: string;
  needsSession: boolean;
};

export type RegisterDevicePayload = {
  fcmToken: string;
  userType?: PortalUserType;
  /** Required for driver/helper when not using a session cookie. */
  busToken?: string;
  deviceInfo?: string;
  /** Optional raw Cookie header if calling outside WebView (rare). */
  cookie?: string;
};

/**
 * Direct HTTP register against fcm_register.php.
 * For parent/teacher/staff this usually fails without PHPSESSID —
 * prefer WebView `sbtsSetFcmToken(token)` which sends the session cookie.
 * Useful for driver/helper with bus_token, or debugging.
 */
export async function registerDeviceTokenHttp(
  payload: RegisterDevicePayload,
): Promise<RegisterDeviceResult> {
  const body = {
    user_type: payload.userType || DEFAULT_USER_TYPE,
    fcm_token: payload.fcmToken,
    device_info: payload.deviceInfo || buildDeviceInfo(),
    ...(payload.busToken ? {bus_token: payload.busToken} : {}),
  };

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (payload.cookie) {
    headers.Cookie = payload.cookie;
  }

  try {
    const response = await fetch(FCM_REGISTER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json: {success?: boolean; message?: string} | null = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    const message = json?.message || text || response.statusText || 'No response';
    const needsSession = /login required/i.test(message);

    return {
      ok: json?.success === true,
      status: response.status,
      message,
      needsSession,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : 'Network error',
      needsSession: false,
    };
  }
}
