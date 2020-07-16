module.exports = {
//  src: [
//    './src/index.ts',
//  ],
  mode: 'file',
//  exclude: [
//        '**/__test__/**/*',
//        '**/__node_modules__/**/*',
//    ],
  entryPoint: './src/index.ts',
  includeDeclarations: true,
  externalPattern: '**/node_modules/**',
  excludeExternals: true,
//  excludeNotExported: true,
  tsconfig: './tsconfig.json',
  out: '../../../typedocs/transactions',
  ignoreCompilerErrors: true,
  plugin: 'none',
  theme: 'markdown',
};
