module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
	plugins: ['@typescript-eslint'],
	extends: [
		'lisk-base/base',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/all',
		'prettier/@typescript-eslint',
		'plugin:import/errors',
		'plugin:import/warnings',
		'plugin:import/typescript',
	],
	rules: {
		'max-len': 'off',
		'no-underscore-dangle': 'off',
		'implicit-arrow-linebreak': 'off',
		'no-mixed-spaces-and-tabs': 'off',
		'operator-linebreak': 'off',
		'@typescript-eslint/no-throw-literal': 'off',
		'@typescript-eslint/no-dynamic-delete': 'off',
		'@typescript-eslint/no-implied-eval': 'off',
		'@typescript-eslint/strict-boolean-expressions': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars-experimental': 'off',
		'import/extensions': [
			'error',
			'ignorePackages',
			{
				js: 'never',
				ts: 'never',
			},
		],
	},
	globals: {
		BigInt: true,
	},
};
