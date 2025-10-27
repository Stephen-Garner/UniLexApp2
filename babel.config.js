module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@app': './app',
          '@ui': './ui',
          '@features': './features',
          '@domain': './domain',
          '@data': './data',
          '@services': './services',
          '@state': './state',
          '@contracts': './contracts',
          '@lib': './lib',
          '@config': './config',
          '@src': './src',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
  ],
};
