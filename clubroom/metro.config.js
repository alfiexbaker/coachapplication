const path = require('path');
const exclusionList = require('@expo/metro/metro-config/defaults/exclusionList').default;
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

const envFilePattern = new RegExp(
  `^${path.resolve(__dirname).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${path.sep.replace('\\', '\\\\')}\\.env(?:\\..*)?$`,
);

config.resolver.blockList = exclusionList([
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  envFilePattern,
]);

module.exports = config;
