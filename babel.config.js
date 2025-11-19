module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@/app': './src/app',
          '@/features': './src/features',
          '@/shared': './src/shared',
          '@/core': './src/core',
          '@/data': './src/data',
          '@/tests': './tests',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
  ],
};
