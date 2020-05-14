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
 */
import { Account } from '../account';
import {
	AccountJSON,
	IndexableAccount,
	StorageEntity,
	StorageFilters,
	StorageTransaction,
} from '../types';
import { uniqBy } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import cloneDeep = require('lodash.clonedeep');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import isEqual = require('lodash.isequal');

export class AccountStore {
	private readonly _account: StorageEntity<AccountJSON>;
	private _data: Account[];
	private _originalData: Account[];
	private _updatedKeys: { [key: number]: string[] } = {};
	private _originalUpdatedKeys: { [key: number]: string[] } = {};
	private readonly _primaryKey = 'address';
	private readonly _name = 'Account';

	public constructor(accountEntity: StorageEntity<AccountJSON>) {
		this._account = accountEntity;
		this._data = [];
		this._updatedKeys = {};
		this._primaryKey = 'address';
		this._name = 'Account';
		this._originalData = [];
		this._originalUpdatedKeys = {};
	}

	public async cache(filter: StorageFilters): Promise<ReadonlyArray<Account>> {
		const result = await this._account.get(filter, { limit: null });
		const resultAccountObjects = result.map(
			accountJSON => new Account(accountJSON),
		);

		this._data = uniqBy(
			[...this._data, ...resultAccountObjects] as IndexableAccount[],
			this._primaryKey,
		);

		return resultAccountObjects;
	}

	public createSnapshot(): void {
		this._originalData = cloneDeep(this._data);
		this._updatedKeys = cloneDeep(this._updatedKeys);
	}

	public restoreSnapshot(): void {
		this._data = this._originalData;
		this._updatedKeys = this._originalUpdatedKeys;
		this._originalData = [];
		this._originalUpdatedKeys = {};
	}

	public async get(primaryValue: Buffer): Promise<Account> {
		// Account was cached previously so we can return it from memory
		const element = this._data.find(
			item => item[this._primaryKey] === primaryValue,
		);

		if (element) {
			return new Account(element.toJSON());
		}

		// Account was not cached previously so we try to fetch it from db
		const [elementFromDB] = await this._account.get(
			{ [this._primaryKey]: primaryValue },
			{ limit: null },
		);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (elementFromDB) {
			this._data.push(new Account(elementFromDB));

			return new Account(elementFromDB);
		}

		// Account does not exist we can not continue
		throw new Error(
			`${this._name} with ${this._primaryKey} = ${primaryValue.toString(
				'hex',
			)} does not exist`,
		);
	}

	public async getOrDefault(primaryValue: Buffer): Promise<Account> {
		// Account was cached previously so we can return it from memory
		const element = this._data.find(
			item => item[this._primaryKey] === primaryValue,
		);
		if (element) {
			return new Account(element.toJSON());
		}

		// Account was not cached previously so we try to fetch it from db (example delegate account is voted)
		const [elementFromDB] = await this._account.get(
			{ [this._primaryKey]: primaryValue },
			{ limit: null },
		);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (elementFromDB) {
			this._data.push(new Account(elementFromDB));

			return new Account(elementFromDB);
		}

		const defaultElement: Account = Account.getDefaultAccount(primaryValue);

		const newElementIndex = this._data.push(defaultElement) - 1;
		this._updatedKeys[newElementIndex] = Object.keys(defaultElement);

		return new Account(defaultElement.toJSON());
	}

	public getUpdated(): ReadonlyArray<Account> {
		return [...this._data];
	}

	public find(
		fn: (value: Account, index: number, obj: Account[]) => unknown,
	): Account | undefined {
		const foundAccount = this._data.find(fn);
		if (!foundAccount) {
			return undefined;
		}

		return new Account(foundAccount.toJSON());
	}

	public set(primaryValue: Buffer, updatedElement: Account): void {
		const elementIndex = this._data.findIndex(
			item => item[this._primaryKey] === primaryValue,
		);

		if (elementIndex === -1) {
			throw new Error(
				`${this._name} with ${this._primaryKey} = ${primaryValue.toString(
					'hex',
				)} does not exist`,
			);
		}

		const updatedKeys = Object.entries(updatedElement).reduce<string[]>(
			(existingUpdatedKeys, [key, value]) => {
				const account = this._data[elementIndex];
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-explicit-any
				if (!isEqual(value, (account as any)[key])) {
					existingUpdatedKeys.push(key);
				}

				return existingUpdatedKeys;
			},
			[],
		);

		this._data[elementIndex] = updatedElement;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		this._updatedKeys[elementIndex] = this._updatedKeys[elementIndex]
			? [...new Set([...this._updatedKeys[elementIndex], ...updatedKeys])]
			: updatedKeys;
	}

	public async finalize(tx: StorageTransaction): Promise<void> {
		const affectedAccounts = Object.entries(this._updatedKeys).map(
			([index, updatedKeys]) => ({
				updatedItem: this._data[parseInt(index, 10)].toJSON(),
				updatedKeys,
			}),
		);

		const updateToAccounts = affectedAccounts.map(
			async ({ updatedItem, updatedKeys }) => {
				const filter = { [this._primaryKey]: updatedItem[this._primaryKey] };
				const updatedData = updatedKeys.reduce<Partial<AccountJSON>>(
					(data, key) => {
						// eslint-disable-next-line
						(data as any)[key] = (updatedItem as any)[key];

						return data;
					},
					{},
				);

				return this._account.upsert(filter, updatedData, null, tx);
			},
		);

		await Promise.all(updateToAccounts);
	}
}
