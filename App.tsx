/**
 * Customer Portal — React Native WebView wrapper
 * Portrait-only shell that fills the phone screen for the mobile portal.
 *
 * @format
 */

import {useEffect, useRef, useState} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {PortalWebView, type PortalWebViewHandle} from './src/components/PortalWebView';
import {
  initPushNotifications,
  setPushOpenHandler,
  setPushTokenListener,
  teardownPushNotifications,
} from './src/services/pushNotifications';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const portalRef = useRef<PortalWebViewHandle>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

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

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <PortalWebView ref={portalRef} fcmToken={fcmToken} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
});

export default App;
