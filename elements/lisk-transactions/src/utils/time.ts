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

import { EPOCH_TIME_MILLISECONDS } from '../constants';

const MS_TIME = 1000;
/**
 * ### Description
 * Calculates the number of seconds that elapsed since the network epoch time. Chooses the current time, if no time is provided.
 *
 * ### Example
 * todo
 *
 * ### Result
 * todo
 *
 * @param givenTimestamp Timestamp in seconds.
 * @returns The time that has been elapsed between the network epoch time and the provided timestamp.
 */
export const getTimeFromBlockchainEpoch = (givenTimestamp?: number): number => {
	const startingPoint = givenTimestamp || new Date().getTime();
	const blockchainInitialTime = EPOCH_TIME_MILLISECONDS;

	return Math.floor((startingPoint - blockchainInitialTime) / MS_TIME);
};
/**
 * ### Description
 * todo
 *
 * ### Example
 * todo
 *
 * ### Result
 * todo
 *
 * @param offset
 * @returns todo
 */
export const getTimeWithOffset = (offset?: number): number => {
	const now = new Date().getTime();
	const timeWithOffset = offset ? now + offset * MS_TIME : now;

	return getTimeFromBlockchainEpoch(timeWithOffset);
};
