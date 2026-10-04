// Expo SDK 52+ монорепо (pnpm workspace)-г автоматаар таньдаг: watchFolders + nodeModulesPaths.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
module.exports = config;
