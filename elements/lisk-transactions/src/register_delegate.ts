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
import { validateNetworkIdentifier } from '@liskhq/lisk-validator';

import { DelegateTransaction } from './10_delegate_transaction';
import { DELEGATE_FEE, USERNAME_MAX_LENGTH } from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';
/**
 * #### Description
 * A list of all available input parameters to create a [[DelegateTransaction |delegate transaction]], using the [[registerDelegate |registerDelegate()]] function.
 *
 */
export interface RegisterDelegateInputs {
	/** todo */
	readonly passphrase?: string;
	/** todo */
	readonly secondPassphrase?: string;
	/** todo */
	readonly timeOffset?: number;
	/** todo */
	readonly username: string;
	/** todo */
	readonly networkIdentifier: string;
}

const validateInputs = ({
	username,
	networkIdentifier,
}: RegisterDelegateInputs): void => {
	if (!username || typeof username !== 'string') {
		throw new Error('Please provide a username. Expected string.');
	}

	if (username.length > USERNAME_MAX_LENGTH) {
		throw new Error(
			`Username length does not match requirements. Expected to be no more than ${USERNAME_MAX_LENGTH} characters.`,
		);
	}

	validateNetworkIdentifier(networkIdentifier);
};
/**
 * #### Description
 * This creates a register delegate (type 10) transaction and returns it as a [[TransactionJSON]].
 *
 * As an alternative to this function, it is possible to create a delegate transaction by initializing the [[DelegateTransaction]] class.
 *
 * #### Example
 * ```javascript
 * import * as transactions from '@liskhq/lisk-transactions';
 *
 * transactions.registerDelegate({
 *   networkIdentifier: '7158c297294a540bc9ac6e474529c3da38d03ece056e3fa2d98141e6ec54132d',
 *   passphrase:'one two three',
 *   username:'foo'
 * });
 * ```
 *
 * @param inputs All available input params are described in the [[RegisterDelegateInputs |RegisterDelegateInputs interface]].
 * @returns A register delegate transaction object.
 * ##### Example Result
 * ```javascript
 * {
 *  id: '16884232508060487400',
 *  blockId: undefined,
 *  height: undefined,
 *  confirmations: undefined,
 *  type: 10,
 *  timestamp: 117411841,
 *  senderPublicKey: 'ff61f0c5e5e48d8b043962b8f3a80fda41679f3fa0a1c79f8a294876fab242ed',
 *  senderId: '2367716785579772625L',
 *  fee: '2500000000',
 *  signature: '668264a8c6a769faa7a2c48dda08b33228d9775354d70312ecdfacbbde929693b27bb795d78abcbc1ab9e63552c086fa29da6a758a621c623f617dcf4e273208',
 *  signSignature: undefined,
 *  signatures: [],
 *  asset: { username: 'foo' },
 *  receivedAt: undefined
 * }
 * ```
 * @category Transactions
 */
export const registerDelegate = (
	inputs: RegisterDelegateInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { username, passphrase, secondPassphrase, networkIdentifier } = inputs;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 10,
		fee: DELEGATE_FEE.toString(),
		asset: { username },
		networkIdentifier,
	};

	if (!passphrase) {
		return transaction;
	}

	const delegateTransaction = new DelegateTransaction(transaction);
	delegateTransaction.sign(passphrase, secondPassphrase);

	return delegateTransaction.toJSON();
};
