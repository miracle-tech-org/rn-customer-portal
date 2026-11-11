import {useCallback, useEffect, useMemo, useRef, useState, type ComponentType} from 'react';
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
import {
  MOBILE_USER_AGENT_ANDROID,
  MOBILE_USER_AGENT_IOS,
  MOBILE_VIEWPORT_SCRIPT,
  PORTAL_URL,
} from '../config/portal';

type PortalWebViewProps = {
  url?: string;
};

type WebViewHandle = {
  goBack: () => void;
  reload: () => void;
  injectJavaScript: (script: string) => void;
};

// react-native-webview typings lag React 19 / RN 0.88; cast keeps runtime API intact.
const WebView = WebViewBase as unknown as ComponentType<Record<string, unknown>>;

/**
 * Full-screen portrait WebView tuned for the mobile-only portal layout.
 */
export function PortalWebView({url = PORTAL_URL}: PortalWebViewProps) {
  const webViewRef = useRef<WebViewHandle | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userAgent = useMemo(
    () =>
      Platform.OS === 'ios' ? MOBILE_USER_AGENT_IOS : MOBILE_USER_AGENT_ANDROID,
    [],
  );

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

  const applyMobileFit = useCallback(() => {
    webViewRef.current?.injectJavaScript(MOBILE_VIEWPORT_SCRIPT);
  }, []);

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
        userAgent={userAgent}
        applicationNameForUserAgent="CustomerPortalApp"
        // iOS: prefer mobile content mode so pages don't render as desktop.
        contentMode="mobile"
        // Keep scale locked to the phone width (mobile site fit).
        scalesPageToFit={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        bounces={false}
        overScrollMode="never"
        scrollEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        allowsFullscreenVideo={false}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => {
          setLoading(true);
          setErrorMessage(null);
        }}
        onLoadEnd={() => {
          setLoading(false);
          applyMobileFit();
        }}
        onLoadProgress={({nativeEvent}: {nativeEvent: {progress: number}}) => {
          if (nativeEvent.progress > 0.7) {
            applyMobileFit();
          }
        }}
        injectedJavaScript={MOBILE_VIEWPORT_SCRIPT}
        injectedJavaScriptBeforeContentLoaded={MOBILE_VIEWPORT_SCRIPT}
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
    width: '100%',
    backgroundColor: '#FFFFFF',
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
