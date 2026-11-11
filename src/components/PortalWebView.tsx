import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
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
import {buildDeviceInfo, buildFcmBridgeScript} from '../config/push';
import {
  openExternalUrl,
  shouldOpenInSystemApp,
} from '../utils/openExternalUrl';

type PortalWebViewProps = {
  url?: string;
  /** Latest FCM token from native Firebase Messaging */
  fcmToken?: string | null;
};

type WebViewHandle = {
  goBack: () => void;
  reload: () => void;
  injectJavaScript: (script: string) => void;
};

export type PortalWebViewHandle = {
  /** Ensure portal start URL is showing (notification tap). */
  openStartUrl: () => void;
  injectFcmToken: (token: string) => void;
  reload: () => void;
};

const WebView = WebViewBase as unknown as ComponentType<Record<string, unknown>>;

/**
 * Portal WebView with:
 * - tel/mailto/external link handling
 * - FCM token bridge → portal sbtsSetFcmToken (session cookie registration)
 */
export const PortalWebView = forwardRef<PortalWebViewHandle, PortalWebViewProps>(
  function PortalWebView({url = PORTAL_URL, fcmToken = null}, ref) {
    const webViewRef = useRef<WebViewHandle | null>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [sourceUrl, setSourceUrl] = useState(url);

    const userAgent = useMemo(
      () =>
        Platform.OS === 'ios'
          ? MOBILE_USER_AGENT_IOS
          : MOBILE_USER_AGENT_ANDROID,
      [],
    );

    const injectFcmToken = useCallback((token: string) => {
      if (!token) {
        return;
      }
      webViewRef.current?.injectJavaScript(
        buildFcmBridgeScript(token, buildDeviceInfo()),
      );
    }, []);

    const openStartUrl = useCallback(() => {
      setSourceUrl(PORTAL_URL);
      // Force navigation even if already on start URL.
      webViewRef.current?.injectJavaScript(
        `window.location.href = ${JSON.stringify(PORTAL_URL)}; true;`,
      );
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        openStartUrl,
        injectFcmToken,
        reload: () => webViewRef.current?.reload(),
      }),
      [injectFcmToken, openStartUrl],
    );

    useEffect(() => {
      if (fcmToken) {
        injectFcmToken(fcmToken);
      }
    }, [fcmToken, injectFcmToken]);

    const applyMobileFit = useCallback(() => {
      webViewRef.current?.injectJavaScript(MOBILE_VIEWPORT_SCRIPT);
    }, []);

    const afterPageReady = useCallback(() => {
      applyMobileFit();
      if (fcmToken) {
        injectFcmToken(fcmToken);
      }
    }, [applyMobileFit, fcmToken, injectFcmToken]);

    const handleNavigationStateChange = useCallback(
      (navState: WebViewNavigation) => {
        setCanGoBack(navState.canGoBack);
        // Re-register after login redirects (session cookie now available).
        if (fcmToken && /pmobile|tmobile|dmobile|smobile|app\.php/i.test(navState.url)) {
          injectFcmToken(fcmToken);
        }
      },
      [fcmToken, injectFcmToken],
    );

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
        if (!shouldOpenInSystemApp(targetUrl)) {
          return true;
        }
        void openExternalUrl(targetUrl);
        return false;
      },
      [],
    );

    const onOpenWindow = useCallback((event: WebViewOpenWindowEvent) => {
      const targetUrl = event.nativeEvent.targetUrl;
      if (!targetUrl) {
        return;
      }
      if (shouldOpenInSystemApp(targetUrl)) {
        void openExternalUrl(targetUrl);
        return;
      }
      void Linking.openURL(targetUrl).catch(() => {
        webViewRef.current?.injectJavaScript(
          `window.location.href = ${JSON.stringify(targetUrl)}; true;`,
        );
      });
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

    const beforeLoadScript = useMemo(() => {
      const parts = [MOBILE_VIEWPORT_SCRIPT];
      if (fcmToken) {
        parts.push(buildFcmBridgeScript(fcmToken, buildDeviceInfo()));
      }
      return parts.join('\n');
    }, [fcmToken]);

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{uri: sourceUrl}}
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
          setSupportMultipleWindows
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onOpenWindow={onOpenWindow}
          onNavigationStateChange={(navState: WebViewNavigation) => {
            handleNavigationStateChange(navState);
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
            afterPageReady();
          }}
          onLoadProgress={({nativeEvent}: {nativeEvent: {progress: number}}) => {
            if (nativeEvent.progress > 0.7) {
              afterPageReady();
            }
          }}
          injectedJavaScript={beforeLoadScript}
          injectedJavaScriptBeforeContentLoaded={beforeLoadScript}
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
  },
);

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
