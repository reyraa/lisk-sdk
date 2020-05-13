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

import { ForgerList, ForgersList } from '../../src/types';

const delegates = [
	Buffer.from('a1', 'hex'),
	Buffer.from('b1', 'hex'),
	Buffer.from('c1', 'hex'),
];

export const delegateLists = [
	{
		round: 17,
		delegates,
		standby: [],
	},
	{
		round: 16,
		delegates,
		standby: [],
	},
	{
		round: 15,
		delegates,
		standby: [],
	},
	{
		round: 14,
		delegates,
		standby: [],
	},
	{
		round: 13,
		delegates,
		standby: [],
	},
	{
		round: 12,
		delegates,
		standby: [],
	},
	{
		round: 11,
		delegates,
		standby: [],
	},
	{
		round: 10,
		delegates,
		standby: [],
	},
	{
		round: 9,
		delegates,
		standby: [],
	},
	{
		round: 8,
		delegates,
		standby: [],
	},
	{
		round: 7,
		delegates,
		standby: [],
	},
	{
		round: 6,
		delegates,
		standby: [],
	},
	{
		round: 5,
		delegates,
		standby: [],
	},
	{
		round: 4,
		delegates,
		standby: [],
	},
	{
		round: 3,
		delegates,
		standby: [],
	},
	{
		round: 2,
		delegates,
		standby: [],
	},
	{
		round: 1,
		delegates,
		standby: [],
	},
];

interface ActiveDelegateList {
	readonly address: Buffer;
	readonly activeRounds: number[];
}

export const generateDelegateLists = (
	{ address, activeRounds }: ActiveDelegateList,
	lists = delegateLists,
): ForgersList => {
	return lists.map((list: ForgerList) => {
		if (activeRounds.includes(list.round)) {
			return {
				round: list.round,
				delegates: [address, ...list.delegates].slice(0, 3),
				standby: [],
			};
		}
		return list;
	});
};

export const generateDelegateListsWithStandby = (
	{ address, activeRounds }: ActiveDelegateList,
	lists = delegateLists,
): ForgersList => {
	return lists.map((list: ForgerList) => {
		if (activeRounds.includes(list.round)) {
			return {
				round: list.round,
				delegates: [...list.delegates].slice(0, 3),
				standby: [address],
			};
		}
		return list;
	});
};
