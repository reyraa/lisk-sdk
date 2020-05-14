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
import { transfer, utils as transactionUtils } from '@liskhq/lisk-transactions';
import {
	isValidFee,
	isValidNonce,
	validateAddress,
} from '@liskhq/lisk-validator';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { AlphabetLowercase, flags as commonFlags } from '../../../utils/flags';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';
import { getPassphraseFromPrompt } from '../../../utils/reader';

interface Args {
	readonly nonce: string;
	readonly fee: string;
	readonly address: string;
	readonly amount: string;
}

const dataFlag = {
	char: 'd' as AlphabetLowercase,
	description: `Optional UTF8 encoded data (maximum of 64 bytes) to include in the transaction asset.
	Examples:
	- --data=customInformation
`,
};

const processInputs = (
	nonce: string,
	fee: string,
	networkIdentifier: string,
	amount: string,
	address: Buffer,
	data?: string,
	passphrase?: string,
) =>
	transfer({
		nonce,
		fee,
		networkIdentifier,
		recipientId: address,
		amount,
		data,
		passphrase,
	});

export default class TransferCommand extends BaseCommand {
	static args = [
		{
			name: 'nonce',
			required: true,
			description: 'Nonce of the transaction.',
		},
		{
			name: 'fee',
			required: true,
			description: 'Transaction fee in LSK.',
		},
		{
			name: 'amount',
			required: true,
			description: 'Amount of LSK to send.',
		},
		{
			name: 'address',
			required: true,
			description: 'Address of the recipient.',
		},
	];

	static description = `
	Creates a transaction which will transfer the specified amount to an address if broadcast to the network.
		`;

	static examples = [
		'transaction:create:transfer 1 100 100 13356260975429434553L',
	];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
		'no-signature': flagParser.boolean(commonFlags.noSignature),
		data: flagParser.string(dataFlag),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
				'no-signature': noSignature,
				data: dataString,
			},
		} = this.parse(TransferCommand);

		const { nonce, fee, amount, address } = args as Args;
		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);

		if (!isValidNonce(nonce)) {
			throw new ValidationError('Enter a valid nonce in number string format.');
		}

		if (Number.isNaN(Number(fee))) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		const normalizedFee = transactionUtils.convertLSKToBeddows(fee);

		if (!isValidFee(normalizedFee)) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		validateAddress(address);
		const normalizedAmount = transactionUtils.convertLSKToBeddows(amount);

		if (noSignature) {
			const noSignatureResult = processInputs(
				nonce,
				normalizedFee,
				networkIdentifier,
				normalizedAmount,
				// TODO: Need to update format - https://github.com/LiskHQ/lisk-sdk/issues/5177
				Buffer.from(address, 'hex'),
				dataString,
			);
			this.print(noSignatureResult);

			return;
		}
		const passphrase =
			passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));

		const result = processInputs(
			nonce,
			normalizedFee,
			networkIdentifier,
			normalizedAmount,
			// TODO: Need to update format - https://github.com/LiskHQ/lisk-sdk/issues/5177
			Buffer.from(address, 'hex'),
			dataString,
			passphrase,
		);
		this.print(result);
	}
}
