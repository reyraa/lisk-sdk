module.exports = {
//  src: [
//    './src/index.ts',
//  ],
  mode: 'modules',
  exclude: [
        '**/__test__/**/*',
        '**/__node_modules__/**/*',
    ],
  includeDeclarations: true,
  externalPattern: '**/node_modules/**',
  excludeExternals: true,
//  excludeNotExported: true,
  tsconfig: './tsconfig.json',
  out: '../docs/tx-pool',
  ignoreCompilerErrors: true,
  plugin: 'none',
  theme: 'markdown',
};
