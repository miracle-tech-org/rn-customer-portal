import {Alert, Linking, Platform} from 'react-native';

/**
 * Native URL schemes the portal may open (phone, email, maps, etc.).
 * These must leave the WebView and open the matching system app.
 */
const EXTERNAL_SCHEMES = [
  'tel:',
  'telprompt:',
  'mailto:',
  'sms:',
  'smsto:',
  'mms:',
  'mmsto:',
  'geo:',
  'maps:',
  'map:',
  'whatsapp:',
  'intent:',
  'market:',
  'itms:',
  'itms-apps:',
  'googlegmail:',
  'facetime:',
  'facetime-audio:',
] as const;

export function isExternalAppUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (EXTERNAL_SCHEMES.some(scheme => normalized.startsWith(scheme))) {
    return true;
  }

  // Android intent:// URLs and Google Maps / Apple Maps http deep-links
  if (normalized.startsWith('intent:')) {
    return true;
  }

  return false;
}

/**
 * Portal http(s) pages stay inside the WebView.
 * Everything else (tel, mailto, store links, custom schemes) opens natively.
 */
export function shouldOpenInSystemApp(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized || normalized === 'about:blank') {
    return false;
  }

  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('about:') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:') ||
    normalized.startsWith('file:')
  ) {
    return false;
  }

  return true;
}

function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();

  // intent://...#Intent;scheme=tel;... end with scheme fallback sometimes
  if (trimmed.toLowerCase().startsWith('intent:')) {
    const schemeMatch = trimmed.match(/[;?]scheme=([^;]+)/i);
    const numberMatch = trimmed.match(/^intent:([^#]+)/i);
    if (schemeMatch?.[1] && numberMatch?.[1]) {
      return `${schemeMatch[1]}:${numberMatch[1]}`;
    }
  }

  return trimmed;
}

export async function openExternalUrl(url: string): Promise<boolean> {
  const target = normalizeExternalUrl(url);

  try {
    const canOpen = await Linking.canOpenURL(target);
    if (!canOpen && Platform.OS === 'ios') {
      // iOS canOpenURL may return false without LSApplicationQueriesSchemes;
      // still attempt open for tel/mailto which the system handles.
      if (!isExternalAppUrl(target) && !shouldOpenInSystemApp(target)) {
        return false;
      }
    }

    await Linking.openURL(target);
    return true;
  } catch (error) {
    console.warn('[openExternalUrl] Failed to open', target, error);
    Alert.alert(
      'Unable to open',
      'This link could not be opened on your device.',
    );
    return false;
  }
}
