module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Plugin para manejar módulos problemáticos
      [
        'module-resolver',
        {
          alias: {
            tslib: require.resolve('tslib'),
          },
        },
      ],
    ],
  };
};
