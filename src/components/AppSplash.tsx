import {Image, StyleSheet, View} from 'react-native';

const splashSource = require('../../assets/splash.png');

type AppSplashProps = {
  visible: boolean;
};

/**
 * Full-bleed splash that stays up until the portal WebView is ready.
 * Native launch screens alone disappear too quickly (esp. Android 12+).
 */
export function AppSplash({visible}: AppSplashProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="auto">
      <Image source={splashSource} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#022751',
    zIndex: 100,
    elevation: 100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
