module.exports = {
  src: [
    './src/validation.ts',
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
  out: '../../../typedocs/passphrases',
  ignoreCompilerErrors: true,
  plugin: 'none',
  readme: 'none',
  theme: 'markdown',
};
