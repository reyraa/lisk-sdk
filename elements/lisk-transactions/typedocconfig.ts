module.exports = {
  src: [
    './src/index.ts',
    './src/0_transfer.ts',
    './src/1_register_second_passphrase.ts',
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
  out: '../../../typedocs/transactions',
  ignoreCompilerErrors: true,
  plugin: 'none',
  readme: 'none',
  theme: 'markdown',
};
