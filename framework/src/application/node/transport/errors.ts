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

export class InvalidTransactionError extends Error {
	public readonly message: string;
	public readonly id: Buffer;
	public readonly errors: Error[];

	public constructor(message: string, id: Buffer, errors: Error[]) {
		super(message);
		this.message = message;
		this.id = id;
		this.errors = errors;
	}
}
