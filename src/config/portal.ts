/**
 * Customer portal configuration.
 * Update PORTAL_URL when switching between staging and production.
 */
export const PORTAL_URL = 'https://sbtspro.velonav.in/mobile/app.php';

export const APP_DISPLAY_NAME = 'SBTS Pro';

/**
 * Force a phone user-agent so the portal always serves its mobile layout
 * inside the WebView (never a desktop / wide layout).
 */
export const MOBILE_USER_AGENT_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export const MOBILE_USER_AGENT_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/**
 * Ensures the portal uses a mobile viewport and fills the WebView width.
 */
export const MOBILE_VIEWPORT_SCRIPT = `
(function() {
  var content = 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover';
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);

  var style = document.getElementById('rn-portal-fit');
  if (!style) {
    style = document.createElement('style');
    style.id = 'rn-portal-fit';
    style.type = 'text/css';
    document.head.appendChild(style);
  }
  style.textContent = [
    'html, body {',
    '  width: 100% !important;',
    '  max-width: 100% !important;',
    '  margin: 0 !important;',
    '  padding: 0 !important;',
    '  overflow-x: hidden !important;',
    '  -webkit-text-size-adjust: 100%;',
    '  text-size-adjust: 100%;',
    '}',
    'body {',
    '  min-height: 100%;',
    '}',
    'img, video, iframe, table {',
    '  max-width: 100% !important;',
    '  height: auto !important;',
    '}',
  ].join('\\n');

  true;
})();
`;

/**
 * Navigate the Smart Bus portal SPA to a screen from a push deep link.
 * Portal uses go('notif') for the Alerts / Notifications tab.
 */
export function buildPortalDeepLinkScript(deepLink: string): string {
  const normalized = String(deepLink || 'alerts').toLowerCase();
  const screen =
    normalized === 'alerts' ||
    normalized === 'notif' ||
    normalized === 'notifications'
      ? 'notif'
      : normalized === 'support' || normalized === 'msgs' || normalized === 'messages'
        ? 'msgs'
        : normalized === 'track' || normalized === 'live'
          ? 'track'
          : normalized === 'home'
            ? 'home'
            : 'notif';

  return `
(function() {
  try {
    if (typeof go === 'function') {
      go(${JSON.stringify(screen)});
    } else if (typeof loadInbox === 'function') {
      loadInbox();
    }
  } catch (e) {}
  true;
})();
`;
}
