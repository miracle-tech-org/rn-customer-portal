/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-webview', () => {
  const ReactLocal = require('react');
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: ReactLocal.forwardRef((props: object, ref: unknown) => {
      ReactLocal.useImperativeHandle(ref, () => ({
        openStartUrl: jest.fn(),
        injectFcmToken: jest.fn(),
        reload: jest.fn(),
      }));
      return ReactLocal.createElement(View, props);
    }),
  };
});

jest.mock('@react-native-firebase/messaging', () => {
  const messagingInstance = {};
  return {
    __esModule: true,
    AuthorizationStatus: {
      AUTHORIZED: 1,
      PROVISIONAL: 2,
      DENIED: 0,
      NOT_DETERMINED: -1,
    },
    getMessaging: jest.fn(() => messagingInstance),
    getToken: jest.fn(async () => 'test-token'),
    requestPermission: jest.fn(async () => 1),
    registerDeviceForRemoteMessages: jest.fn(async () => undefined),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(async () => null),
    setBackgroundMessageHandler: jest.fn(),
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
