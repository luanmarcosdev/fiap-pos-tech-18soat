const js = require('@eslint/js');
const globals = require('globals');
const boundaries = require('eslint-plugin-boundaries');

module.exports = [
  {
    ignores: ['node_modules/', 'coverage/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ['src/**/*.js'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*.js'],
      'boundaries/dependency-nodes': ['require', 'import'],
      'boundaries/elements': [
        { type: 'feature', pattern: 'src/features/*', mode: 'folder', capture: ['featureName'] },
        { type: 'infra', pattern: 'src/infra/*', mode: 'folder' },
        { type: 'app', pattern: 'src/*.js', mode: 'file' },
      ],
    },
    rules: {
      // Quem pode depender de quem
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app', allow: ['feature', 'infra', 'app'] },
            // 'app' liberado para os testes de integração importarem o app.js
            { from: 'feature', allow: ['feature', 'infra', 'app'] },
            { from: 'infra', allow: ['infra'] },
          ],
        },
      ],
      // Outros slices só podem ser importados pelo index.js
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            { target: ['feature'], allow: 'index.js' },
            { target: ['infra', 'app'], allow: '**' },
          ],
        },
      ],
    },
  },
];
