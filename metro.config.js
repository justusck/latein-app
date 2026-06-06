const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure SVG files are treated as assets (copied verbatim into the bundle),
// not as source code. We load them at runtime with expo-asset + expo-file-system.
if (!config.resolver.assetExts.includes('svg')) {
  config.resolver.assetExts.push('svg');
}

module.exports = config;
