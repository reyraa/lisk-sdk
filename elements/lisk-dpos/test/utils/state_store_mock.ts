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
import { Account, BlockHeader } from '../../src/types';

interface AccountStoreMock {
	get: (address: Buffer) => Promise<Account>;
	getUpdated: () => Account[];
	set: (address: Buffer, account: Account) => void;
}

interface ConsensusStateStoreMock {
	get: (address: string) => Promise<string | undefined>;
	set: (key: string, v: string) => void;
	lastBlockHeaders: ReadonlyArray<BlockHeader>;
}

interface ConsensusState {
	[key: string]: string;
}

export interface AdditionalInformation {
	readonly lastBlockHeaders: ReadonlyArray<BlockHeader>;
}

export class StateStoreMock {
	public account: AccountStoreMock;
	public consensus: ConsensusStateStoreMock;

	public accountData: Account[];
	public consensusStateData: ConsensusState;

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	constructor(
		initialAccount?: Account[],
		initialState?: ConsensusState,
		additionalInformation?: AdditionalInformation,
	) {
		// Make sure to be deep copy
		this.accountData = initialAccount
			? initialAccount.map(a => ({ ...a }))
			: [];

		this.consensusStateData = initialState ? { ...initialState } : {};

		this.account = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async (address: Buffer): Promise<Account> => {
				const account = this.accountData.find(acc =>
					acc.address.equals(address),
				);
				if (!account) {
					throw new Error('Account not defined');
				}
				return { ...account };
			},
			set: (address: Buffer, account: Account): void => {
				const index = this.accountData.findIndex(acc =>
					acc.address.equals(address),
				);
				if (index > -1) {
					this.accountData[index] = account;
					return;
				}
				this.accountData.push(account);
			},
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			getUpdated: () => this.accountData,
		};
		this.consensus = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async (key: string): Promise<string | undefined> => {
				return this.consensusStateData[key];
			},
			set: (key: string, val: string): void => {
				this.consensusStateData[key] = val;
			},
			lastBlockHeaders: additionalInformation?.lastBlockHeaders ?? [],
		};
	}
}
