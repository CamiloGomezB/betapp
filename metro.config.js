const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración para resolver tslib
config.resolver.alias = {
  ...config.resolver.alias,
  tslib: require.resolve('tslib'),
};

// Configuración para manejar módulos problemáticos
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;