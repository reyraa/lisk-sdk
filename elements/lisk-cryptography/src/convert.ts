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
// Required because first level function export
import * as ed2curve from 'ed2curve';
import * as querystring from 'querystring';

// eslint-disable-next-line import/no-cycle
import { EncryptedPassphraseObject } from './encrypt';
import { hash } from './hash';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import reverse = require('buffer-reverse');

export const getFirstEightBytesReversed = (input: string | Buffer): Buffer => {
	const BUFFER_SIZE = 8;
	// Union type arguments on overloaded functions do not work in typescript.
	// Relevant discussion: https://github.com/Microsoft/TypeScript/issues/23155
	if (typeof input === 'string') {
		return reverse(Buffer.from(input).slice(0, BUFFER_SIZE));
	}

	return reverse(Buffer.from(input).slice(0, BUFFER_SIZE));
};

export const getFirstNBytes = (
	input: string | Buffer,
	size: number,
): Buffer => {
	// Union type arguments on overloaded functions do not work in typescript.
	// Relevant discussion: https://github.com/Microsoft/TypeScript/issues/23155
	if (typeof input === 'string') {
		return reverse(Buffer.from(input).slice(0, size));
	}

	return Buffer.from(input).slice(0, size);
};

export const toAddress = (buffer: Buffer): Buffer => {
	const BUFFER_SIZE = 20;
	const truncatedBuffer = getFirstNBytes(buffer, BUFFER_SIZE);

	if (truncatedBuffer.length !== BUFFER_SIZE) {
		throw new Error(
			'The buffer for Lisk addresses must contains exactly 20 bytes',
		);
	}

	return truncatedBuffer;
};

export const getAddressFromPublicKey = (publicKey: string): Buffer =>
	toAddress(hash(publicKey, 'hex'));

export const convertPublicKeyEd2Curve = ed2curve.convertPublicKey;

export const convertPrivateKeyEd2Curve = ed2curve.convertSecretKey;

export const stringifyEncryptedPassphrase = (
	encryptedPassphrase: EncryptedPassphraseObject,
): string => {
	if (typeof encryptedPassphrase !== 'object' || encryptedPassphrase === null) {
		throw new Error('Encrypted passphrase to stringify must be an object.');
	}
	const objectToStringify = encryptedPassphrase.iterations
		? encryptedPassphrase
		: {
				salt: encryptedPassphrase.salt,
				cipherText: encryptedPassphrase.cipherText,
				iv: encryptedPassphrase.iv,
				tag: encryptedPassphrase.tag,
				version: encryptedPassphrase.version,
		  };

	return querystring.stringify(objectToStringify);
};

const parseIterations = (iterationsString?: string): number | undefined => {
	const iterations =
		iterationsString === undefined ? undefined : parseInt(iterationsString, 10);

	if (typeof iterations !== 'undefined' && Number.isNaN(iterations)) {
		throw new Error('Could not parse iterations.');
	}

	return iterations;
};

export const parseEncryptedPassphrase = (
	encryptedPassphrase: string,
): EncryptedPassphraseObject => {
	if (typeof encryptedPassphrase !== 'string') {
		throw new Error('Encrypted passphrase to parse must be a string.');
	}
	const keyValuePairs = querystring.parse(encryptedPassphrase);

	const { iterations, salt, cipherText, iv, tag, version } = keyValuePairs;

	// Review, and find a better solution
	if (
		(typeof iterations !== 'string' && typeof iterations !== 'undefined') ||
		typeof salt !== 'string' ||
		typeof cipherText !== 'string' ||
		typeof iv !== 'string' ||
		typeof tag !== 'string' ||
		typeof version !== 'string'
	) {
		throw new Error(
			'Encrypted passphrase to parse must have only one value per key.',
		);
	}

	return {
		iterations: parseIterations(iterations),
		salt,
		cipherText,
		iv,
		tag,
		version,
	};
};
