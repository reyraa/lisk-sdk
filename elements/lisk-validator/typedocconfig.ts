module.exports = {
  src: [
    './src/validation.ts',
    './src/constants.ts',
    './src/formatter.ts',
  ],
  mode: 'file',
  exclude: [
        '**/__test__/**/*',
        '**/__node_modules__/**/*',
    ],
  includeDeclarations: true,
  externalPattern: '**/node_modules/**',
  excludeExternals: true,
//  excludeNotExported: true,
  tsconfig: './tsconfig.json',
  out: '../../../typedocs/validator',
  ignoreCompilerErrors: true,
  plugin: 'none',
  readme: 'none',
  theme: 'markdown',
};
