const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((e) => e !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Disable symbolication to prevent InternalBytecode.js errors
config.symbolicator = { customizeFrame: () => null };

module.exports = withNativeWind(config, { input: 'global.css' });
