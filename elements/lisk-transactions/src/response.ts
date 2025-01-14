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
import { TransactionError } from './errors';

export enum Status {
	FAIL = 0,
	OK = 1,
}

export interface TransactionResponse {
	readonly id: Buffer;
	readonly status: Status;
	readonly errors: ReadonlyArray<TransactionError>;
}

export const createResponse = (
	id: Buffer,
	errors?: ReadonlyArray<TransactionError>,
): TransactionResponse => ({
	id,
	status: errors && errors.length > 0 ? Status.FAIL : Status.OK,
	errors: errors ?? [],
});
