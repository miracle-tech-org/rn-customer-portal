import {useCallback, useEffect, useRef, useState, type ComponentType} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebViewBase, {type WebViewNavigation} from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';
import {PORTAL_URL} from '../config/portal';

type PortalWebViewProps = {
  url?: string;
};

type WebViewHandle = {
  goBack: () => void;
  reload: () => void;
};

// react-native-webview typings lag React 19 / RN 0.88; cast keeps runtime API intact.
const WebView = WebViewBase as unknown as ComponentType<Record<string, unknown>> & {
  // used only for typing the ref below
};

/**
 * Full-screen WebView that loads the customer portal.
 * Android hardware back navigates within the portal history first.
 */
export function PortalWebView({url = PORTAL_URL}: PortalWebViewProps) {
  const webViewRef = useRef<WebViewHandle | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => subscription.remove();
  }, [canGoBack]);

  const reload = useCallback(() => {
    setErrorMessage(null);
    setLoading(true);
    webViewRef.current?.reload();
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{uri: url}}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => {
          setLoading(true);
          setErrorMessage(null);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent: WebViewErrorEvent) => {
          const {nativeEvent} = syntheticEvent;
          setLoading(false);
          setErrorMessage(nativeEvent.description || 'Failed to load portal');
        }}
        onHttpError={(syntheticEvent: WebViewHttpErrorEvent) => {
          const {nativeEvent} = syntheticEvent;
          if (nativeEvent.statusCode >= 400) {
            setErrorMessage(`Portal error (${nativeEvent.statusCode})`);
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        startInLoadingState
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
      />

      {loading && !errorMessage ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#1B6CA8" />
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Unable to open portal</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reload}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  errorBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1B6CA8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
