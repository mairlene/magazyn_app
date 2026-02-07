// Minimal ESLint flat config (v9+) entrypoint.
// This config avoids using external plugin "extends" so ESLint can run
// without installing additional plugins. You can later enhance it by
// installing plugins and expanding the config.
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'client/build/**',
      'client/node_modules/**',
      'server/node_modules/**',
      'server/generated/**',
      'server/_deprecated/**',
      'client/_deprecated_backups/**',
      'client/src/components/_deprecated/**',
      'client/magazyn-app/**',
      'build/**',
      'public/**',
      '.cache/**'
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    }
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    // load plugins so rules like react-hooks/exhaustive-deps are available
    plugins: {
      react: require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks')
    },
    rules: {
      // warn on console usage except console.error / console.warn
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // react hooks rule to catch missing deps
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
  ,
  // allow console.* in scripts and tools (CLI helpers)
  {
    files: ['server/scripts/**', 'scripts/**', 'client/tools/**'],
    rules: {
      'no-console': 'off'
    }
  }
];
