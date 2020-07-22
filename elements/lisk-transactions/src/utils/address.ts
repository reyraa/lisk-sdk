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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

import { TransactionError } from '../errors';
/**
 * ### Description
 * Validates if the senderId matches the public key of a transaction.
 *
 * ### Example
 * ```javascript
 * //todo
 * ```
 * ### Result
 * ```javascript
 * //todo
 * ```
 *
 * @param id The transaction id.
 * @param senderId The address to validate as string.
 * @param senderPublicKey The public key to validate as string.
 * @returns `true` if the public key matches the senderId, otherwise an error will be thrown.
 */
export const validateSenderIdAndPublicKey = (
	id: string,
	senderId: string,
	senderPublicKey: string,
): TransactionError | undefined => {
	const actualAddress = getAddressFromPublicKey(senderPublicKey);

	return senderId.toUpperCase() !== actualAddress.toUpperCase()
		? new TransactionError(
				'`senderId` does not match `senderPublicKey`',
				id,
				'.senderId',
				actualAddress,
				senderId,
		  )
		: undefined;
};
