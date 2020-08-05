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

const protobuf = require('protobufjs');

const prepareProtobuffersBaseTransaction = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/block.proto');

const {
	BaseTransaction,
	VoteTransaction,
	MultisigTransaction,
} = prepareProtobuffersBaseTransaction();

const baseTransactionSchema = {
	$id: 'baseTransactionSchema',
	type: 'object',
	properties: {
		type: { dataType: 'uint32', fieldNumber: 1 },
		nonce: { dataType: 'uint64', fieldNumber: 2 },
		fee: { dataType: 'uint64', fieldNumber: 3 },
		senderPublicKey: { dataType: 'bytes', fieldNumber: 4 },
		asset: { dataType: 'bytes', fieldNumber: 5 },
		signatures: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 6 },
	},
	required: ['type', 'nonce', 'fee', 'senderPublicKey', 'asset'],
};

const voteAssetSchema = {
	$id: 'voteAssetSchema',
	type: 'object',
	properties: {
		votes: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					delegateAddress: { dataType: 'bytes', fieldNumber: 1 },
					amount: { dataType: 'sint64', fieldNumber: 2 },
				},
				required: ['delegateAddress', 'amount'],
			},
		},
	},
	required: ['votes'],
};

const multisigAssetSchema = {
	$id: 'multisigAssetSchema',
	type: 'object',
	properties: {
		numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
		mandatoryKeys: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
		optionalKeys: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 3 },
	},
	required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
};

const generateValidTransactionEncodings = () => {
	const input = {
		validBaseTransaction: {
			object: {
				moduleType: 20,
				assetType: 1,
				nonce: 1570179673932370,
				fee: 3156364651,
				senderPublicKey: Buffer.from(
					'8f057d088a585d938c20d63e430a068d4cea384e588aa0b758c68fca21644dbc',
					'hex',
				),
				asset: Buffer.from('f214d75bbc4b2ea89e433f3a45af803725416ec3', 'hex'),
				signatures: [
					Buffer.from(
						'204514eb1152355799ece36d17037e5feb4871472c60763bdafe67eb6a38bec632a8e2e62f84a32cf764342a4708a65fbad194e37feec03940f0ff84d3df2a05',
						'hex',
					),
					Buffer.from(
						'0b6730e5898ca56fe0dc1c73de9363f6fc8b335592ef10725a8463bff101a4943e60311f0b1a439a2c9e02cca1379b80a822f4ec48cf212bff1f1c757e92ec02',
						'hex',
					),
				],
			},
			schema: baseTransactionSchema,
		},
		validVoteAsset: {
			object: {
				votes: [
					{
						delegateAddress: Buffer.from('cd32c73e9851c7137980063b8af64aa5a31651f8', 'hex'),
						amount: -12000000000,
					},
					{
						delegateAddress: Buffer.from('9d86ad24a3f030e5522b6598115bb4d70c1692c9', 'hex'),
						amount: 456000000000,
					},
				],
			},
			schema: voteAssetSchema,
		},
		validMultiSigAsset: {
			object: {
				numberOfSignatures: 2,
				mandatoryKeys: [
					Buffer.from('07d6389be6e2109613699c02e78253148989515c3867e4f490eafd004a95b2b4', 'hex'),
					Buffer.from('3e754d00815b6b248a981520afbaf913153a26d25e2d5283964779c65ceee7e8', 'hex'),
				],
				optionalKeys: [
					Buffer.from('c8b8fbe474a2b63ccb9744a409569b0a465ee1803f80435aec1c5e7fc2d4ee18', 'hex'),
					Buffer.from('6115424fec0ce9c3bac5a81b5c782827d1f956fb95f1ccfa36c566d04e4d7267', 'hex'),
				],
			},
			schema: multisigAssetSchema,
		},
		validMultiSigAssetWithEmpty: {
			object: {
				numberOfSignatures: 2,
				mandatoryKeys: [
					Buffer.from('c8b8fbe474a2b63ccb9744a409569b0a465ee1803f80435aec1c5e7fc2d4ee18', 'hex'),
					Buffer.from('6115424fec0ce9c3bac5a81b5c782827d1f956fb95f1ccfa36c566d04e4d7267', 'hex'),
				],
				optionalKeys: [],
			},
			schema: multisigAssetSchema,
		},
	};

	const validBaseTransactionEncoded = BaseTransaction.encode(
		input.validBaseTransaction.object,
	).finish();
	const validVoteTransactionEncoded = VoteTransaction.encode(input.validVoteAsset.object).finish();
	const validMultisigTransactionEncoded = MultisigTransaction.encode(
		input.validMultiSigAsset.object,
	).finish();
	const validMultisigTransactionWithEmptyEncoded = MultisigTransaction.encode(
		input.validMultiSigAssetWithEmpty.object,
	).finish();

	return [
		{
			description: 'Encoding of valid base transaction',
			input: input.validBaseTransaction,
			output: { value: validBaseTransactionEncoded.toString('hex') },
		},
		{
			description: 'Encoding of valid vote asset',
			input: input.validVoteAsset,
			output: { value: validVoteTransactionEncoded.toString('hex') },
		},
		{
			description: 'Encoding of valid multisignature asset',
			input: input.validMultiSigAsset,
			output: { value: validMultisigTransactionEncoded.toString('hex') },
		},
		{
			description: 'Encoding of valid multisignature asset with empty array',
			input: input.validMultiSigAssetWithEmpty,
			output: { value: validMultisigTransactionWithEmptyEncoded.toString('hex') },
		},
	];
};

module.exports = generateValidTransactionEncodings;
