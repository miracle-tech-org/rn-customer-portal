/**
 * Customer Portal — React Native WebView wrapper
 * Portrait-only shell that fills the phone screen for the mobile portal.
 *
 * @format
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {AppSplash} from './src/components/AppSplash';
import {PortalWebView, type PortalWebViewHandle} from './src/components/PortalWebView';
import {
  initPushNotifications,
  setPushOpenHandler,
  setPushTokenListener,
  teardownPushNotifications,
} from './src/services/pushNotifications';

const SPLASH_MIN_MS = 1800;

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#022751"
        translucent={false}
      />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const portalRef = useRef<PortalWebViewHandle>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const showSplash = !(portalReady && minTimeDone);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setPushTokenListener(token => {
      setFcmToken(token);
      portalRef.current?.injectFcmToken(token);
    });

    setPushOpenHandler(() => {
      // Spec: notification tap opens portal start URL.
      portalRef.current?.openStartUrl();
    });

    void initPushNotifications();

    return () => {
      setPushTokenListener(null);
      setPushOpenHandler(null);
      teardownPushNotifications();
    };
  }, []);

  const onPortalReady = useCallback(() => {
    setPortalReady(true);
  }, []);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.container,
          {
            // Keep top inset for notch/status bar only.
            // Do NOT pad the bottom — the portal already lays out its own
            // bottom nav edge-to-edge (same as mobile browser).
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}>
        <PortalWebView
          ref={portalRef}
          fcmToken={fcmToken}
          onReady={onPortalReady}
        />
      </View>
      <AppSplash visible={showSplash} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
});

export default App;
