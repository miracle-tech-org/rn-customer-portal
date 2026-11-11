/**
 * Ensures Android SDK env, then runs `react-native run-android`
 * with platform-tools on PATH for this session.
 */
const path = require('path');
const {spawnSync} = require('child_process');

// Side-effect: validates SDK, writes local.properties, updates process.env.PATH
require('./ensure-android-env');

const cliArgs = process.argv.slice(2);
const result = spawnSync(
  'npx',
  ['react-native', 'run-android', ...cliArgs],
  {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  },
);

process.exit(result.status === null ? 1 : result.status);
