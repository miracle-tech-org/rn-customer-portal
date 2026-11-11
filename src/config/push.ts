import {Platform} from 'react-native';
import {APP_DISPLAY_NAME} from './portal';

/**
 * Must match backend FCM android.notification.channel_id = "sbts_alerts"
 */
export const PUSH_CHANNEL_ID = 'sbts_alerts';
export const PUSH_CHANNEL_NAME = 'SBTS Alerts';
export const PUSH_CHANNEL_DESCRIPTION =
  'Smart Bus trip, alert, and message notifications';

/** Official device-token registration endpoint */
export const FCM_REGISTER_URL =
  'https://sbtspro.velonav.in/api/fcm_register.php';

export type PortalUserType =
  | 'parent'
  | 'teacher'
  | 'driver'
  | 'helper'
  | 'transport'
  | 'school';

/** Default role for this customer portal wrapper (parent login flow). */
export const DEFAULT_USER_TYPE: PortalUserType = 'parent';

/**
 * Short device label sent as device_info (max ~100 chars on API).
 * Example: "android Samsung app 1.0"
 */
export function buildDeviceInfo(appVersion = '1.0'): string {
  const os = Platform.OS === 'ios' ? 'ios' : 'android';
  return `${os} ${APP_DISPLAY_NAME} app ${appVersion}`.slice(0, 100);
}

/**
 * Injected into the portal WebView so SBTSPush / sbtsSetFcmToken can register
 * the token with the PHP session cookie after login.
 */
export function buildFcmBridgeScript(token: string, deviceInfo: string): string {
  const safeToken = JSON.stringify(token);
  const safeInfo = JSON.stringify(deviceInfo);

  return `
(function() {
  var token = ${safeToken};
  var deviceInfo = ${safeInfo};
  if (!token) { true; return; }

  window.__RN_FCM_TOKEN__ = token;
  window.__RN_DEVICE_INFO__ = deviceInfo;
  try {
    console.log('[SBTS][push] Device FCM token:', token);
    console.log('[SBTS][push] device_info:', deviceInfo);
  } catch (e) {}

  // Android bridge expected by SBTSPush.init
  window.Android = window.Android || {};
  window.Android.getFcmToken = function() { return window.__RN_FCM_TOKEN__ || ''; };

  // iOS-style bridge expected by SBTSPush.init
  window.webkit = window.webkit || {};
  window.webkit.messageHandlers = window.webkit.messageHandlers || {};
  window.webkit.messageHandlers.sbtsFcm = {
    postMessage: function(msg) {
      if (String(msg) === 'getToken' && window.__RN_FCM_TOKEN__) {
        if (typeof window.sbtsSetFcmToken === 'function') {
          window.sbtsSetFcmToken(window.__RN_FCM_TOKEN__);
        }
      }
    }
  };

  function register() {
    try {
      if (typeof window.sbtsSetFcmToken === 'function') {
        window.sbtsSetFcmToken(token);
        return true;
      }
    } catch (e) {}
    return false;
  }

  if (!register()) {
    var tries = 0;
    var timer = setInterval(function() {
      tries += 1;
      if (register() || tries > 40) {
        clearInterval(timer);
      }
    }, 1500);
  }

  true;
})();
`;
}
