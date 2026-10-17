const js = require('@eslint/js');
const globals = require('globals');
const boundaries = require('eslint-plugin-boundaries');

const sameFeature = (type) => [type, { featureName: '${from.featureName}' }];

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
    files: ['tests/**/*.js'],
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
        // Camadas dentro de cada slice
        { type: 'feature-index', pattern: 'src/features/*/index.js', mode: 'file', capture: ['featureName'] },
        { type: 'domain', pattern: 'src/features/*/domain', mode: 'folder', capture: ['featureName'] },
        { type: 'application', pattern: 'src/features/*/application', mode: 'folder', capture: ['featureName'] },
        { type: 'feature-infra', pattern: 'src/features/*/infra', mode: 'folder', capture: ['featureName'] },
        { type: 'http', pattern: 'src/features/*/http', mode: 'folder', capture: ['featureName'] },
        // Código compartilhado
        { type: 'shared', pattern: 'src/shared', mode: 'folder' },
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
            { from: 'app', allow: ['feature-index', 'infra', 'shared', 'app'] },
            // composition root: monta as camadas do próprio slice e consome a API pública de outros slices
            {
              from: 'feature-index',
              allow: [
                sameFeature('domain'),
                sameFeature('application'),
                sameFeature('feature-infra'),
                sameFeature('http'),
                'feature-index',
                'infra',
                'shared',
              ],
            },
            { from: 'domain', allow: [sameFeature('domain'), 'shared'] },
            // application recebe infra por injeção (factory), nunca importa
            { from: 'application', allow: [sameFeature('application'), sameFeature('domain'), 'shared'] },
            { from: 'feature-infra', allow: [sameFeature('feature-infra'), sameFeature('domain'), 'infra', 'shared'] },
            { from: 'http', allow: [sameFeature('http'), sameFeature('domain'), 'infra', 'shared'] },
            { from: 'shared', allow: ['shared'] },
            { from: 'infra', allow: ['infra', 'shared'] },
          ],
        },
      ],
      // Outros slices só podem ser importados pelo index.js
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            { target: ['feature-index'], allow: 'index.js' },
            { target: ['domain', 'application', 'feature-infra', 'http', 'shared', 'infra', 'app'], allow: '**' },
          ],
        },
      ],
      // domain e application são JS puro: sem express, sequelize, zod...
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          rules: [{ from: ['domain', 'application'], disallow: ['*'] }],
        },
      ],
    },
  },
];
