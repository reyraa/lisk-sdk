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

import { AfterBlockApplyInput, AfterGenesisBlockApplyInput, BaseModule, TransactionApplyInput } from '../base_module';
interface AccountBalance {
	balance: bigint;
}

export class TokenModule extends BaseModule<AccountBalance> {
	public name = 'token';
	public type = 2;
	public accountSchema = {
		type: 'object',
		properties: {
			balance: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			balance: BigInt(0),
		},
	};

	// public reducers?: Map<string, ReduceHandler> {}

	public async beforeTransactionApply({ tx }: TransactionApplyInput): Promise<void> {
		//Throw error if fee is lower than minimum fee (minFeePerBytes + baseFee)
		const minFee = BigInt(this.config.minFeePerByte) * BigInt(tx.getBytes().length);
		const baseFee = this.config.baseFees.find(fee => fee.moduleType === 2 && fee.assetType === 0)?.baseFee;
		if (baseFee as bigint < minFee) {
			throw new Error(
					`Insufficient transaction fee. Minimum required fee is: ${minFee.toString()}`,
					// '.fee',
					// baseFee.toString(),
				);
		}
	}

	public async afterTransactionApply({ tx, stateStore }: TransactionApplyInput): Promise<void> {
		// Verify sender has minimum remaining balance
		const senderAddress = tx.senderPublicKey;
		const sender = await stateStore.account.getOrDefault(senderAddress);

		if (sender.token.balance < this.config.minRemainingBalance) {
			throw new Error(
				`Account does not have enough minimum remaining balance: ${sender.address.toString(
					'base64',
				)}, balance: ${sender.balance.toString())}`,
				id,
				'.balance',
				sender.token.balance.toString(),
				minRemainingBalance.toString(),
			);
		}
	}

	public afterBlockApply({ block }: AfterBlockApplyInput): Promise<void> {
		// Credit reward and fee to generator
		
		const generatorAddress = getAddressFromPublicKey(block.header.generatorPublicKey);
		const generator = await stateStore.account.get(generatorAddress);
		generator.balance += block.header.reward;
		// If there is no transactions, no need to give fee
		if (!block.payload.length) {
			stateStore.account.set(generatorAddress, generator);
	
			return;
		}
		const { totalFee, totalMinFee } = getTotalFees(block);
		// Generator only gets total fee - min fee
		const givenFee = totalFee - totalMinFee;
		// This is necessary only for genesis block case, where total fee is 0, which is invalid
		// Also, genesis block cannot be reverted
		generator.balance += givenFee > 0 ? givenFee : BigInt(0);
		const totalFeeBurntBuffer = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
		let totalFeeBurnt = totalFeeBurntBuffer ? totalFeeBurntBuffer.readBigInt64BE() : BigInt(0);
		totalFeeBurnt += givenFee > 0 ? totalMinFee : BigInt(0);
	
		// Update state store
		const updatedTotalBurntBuffer = Buffer.alloc(8);
		updatedTotalBurntBuffer.writeBigInt64BE(totalFeeBurnt);
		stateStore.account.set(generatorAddress, generator);
		stateStore.chain.set(CHAIN_STATE_BURNT_FEE, updatedTotalBurntBuffer);

	}

	public afterGenesisBlockApply({ block }: AfterGenesisBlockApplyInput): Promise<void> {
		// Validate genesis accounts balances
		// Move genesis block account validation logic related to balance from lisk-genesis to afterGenesisBlockApply
		for (const account of header.asset.accounts) {
			accountAddresses.push(account.address);
			totalBalance += BigInt(account.balance);
		}

		if (totalBalance > GENESIS_BLOCK_MAX_BALANCE) {
			throw new Error(
				'Total balance exceeds the limit (2^63)-1',
				id,
				'header.asset.accounts[].balance',
				totalBalance.toString(),
				GENESIS_BLOCK_MAX_BALANCE.toString(),
			);
		}
	}
}
