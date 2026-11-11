/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {registerBackgroundMessageHandler} from './src/services/pushNotifications';

// Must be registered outside of React component tree (Android background/quit).
registerBackgroundMessageHandler();

AppRegistry.registerComponent(appName, () => App);
