module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|@react-native-community|@tanstack/react-query|nanoid|react-native-tts|react-native-fs|react-native-nitro-sound|react-native-nitro-modules)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
