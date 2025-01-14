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

import { Request, Response, NextFunction } from 'express';
import { BaseChannel, PluginCodec } from 'lisk-framework';
import { KVStore } from '@liskhq/lisk-db';
import { getForgerInfo } from '../db';
import { Forger } from '../types';

export const getForgingInfo = (channel: BaseChannel, codec: PluginCodec, db: KVStore) => async (
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const forgingDelegates = await channel.invoke<ReadonlyArray<Forger>>(
			'app:getForgingStatusOfAllDelegates',
		);
		const forgerAccounts = (
			await channel.invoke<string[]>('app:getAccounts', {
				address: forgingDelegates.map(forger => forger.address),
			})
		).map(encodedAccount => codec.decodeAccount(encodedAccount));

		const data = [];
		for (const forgerAccount of forgerAccounts) {
			const forgerAddressBinary = Buffer.from(forgerAccount.address, 'base64').toString('binary');
			const forgerInfo = await getForgerInfo(db, forgerAddressBinary);
			const forger = forgingDelegates.find(aForger => aForger.address === forgerAccount.address);

			if (forger) {
				data.push({
					...forger,
					username: forgerAccount.asset.delegate.username,
					totalReceivedFees: forgerInfo.totalReceivedFees.toString(),
					totalReceivedRewards: forgerInfo.totalReceivedRewards.toString(),
					totalProducedBlocks: forgerInfo.totalProducedBlocks,
					totalVotesReceived: forgerAccount.asset.delegate.totalVotesReceived,
					consecutiveMissedBlocks: forgerAccount.asset.delegate.consecutiveMissedBlocks,
				});
			}
		}

		res.status(200).json({
			data,
			meta: { count: data.length },
		});
	} catch (err) {
		next(err);
	}
};
