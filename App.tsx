/**
 * Customer Portal — React Native WebView wrapper
 * Portrait-only shell that fills the phone screen for the mobile portal.
 *
 * @format
 */

import {StatusBar, StyleSheet, View} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {PortalWebView} from './src/components/PortalWebView';

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

  // Keep the WebView in the usable portrait area (below notch / above home bar)
  // so the mobile portal width matches a normal phone browser viewport.
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
      <PortalWebView />
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
