module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended'
  ],
  plugins: ['react', 'jsx-a11y'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    // stylistic choices -- Prettier handles formatting
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'react/prop-types': 'off'
  }
};
