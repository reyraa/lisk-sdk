/*
 * Copyright © 2020 Lisk Foundation
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
 */
/* eslint-disable class-methods-use-this */
import { MAX_TRANSACTION_AMOUNT } from '@liskhq/lisk-constants';
import { BaseAsset, ApplyAssetInput } from '../base_asset';

// FIXME: Move this to appropriate location
const MIN_REMAINING_BALANCE = BigInt('5000000'); // 0.05 LSK

interface Asset {
	readonly amount: bigint;
	readonly recipientAddress: Buffer;
	readonly data: string;
}

export class TransferAsset extends BaseAsset {
	public name = 'transfer';
	public type = 0;
	public assetSchema = {
		$id: 'lisk/transfer-asset',
		title: 'Transfer transaction asset',
		type: 'object',
		required: ['amount', 'recipientAddress', 'data'],
		properties: {
			amount: {
				dataType: 'uint64',
				fieldNumber: 1,
			},
			recipientAddress: {
				dataType: 'bytes',
				fieldNumber: 2,
				minLength: 20,
				maxLength: 20,
			},
			data: {
				dataType: 'string',
				fieldNumber: 3,
				minLength: 0,
				maxLength: 64,
			},
		},
	};

	public async applyAsset({ asset, senderID, stateStore }: ApplyAssetInput<Asset>): Promise<void> {
		const sender = await stateStore.account.get(senderID);

		sender.token.balance -= asset.amount;
		stateStore.account.set(sender.address, sender);
		const recipient = await stateStore.account.getOrDefault(asset.recipientAddress);

		recipient.token.balance += asset.amount;

		if (recipient.token.balance > BigInt(MAX_TRANSACTION_AMOUNT)) {
			throw new Error(`Invalid transfer amount: ${asset.amount.toString()}. Maximum allowed amount is: ${MAX_TRANSACTION_AMOUNT}`);
		}

		if (recipient.token.balance < MIN_REMAINING_BALANCE) {
			throw new Error(
				`Account does not have enough minimum remaining LSK: ${recipient.address.toString(
					'base64',
				)}, balance: ${(recipient.token.balance as bigint).toString()}`,
				recipient.token.balance.toString(),
				minRemainingBalance.toString(),
			);
		}

		stateStore.account.set(recipient.address, recipient);
	};
}
