/*
 * LiskHQ/lisk-commander
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
export const removeUndefinedValues = (obj: object): object =>
	Object.entries(obj).reduce((prev, [key, val]) => {
		if (val !== undefined) {
			return {
				...prev,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				[key]: val,
			};
		}

		return prev;
	}, {});
