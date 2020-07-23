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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {
	isValidTransferAmount,
	validateAddress,
	validateNetworkIdentifier,
	validatePublicKey,
} from '@liskhq/lisk-validator';

import { TransferTransaction } from './8_transfer_transaction';
import { BYTESIZES } from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';
/**
 * ### Description
 * A list of all available input parameters to create a [[TransferTransaction |transfer transaction]], using the [[transfer |transfer()]] function.
 *
 */
export interface TransferInputs {
	/** The amount to transfer, (as a string in Beddows, the lowest denomination possible). */
	readonly amount: string;
	/** The ID of the network where the transaction will be broadcasted to. */
	readonly networkIdentifier: string;
	/** Optional data to include in the transaction asset. (Must be a UTF8-encoded string of maximum 64 characters.) */
	readonly data?: string;
	/** Optional passphrase to use to sign the transaction. If not provided at creation the transaction can be signed later. */
	readonly passphrase?: string;
	/** The address of the recipient. */
	readonly recipientId?: string;
	/** The address of the recipient. Only needed, if no recipientId is provided and vice versa. */
	readonly recipientPublicKey?: string;
	/** Optional second passphrase to use to sign the transaction if the account has registered a second passphrase. If not provided at the creation, the transaction can be signed with the second passphrase later. */
	readonly secondPassphrase?: string;
	/** todo */
	readonly timeOffset?: number;
}

const validateInputs = ({
	amount,
	recipientId,
	recipientPublicKey,
	data,
	networkIdentifier,
}: TransferInputs): void => {
	if (!isValidTransferAmount(amount)) {
		throw new Error('Amount must be a valid number in string format.');
	}

	if (!recipientId && !recipientPublicKey) {
		throw new Error(
			'Either recipientId or recipientPublicKey must be provided.',
		);
	}

	if (typeof recipientId !== 'undefined') {
		validateAddress(recipientId);
	}

	if (typeof recipientPublicKey !== 'undefined') {
		validatePublicKey(recipientPublicKey);
	}

	if (
		recipientId &&
		recipientPublicKey &&
		recipientId !== getAddressFromPublicKey(recipientPublicKey)
	) {
		throw new Error('recipientId does not match recipientPublicKey.');
	}

	if (data && data.length > 0) {
		if (typeof data !== 'string') {
			throw new Error(
				'Invalid encoding in transaction data. Data must be utf-8 encoded string.',
			);
		}
		if (data.length > BYTESIZES.DATA) {
			throw new Error('Transaction data field cannot exceed 64 bytes.');
		}
	}

	validateNetworkIdentifier(networkIdentifier);
};
/**
 *
 * ### Description
 * This creates a transfer (type 8) transaction.
 *
 * ### Example
 * ```javascript
 * transactions.transfer({
 *    networkIdentifier: '7158c297294a540bc9ac6e474529c3da38d03ece056e3fa2d98141e6ec54132d',
 *    amount: '1230000',
 *    recipientId: '12668885769632475474L'
 * });
 * ```
 *
 * ### Result
 * ```javascript
 * {
 *   senderPublicKey: undefined,
 *   timestamp: 117410306,
 *   type: 8,
 *   asset: {
 *     amount: '1230000',
 *     recipientId: '12668885769632475474L',
 *     data: undefined
 *   }
 * }
 * ```
 * @param inputs All available input params are described in the [[TransferInputs |TransferInputs interface]].
 * @returns A transfer transaction object.
 * @category Transactions
 */
export const transfer = (inputs: TransferInputs): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const {
		data,
		amount,
		recipientPublicKey,
		passphrase,
		secondPassphrase,
		networkIdentifier,
	} = inputs;

	const recipientIdFromPublicKey = recipientPublicKey
		? getAddressFromPublicKey(recipientPublicKey)
		: undefined;
	const recipientId = inputs.recipientId
		? inputs.recipientId
		: recipientIdFromPublicKey;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 8,
		asset: {
			amount,
			recipientId: recipientId as string,
			data,
		},
	};

	if (!passphrase) {
		return transaction;
	}

	const transactionWithSenderInfo = {
		...transaction,
		networkIdentifier,
		senderPublicKey: transaction.senderPublicKey as string,
		asset: {
			...transaction.asset,
			recipientId: recipientId as string,
		},
	};

	const transferTransaction = new TransferTransaction(
		transactionWithSenderInfo,
	);

	transferTransaction.sign(passphrase, secondPassphrase);

	return transferTransaction.toJSON();
};
