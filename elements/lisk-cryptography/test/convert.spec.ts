/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import {
	getFirstEightBytesReversed,
	toAddress,
	getAddressFromPublicKey,
	convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve,
	stringifyEncryptedPassphrase,
	parseEncryptedPassphrase,
	getFirstNBytes,
} from '../src/convert';
// Require is used for stubbing
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-var-requires
const hashModule = require('../src/hash');

describe('convert', () => {
	// keys for passphrase 'secret';
	const defaultPrivateKey =
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultPublicKeyHash = Buffer.from(
		'3a971fd02b4a07fc20aad1936d3cb1d263b96e0ffd938625e5c0db1ad8ba2a29',
		'hex',
	);
	const defaultPrivateKeyCurve = Buffer.from(
		'68b211b2c01cc88690ba76a07895a5b4805e1c11fdd3af4c863e6d4efeb14378',
		'hex',
	);
	const defaultPublicKeyCurve = Buffer.from(
		'6f9d780305bda43dd47a291d897f2d8845a06160632d82fb1f209fdd46ed3c1e',
		'hex',
	);
	const defaultStringWithMoreThanEightCharacters = '0123456789';
	const defaultFirstEightCharactersReversed = '76543210';
	const defaultDataForBuffer = 'Hello Lisk SDK - Bring the app to life!';
	const defaultAddress = Buffer.from(
		'3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
		'hex',
	);

	describe('#getFirstEightBytesReversed', () => {
		it('should get the first eight bytes reversed from a Buffer', () => {
			const bufferEntry = Buffer.from(defaultStringWithMoreThanEightCharacters);
			const reversedAndCut = getFirstEightBytesReversed(bufferEntry);
			expect(reversedAndCut).toEqual(
				Buffer.from(defaultFirstEightCharactersReversed),
			);
		});

		it('should get the first eight bytes reversed from a string', () => {
			const reversedAndCut = getFirstEightBytesReversed(
				defaultStringWithMoreThanEightCharacters,
			);
			expect(reversedAndCut).toEqual(
				Buffer.from(defaultFirstEightCharactersReversed),
			);
		});
	});

	describe('#toAddress', () => {
		it('should create address bytes from a buffer of 20 bytes', () => {
			const bufferInit = Buffer.from(defaultDataForBuffer);
			const firstTwentyBytes = getFirstNBytes(bufferInit, 20);
			const address = toAddress(firstTwentyBytes);
			expect(address).toEqual(firstTwentyBytes);
		});

		it('should create truncated address bytes from a buffer of more than 20 bytes ', () => {
			const bufferInit = Buffer.from(defaultDataForBuffer);
			const firstTwentyBytes = getFirstNBytes(bufferInit, 20);
			const address = toAddress(getFirstNBytes(bufferInit, 25));
			expect(address).toEqual(firstTwentyBytes);
		});

		it('should throw on less than 20 bytes as input', () => {
			const bufferExceedError =
				'The buffer for Lisk addresses must contains exactly 20 bytes';
			const bufferInit = Buffer.from(defaultDataForBuffer);
			const firstNineteenBytes = getFirstNBytes(bufferInit, 19);
			expect(toAddress.bind(null, firstNineteenBytes)).toThrow(
				bufferExceedError,
			);
		});
	});

	describe('#getAddressFromPublicKey', () => {
		beforeEach(() => {
			return jest
				.spyOn(hashModule, 'hash')
				.mockReturnValue(defaultPublicKeyHash);
		});

		it('should generate address from publicKey', () => {
			const address = getAddressFromPublicKey(defaultPublicKey);
			expect(address).toEqual(defaultAddress);
		});
	});

	describe('#convertPublicKeyEd2Curve', () => {
		it('should convert publicKey ED25519 to Curve25519 key', () => {
			const result = convertPublicKeyEd2Curve(
				Buffer.from(defaultPublicKey, 'hex'),
			);
			expect(result).not.toBeNull();
			const curveRepresentation = result as Buffer;
			expect(
				defaultPublicKeyCurve.equals(Buffer.from(curveRepresentation)),
			).toBe(true);
		});
	});

	describe('#convertPrivateKeyEd2Curve', () => {
		it('should convert privateKey ED25519 to Curve25519 key', () => {
			const curveRepresentation = convertPrivateKeyEd2Curve(
				Buffer.from(defaultPrivateKey, 'hex'),
			);
			expect(
				defaultPrivateKeyCurve.equals(Buffer.from(curveRepresentation)),
			).toBe(true);
		});
	});

	describe('#stringifyEncryptedPassphrase', () => {
		it('should throw an error if encrypted passphrase is not an object', () => {
			const encryptedPassphrase =
				'salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(
				stringifyEncryptedPassphrase.bind(null, encryptedPassphrase as any),
			).toThrow('Encrypted passphrase to stringify must be an object.');
		});

		it('should format an encrypted passphrase as a string', () => {
			const encryptedPassphrase = {
				salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
				cipherText:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				iv: '1a2206e426c714091b7e48f6',
				tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				version: '1',
			};
			const stringifiedEncryptedPassphrase =
				'salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(stringifyEncryptedPassphrase(encryptedPassphrase)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});

		it('should format an encrypted passphrase with custom iterations as a string', () => {
			const encryptedPassphrase = {
				iterations: 1,
				salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
				cipherText:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				iv: '1a2206e426c714091b7e48f6',
				tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				version: '1',
			};
			const stringifiedEncryptedPassphrase =
				'iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(stringifyEncryptedPassphrase(encryptedPassphrase)).toBe(
				stringifiedEncryptedPassphrase,
			);
		});
	});

	describe('#parseEncryptedPassphrase', () => {
		it('should throw an error if encrypted passphrase is not a string', () => {
			const stringifiedEncryptedPassphrase = { abc: 'def' };
			expect(
				parseEncryptedPassphrase.bind(
					null,
					stringifiedEncryptedPassphrase as any,
				),
			).toThrow('Encrypted passphrase to parse must be a string.');
		});

		it('should throw an error if iterations is present but not a valid number', () => {
			const stringifiedEncryptedPassphrase =
				'iterations=null&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(
				parseEncryptedPassphrase.bind(null, stringifiedEncryptedPassphrase),
			).toThrow('Could not parse iterations.');
		});

		it('should throw an error if multiple values are in a key', () => {
			const stringifiedEncryptedPassphrase =
				'salt=xxx&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			expect(
				parseEncryptedPassphrase.bind(null, stringifiedEncryptedPassphrase),
			).toThrow(
				'Encrypted passphrase to parse must have only one value per key.',
			);
		});

		it('should parse an encrypted passphrase string', () => {
			const stringifiedEncryptedPassphrase =
				'salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			const encryptedPassphrase = {
				iterations: undefined,
				salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
				cipherText:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				iv: '1a2206e426c714091b7e48f6',
				tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				version: '1',
			};
			expect(parseEncryptedPassphrase(stringifiedEncryptedPassphrase)).toEqual(
				encryptedPassphrase,
			);
		});

		it('should parse an encrypted passphrase string with custom iterations', () => {
			const stringifiedEncryptedPassphrase =
				'iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1';
			const encryptedPassphrase = {
				iterations: 1,
				salt: 'e8c7dae4c893e458e0ebb8bff9a36d84',
				cipherText:
					'c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333',
				iv: '1a2206e426c714091b7e48f6',
				tag: '3a9d9f9f9a92c9a58296b8df64820c15',
				version: '1',
			};
			expect(parseEncryptedPassphrase(stringifiedEncryptedPassphrase)).toEqual(
				encryptedPassphrase,
			);
		});
	});
});
