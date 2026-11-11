import {useCallback, useEffect, useMemo, useRef, useState, type ComponentType} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebViewBase, {type WebViewNavigation} from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewOpenWindowEvent,
} from 'react-native-webview/lib/WebViewTypes';
import {
  MOBILE_USER_AGENT_ANDROID,
  MOBILE_USER_AGENT_IOS,
  MOBILE_VIEWPORT_SCRIPT,
  PORTAL_URL,
} from '../config/portal';
import {
  openExternalUrl,
  shouldOpenInSystemApp,
} from '../utils/openExternalUrl';

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
 * Intercepts portal links that must leave the WebView:
 * tel: → Phone dialer, mailto: → Mail, sms: → Messages, etc.
 * Also handles window.open() used by portal ads / support actions.
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

  const handleExternalNavigation = useCallback((targetUrl?: string | null) => {
    if (!targetUrl) {
      return false;
    }

    if (!shouldOpenInSystemApp(targetUrl)) {
      return false;
    }

    void openExternalUrl(targetUrl);
    return true;
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      const targetUrl = request.url;

      // Keep main portal http(s) navigations inside the WebView.
      if (!shouldOpenInSystemApp(targetUrl)) {
        return true;
      }

      // tel:, mailto:, sms:, maps, etc. → native apps (Android + iOS)
      void openExternalUrl(targetUrl);
      return false;
    },
    [],
  );

  const onOpenWindow = useCallback(
    (event: WebViewOpenWindowEvent) => {
      const targetUrl = event.nativeEvent.targetUrl;
      if (!targetUrl) {
        return;
      }

      if (shouldOpenInSystemApp(targetUrl)) {
        void openExternalUrl(targetUrl);
        return;
      }

      // Portal ads / external https links opened via window.open(..., '_blank')
      void Linking.openURL(targetUrl).catch(() => {
        // Fallback: load inside the same WebView
        webViewRef.current?.injectJavaScript(
          `window.location.href = ${JSON.stringify(targetUrl)}; true;`,
        );
      });
    },
    [],
  );

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
        contentMode="mobile"
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
        // Required so window.open / target=_blank reach onOpenWindow (Android).
        setSupportMultipleWindows
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onOpenWindow={onOpenWindow}
        onNavigationStateChange={(navState: WebViewNavigation) => {
          handleNavigationStateChange(navState);
          // Extra safety if a tel: navigation slips through on some Android builds.
          if (handleExternalNavigation(navState.url)) {
            webViewRef.current?.goBack();
          }
        }}
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
        startInLoadingState
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        originWhitelist={[
          'http://*',
          'https://*',
          'tel:*',
          'telprompt:*',
          'mailto:*',
          'sms:*',
          'smsto:*',
          'geo:*',
          'maps:*',
          'whatsapp:*',
          'intent:*',
        ]}
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
