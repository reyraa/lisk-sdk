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
import { getAddressFromPassphrase } from '@liskhq/lisk-cryptography';
import {
	validateNetworkIdentifier,
	validatePublicKeys,
} from '@liskhq/lisk-validator';

import { VoteTransaction } from './11_vote_transaction';
import { TransactionJSON } from './transaction_types';
import {
	createBaseTransaction,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
} from './utils';
/**
 * ### Description
 * A list of all available input parameters to create a [VoteTransaction |vote transaction]], using the [[castVotes |castVotes()]] function.
 *
 */
export interface CastVoteInputs {
	/** The ID of the network where the transaction will be broadcasted to. */
	readonly networkIdentifier: string;
	/** Optional passphrase used to sign the transaction. If not provided at the creation, the transaction can be signed later. */
	readonly passphrase?: string;
	/** Optional second passphrase used to sign the transaction if the account has registered a second passphrase. If not provided at the creation, the transaction can be signed with the second passphrase later. */
	readonly secondPassphrase?: string;
	/** todo */
	readonly timeOffset?: number;
	/** The public keys of the delegates from whom you want to remove your vote. */
	readonly unvotes?: ReadonlyArray<string>;
	/** The public keys of the delegates to vote for. */
	readonly votes?: ReadonlyArray<string>;
}

interface VotesObject {
	readonly unvotes?: ReadonlyArray<string>;
	readonly votes?: ReadonlyArray<string>;
	readonly networkIdentifier: string;
}

const validateInputs = ({
	votes = [],
	unvotes = [],
	networkIdentifier,
}: VotesObject): void => {
	if (!Array.isArray(votes)) {
		throw new Error(
			'Please provide a valid votes value. Expected an array if present.',
		);
	}
	if (!Array.isArray(unvotes)) {
		throw new Error(
			'Please provide a valid unvotes value. Expected an array if present.',
		);
	}

	validatePublicKeys([...votes, ...unvotes]);

	validateNetworkIdentifier(networkIdentifier);
};
/**
 *
 * ### Description
 * This creates a cast votes (type 11) transaction.
 *
 * ### Example
 * ```javascript
 * import * as transactions from '@liskhq/lisk-transactions';
 *
 * transactions.castVotes({
 *    networkIdentifier: '7158c297294a540bc9ac6e474529c3da38d03ece056e3fa2d98141e6ec54132d',
 *    passphrase:'one two three',
 *    votes: ['9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f'],
 *    unvotes: [
 *        '141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
 *        '3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
 *    ]
 * });
 * ```
 *
 * ### Result
 * ```javascript
 * {
 *  id: '12115346598732700133',
 *  blockId: undefined,
 *  height: undefined,
 *  confirmations: undefined,
 *  type: 11,
 *  timestamp: 117412612,
 *  senderPublicKey: 'ff61f0c5e5e48d8b043962b8f3a80fda41679f3fa0a1c79f8a294876fab242ed',
 *  senderId: '2367716785579772625L',
 *  fee: '100000000',
 *  signature: 'da54f85ee512ac67ff9cd278cd751a9243f5977530315d5e3fddc954fefd6f3351ad8f86e035ee86d99d14db228fdea98664d6ef724baef662f8f866ed7fda09',
 *  signSignature: undefined,
 *  signatures: [],
 *  asset: {
 *    votes: [
 *      '+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
 *      '-141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
 *      '-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135'
 *    ]
 *  },
 *  receivedAt: undefined
 * }
 * ```
 *
 * @param inputs All available input params are described in the [[CastVoteInputs |CastVoteInputs interface]].
 * @returns A cast votes transaction object.
 * @category Transactions
 */
export const castVotes = (inputs: CastVoteInputs): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const {
		networkIdentifier,
		passphrase,
		secondPassphrase,
		votes = [],
		unvotes = [],
	} = inputs;

	const plusPrependedVotes = prependPlusToPublicKeys(votes);
	const minusPrependedUnvotes = prependMinusToPublicKeys(unvotes);
	const allVotes: ReadonlyArray<string> = [
		...plusPrependedVotes,
		...minusPrependedUnvotes,
	];

	const transaction = {
		...createBaseTransaction(inputs),
		type: 11,
		asset: {
			// TODO: Remove this after hardfork change. Amount is kept as asset property for exceptions
			amount: '0',
			votes: allVotes,
		},
	};

	if (!passphrase) {
		return transaction;
	}

	const recipientId = getAddressFromPassphrase(passphrase);
	const transactionWithSenderInfo = {
		...transaction,
		// SenderId and SenderPublicKey are expected to be exist from base transaction
		senderPublicKey: transaction.senderPublicKey as string,
		asset: {
			...transaction.asset,
			recipientId,
		},
		networkIdentifier,
	};

	const voteTransaction = new VoteTransaction(transactionWithSenderInfo);
	voteTransaction.sign(passphrase, secondPassphrase);

	return voteTransaction.toJSON();
};
