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
import { getKeys } from '@liskhq/lisk-cryptography';
import { validateNetworkIdentifier } from '@liskhq/lisk-validator';

import { SecondSignatureTransaction } from './9_second_signature_transaction';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';
/**
 * #### Description
 * A list of all available input parameters to create a [[SecondSignatureTransaction |second signature transaction]], using the [[registerSecondPassphrase | registerSecondPassphrase()]] function.
 *
 */
export interface SecondPassphraseInputs {
	/** todo */
	readonly passphrase?: string;
	/** todo */
	readonly secondPassphrase: string;
	/** todo */
	readonly timeOffset?: number;
	/** todo */
	readonly networkIdentifier: string;
}

const validateInputs = ({
	secondPassphrase,
	networkIdentifier,
}: {
	readonly secondPassphrase: string;
	readonly networkIdentifier: string;
}): void => {
	if (typeof secondPassphrase !== 'string') {
		throw new Error('Please provide a secondPassphrase. Expected string.');
	}

	validateNetworkIdentifier(networkIdentifier);
};
/**
 * #### Description
 * This creates a register second passphrase, (type 9) transaction and returns it as a [[TransactionJSON]].
 *
 * As an alternative to this function, it is possible to create a second passphrase transaction by initializing the [[SecondSignatureTransaction]] class.
 *
 * #### Example
 * ```javascript
 * import * as transactions from '@liskhq/lisk-transactions';
 *
 * transactions.registerSecondPassphrase({
 *    networkIdentifier: '7158c297294a540bc9ac6e474529c3da38d03ece056e3fa2d98141e6ec54132d',
 *    passphrase:'one two three',
 *    secondPassphrase:'four five six'
 * });
 * ```
 *
 * @param inputs All available input params are described in the [[SecondPassphraseInputs |SecondPassphraseInputs interface]].
 * @returns A second passphrase transaction object.
 * ##### Result
 * ```javascript
 * {
 *    id: '13923958554840193683',
 *    blockId: undefined,
 *    height: undefined,
 *    confirmations: undefined,
 *    type: 9,
 *    timestamp: 117411517,
 *    senderPublicKey: 'ff61f0c5e5e48d8b043962b8f3a80fda41679f3fa0a1c79f8a294876fab242ed',
 *    senderId: '2367716785579772625L',
 *    fee: '500000000',
 *    signature: '774de652a6af47a8c0b5655f3b91677ebf67309e200462756fb6c55bc125f63903493798a4c962372b589a6fbbbadc28df86f6cbd25486eb271b78320fe76a0d',
 *    signSignature: undefined,
 *    signatures: [],
 *    asset: {
 *      publicKey: '92b5fc01eb39ed4edddac518aa6d58b15a48ae767f7ab2cfb6605966edacadf5'
 *    },
 *    receivedAt: undefined
 *  }
 * ```
 * @category Transactions
 */
export const registerSecondPassphrase = (
	inputs: SecondPassphraseInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { passphrase, secondPassphrase, networkIdentifier } = inputs;
	const { publicKey } = getKeys(secondPassphrase);

	const transaction = {
		...createBaseTransaction(inputs),
		type: 9,
		asset: { publicKey },
		networkIdentifier,
	};

	if (!passphrase) {
		return transaction;
	}

	const secondSignatureTransaction = new SecondSignatureTransaction(
		transaction as TransactionJSON,
	);
	secondSignatureTransaction.sign(passphrase);

	return secondSignatureTransaction.toJSON();
};
