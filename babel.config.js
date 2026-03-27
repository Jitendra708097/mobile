/**
 * Babel configuration for AttendEase Expo app.
 *
 * PLUGIN ORDER IS IMPORTANT:
 *  1. babel-preset-expo  — base Expo/React Native transformations
 *  2. react-native-reanimated/plugin — must be LAST; worklets for Reanimated 4.x
 *     are bundled inside reanimated itself (react-native-worklets is a peer
 *     dep declared in package.json but has NO separate Babel plugin).
 *
 * DO NOT add 'react-native-worklets-core/plugin' here — that package is not
 * installed and was the source of the expo-doctor babel-config warning.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated plugin must always be last
      'react-native-reanimated/plugin',
    ],
  };
};