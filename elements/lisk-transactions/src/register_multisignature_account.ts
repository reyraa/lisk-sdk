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
	isValidInteger,
	validateKeysgroup,
	validateNetworkIdentifier,
} from '@liskhq/lisk-validator';

import { MultisignatureTransaction } from './12_multisignature_transaction';
import {
	MULTISIGNATURE_FEE,
	MULTISIGNATURE_MAX_KEYSGROUP,
	MULTISIGNATURE_MAX_LIFETIME,
	MULTISIGNATURE_MIN_KEYSGROUP,
	MULTISIGNATURE_MIN_LIFETIME,
} from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction, prependPlusToPublicKeys } from './utils';
/**
 * ### Description
 * A list of all available input parameters to create a [[MultisignatureTransaction |multisignature transaction]], using the [[registerMultisignature | registerMultisignature()]] function.
 *
 * @category Transactions
 */
export interface RegisterMultisignatureInputs {
	/** todo */
	readonly keysgroup: ReadonlyArray<string>;
	/** todo */
	readonly lifetime: number;
	/** todo */
	readonly minimum: number;
	/** todo */
	readonly passphrase?: string;
	/** todo */
	readonly secondPassphrase?: string;
	/** todo */
	readonly timeOffset?: number;
	/** todo */
	readonly networkIdentifier: string;
}

const validateInputs = ({
	keysgroup,
	lifetime,
	minimum,
	networkIdentifier,
}: RegisterMultisignatureInputs): void => {
	if (
		!isValidInteger(lifetime) ||
		lifetime < MULTISIGNATURE_MIN_LIFETIME ||
		lifetime > MULTISIGNATURE_MAX_LIFETIME
	) {
		throw new Error(
			`Please provide a valid lifetime value. Expected integer between ${MULTISIGNATURE_MIN_LIFETIME} and ${MULTISIGNATURE_MAX_LIFETIME}.`,
		);
	}

	if (
		!isValidInteger(minimum) ||
		minimum < MULTISIGNATURE_MIN_KEYSGROUP ||
		minimum > MULTISIGNATURE_MAX_KEYSGROUP
	) {
		throw new Error(
			`Please provide a valid minimum value. Expected integer between ${MULTISIGNATURE_MIN_KEYSGROUP} and ${MULTISIGNATURE_MAX_KEYSGROUP}.`,
		);
	}

	if (keysgroup.length < minimum) {
		throw new Error(
			'Minimum number of signatures is larger than the number of keys in the keysgroup.',
		);
	}

	validateKeysgroup(
		keysgroup,
		MULTISIGNATURE_MIN_KEYSGROUP,
		MULTISIGNATURE_MAX_KEYSGROUP,
	);

	validateNetworkIdentifier(networkIdentifier);
};
/**
 *
 * ### Description
 * This creates a register multisignature account (type 12) transaction.
 *
 * ### Example
 * ```javascript
 * import * as transactions from '@liskhq/lisk-transactions';
 *
 * transactions.registerMultisignature({
 *    keysgroup: [
 *        '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
 *        '141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
 *        '3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
 *    ],
 *    lifetime: 34,
 *    minimum: 2,
 *    networkIdentifier: '7158c297294a540bc9ac6e474529c3da38d03ece056e3fa2d98141e6ec54132d'
 * });
 * ```
 *
 * ### Result
 * ```javascript
 * {
 *  senderPublicKey: undefined,
 *  timestamp: 117413270,
 *  type: 12,
 *  fee: '2000000000',
 *  asset: {
 *    min: 2,
 *    lifetime: 34,
 *    keysgroup: [
 *      '+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
 *      '+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
 *      '+3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135'
 *    ]
 *  },
 *  networkIdentifier: '7158c297294a540bc9ac6e474529c3da38d03ece056e3fa2d98141e6ec54132d'
 * }
 * ```
 * @param inputs All available input params are described in the [[RegisterMultisignatureInputs |RegisterMultisignatureInputs interface]].
 * @returns A register multisignature transaction object.
 * @category Transactions
 */
export const registerMultisignature = (
	inputs: RegisterMultisignatureInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const {
		keysgroup,
		lifetime,
		minimum,
		passphrase,
		secondPassphrase,
		networkIdentifier,
	} = inputs;

	const plusPrependedKeysgroup = prependPlusToPublicKeys(keysgroup);
	const keygroupFees = plusPrependedKeysgroup.length + 1;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 12,
		fee: (MULTISIGNATURE_FEE * keygroupFees).toString(),
		asset: {
			min: minimum,
			lifetime,
			keysgroup: plusPrependedKeysgroup,
		},
		networkIdentifier,
	};

	if (!passphrase) {
		return transaction;
	}

	const multisignatureTransaction = new MultisignatureTransaction(transaction);
	multisignatureTransaction.sign(passphrase, secondPassphrase);

	return multisignatureTransaction.toJSON();
};
