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
import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';

import {
	MultisignatureTransaction,
	MultiSignatureAsset,
} from '../src/12_multisignature_transaction';
import { BaseTransaction } from '../src';
import { Account } from '../src/types';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
import * as fixtures from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';

// eslint-disable-next-line import/order
import cloneDeep = require('lodash.clonedeep');

describe('Multisignature transaction class', () => {
	const defualtTestCase = fixtures.testCases[0];

	const networkIdentifier = 'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';
	let validTestTransaction: MultisignatureTransaction;
	let targetMultisigAccount: Account;
	let convertedAccount: Account;
	let multisignatureSender: Account;
	let storeAccountGetStub: jest.SpyInstance;
	let storeAccountSetStub: jest.SpyInstance;
	let store: StateStoreMock;
	let decodedMultiSignature: any;

	beforeEach(() => {
		const buffer = Buffer.from(defualtTestCase.output.transaction, 'base64');
		const id = hash(buffer);
		const decodedBaseTransaction = codec.decode<BaseTransaction>(
			BaseTransaction.BASE_SCHEMA,
			buffer,
		);
		const decodedAsset = codec.decode<MultiSignatureAsset>(
			MultisignatureTransaction.ASSET_SCHEMA,
			decodedBaseTransaction.asset as Buffer,
		);
		decodedMultiSignature = {
			...decodedBaseTransaction,
			asset: decodedAsset,
			id,
		};
		validTestTransaction = new MultisignatureTransaction(decodedMultiSignature);

		multisignatureSender = defaultAccount({
			address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
		});

		targetMultisigAccount = defaultAccount({
			address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
			balance: BigInt('94378900000'),
		});
		convertedAccount = defaultAccount({
			address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
			balance: BigInt('94378900000'),
			keys: {
				...validTestTransaction.asset,
			} as any,
		});

		store = new StateStoreMock();

		storeAccountGetStub = jest.spyOn(store.account, 'getOrDefault').mockResolvedValue(
			defaultAccount({
				address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
			}) as never,
		);

		storeAccountGetStub = jest.spyOn(store.account, 'get').mockResolvedValue(targetMultisigAccount);

		storeAccountSetStub = jest.spyOn(store.account, 'set');
	});

	describe('#validateSchema', () => {
		it('should return no errors', () => {
			const { errors } = validTestTransaction.validate();
			expect(errors).toHaveLength(0);
		});

		it('should return error when numberOfSignatures is bigger than 64', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 65,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const { errors } = transaction.validate();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe("'.numberOfSignatures' should be <= 64");
		});

		it('should return error when numberOfSignatures is less than 1', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 0,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const { errors } = transaction.validate();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe("'.numberOfSignatures' should be >= 1");
		});

		it('should return error when mandatoryKeys has too many keys', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					mandatoryKeys: [
						Buffer.from('0ae0ab0443a104dc538d8e504042139781a6ee83420b12d65c1a1dbb35397abe', 'hex'),
						Buffer.from('8f260b844d505a7d94e9c50cc85057c826705534d9ff9f58dc2b9743eba61d14', 'hex'),
						Buffer.from('abfb43d61e969062e1ddf1abcfb12e2f6d6b5b490615f4acfab76222bf72861a', 'hex'),
						Buffer.from('5d40580e8c8ad319a45559f33822c0f94163a00ec59127107cbc9ebd6c3f3919', 'hex'),
						Buffer.from('82fd499f675d19361b2949893c668008204c03b8c16c779279f8a34e1d1e66cc', 'hex'),
						Buffer.from('719f2e68ec2f191a1100c6a8cc7c8d7029badeea46acd6fe4030f2da506c744c', 'hex'),
						Buffer.from('928f1702c16a1dad5db6d5eaf2a19a3b7134a0c1476dd2d7dd6f73e234cc598d', 'hex'),
						Buffer.from('e8591d417051d4e0c6bc8367b6f09f4e3c2098b587b4a6d21018d75ede99e3a7', 'hex'),
						Buffer.from('2e213644a1fe00342c93ad9ea30cdc2af6d2da53c2613cbac2966262f499e5e4', 'hex'),
						Buffer.from('65c9dbeb9280c7643ae6207c5dd4867ba85c44976c87efadd0b57e2eb4d5d159', 'hex'),
						Buffer.from('91c805f2c95a8e89f9b27f0d0e824e21949af1a64ddf1f99dbc1de4e9fcd5058', 'hex'),
						Buffer.from('b1bb829261844de21a938cb14852eb2e6622b301d36429a7342128b5f717b430', 'hex'),
						Buffer.from('986a6726a4106b6b61b3032e2e0f3355090ab95b5d85bb2dad567cd746ba6249', 'hex'),
						Buffer.from('3d2aa90f5be3d63314678840e4f5e585ce32b6194e56a368aa444484516ffebc', 'hex'),
						Buffer.from('4b91e7c176e87fbbd6bdb514dc2525184a46468068eadfb73b8ed2a3c253f551', 'hex'),
						Buffer.from('ae99eca282dc9bad3d8cca99ba868c7844e5ca353cbbd8b02c54508d6de81bf4', 'hex'),
						Buffer.from('59ebe49bf5506028ae2059f2627a555f71c2ce8709068357fae497ff088ad88b', 'hex'),
						Buffer.from('5e5049ea89db852bde4d81b52cba0e915635fe95f39e90020ad182b7aa755e20', 'hex'),
						Buffer.from('85c12832b6d42272755c7177f3a2b4a763583ca54f94a08ade2bd5b5ba3d25fc', 'hex'),
						Buffer.from('1d477386ec8edcac7dd43e04d69b6f3eaf5d4b4accab2a58a92e874ea95ca7a2', 'hex'),
						Buffer.from('a3e1014a1b04bf7fad9ce90b458319675aed014373854adcbe9b916440b74f15', 'hex'),
						Buffer.from('4753f69f277041dca86d8e53837095cec0aed2675f9d3c9a3a80f3e0a5362cd7', 'hex'),
						Buffer.from('8b95411c417754770eb52485fdc2385ed198e513ee72db43d926db92eeec84f1', 'hex'),
						Buffer.from('b0bf02c1ebd1c1d82bb036aa5fac27a5c1bcd2a49ffcbe050a5fa8d53c35d9ca', 'hex'),
						Buffer.from('60e092183ad21af4f91d325ac7cb2afab95060d6402f081816f180ebc4526a67', 'hex'),
						Buffer.from('3280c52f4b83e76840a1fe98a23667dde1b7fe277a30ab9b2df3a6d3c559cdf8', 'hex'),
						Buffer.from('0bf8a93fe4f1f020cd90e7d45a7f28cc8753a71c21994eca5fe4f84cdb80bc82', 'hex'),
						Buffer.from('7db504b893c433ad1bf1a7baeb315b1329b4655836e06a328b9e2384201884d9', 'hex'),
						Buffer.from('bc4209302bf7c40c815337970650bf9683cefc3cfa4a1d6d441352f107be5895', 'hex'),
						Buffer.from('59600a6a170a0da1df773c3ae111c2ee938d79da60040d71db7440625facb630', 'hex'),
						Buffer.from('ae8504282e21724316e3317950e24f0b38bbacaecdb450f2ecb2eba1f5e6932f', 'hex'),
						Buffer.from('46122f81da4bd004a02dc542f8cb3b285c471f982d9684a94505dd6bf181edf5', 'hex'),
						Buffer.from('3c65e537c7308e862c457c5da9a5e0ab1d08a39e34b02f909a39f2b74c543aed', 'hex'),
						Buffer.from('85411b418de8a03e2c24777d41eafd5bbe7bff0c3c6d10d3d583fd82e4f854a7', 'hex'),
						Buffer.from('1a123271bc58ec351dba2ed56171eb53f4c2455a9466d884cba0c71a6d70c9b5', 'hex'),
						Buffer.from('f0a3c1e41d102e0dc1e07eb2c8ada5cf0c5795c1446aa2bfdf6307528ce6945a', 'hex'),
						Buffer.from('d894f206335f471a61d4af9a69756967eafa1f2d88052b1e5345544d529546c8', 'hex'),
						Buffer.from('114299018df7e5a44d8ada91827cdcbc128551c57b7a41806649c231240b236e', 'hex'),
						Buffer.from('1b107ec81b8a537dc3df57a2678106ba1db0ea44d3fdee7c1d44acf9dc8df6b4', 'hex'),
						Buffer.from('6d44775d424b9d4cf7878a9b202bf33fcc3777aea512052ac0100f9ce263b9e8', 'hex'),
						Buffer.from('fc4cb03857426b4e9236866cdfbf5acce1895d55bf62136848257531b297202e', 'hex'),
						Buffer.from('5239e7c876b6c699044e3503a9d94c7f5cc308b724e311a4ce224f0cb5131311', 'hex'),
						Buffer.from('a9f2c3b6a0b6de77778c3f4701d0d226d77fdbbe6bbbfa1f04a2b5ad319b80ce', 'hex'),
						Buffer.from('1386990cbba5deff14d72412bc8bba5656b732001a1da866e4d56969abdd497b', 'hex'),
						Buffer.from('db3c934f3fa77fb2b1cacb6bf2af79b4a3960d398b5eead14e887f212f2ad6e3', 'hex'),
						Buffer.from('38e01877a8f65f77bc3ddf23f049f0bb02812b024e0c04f8061b99196cefa2b3', 'hex'),
						Buffer.from('b0d0a7b20c5aba6032245bb836edb558e811667dc4fa858442435ee060b4b105', 'hex'),
						Buffer.from('6ba3891efa736e4e3f10d63d55162084f43e02c0ff942316b8535e17846bc644', 'hex'),
						Buffer.from('7bf4c5536da5a9ac818cfdac18ba76d3ac8ebb2747430712791dd9fca898fe49', 'hex'),
						Buffer.from('8ffd91a133cfb37bb67f951a15b4c6dd141fcfdf54a41b8117f2f96b2be2cc3c', 'hex'),
						Buffer.from('9780ffde1995f3417860197af2f78d9122f80c322d2e3fe7f3b5282d6013b145', 'hex'),
						Buffer.from('3ef50167c0a4e662f54f8e26f4cedf3130e79b335ed5b36cc4762c838165ee35', 'hex'),
						Buffer.from('f91c76a60e8642b6a176b165794be2ed8d9d0df2d4b9d669816d9fafa56d1bdb', 'hex'),
						Buffer.from('bfba2c7f9504e5fbf04a6a61879a8cdeb937b2ffacae5bce5c9e28dd8ce8401f', 'hex'),
						Buffer.from('ff5e44b923fe526c5b91f5eeb5d86aa15d5e9bf0439e7b5ab4ffe94a4d975a03', 'hex'),
						Buffer.from('958e0e0f69ffb13183f5a17615959caf9cda94a8c555a71d64c48597ddfe04ee', 'hex'),
						Buffer.from('70eddd0fb5f1b615decbf14da0cc682d833433dd96784390a105cee4e59e71e1', 'hex'),
						Buffer.from('ddd91ddbf19c70e05f6f16b2833879ea5f0e4f53b8709a69430fbd0834288c11', 'hex'),
						Buffer.from('fdddf36692068bfa95ee40ecac8331694a9dfef8d3aabd9fe84e945c8005f7f3', 'hex'),
						Buffer.from('54838b6aae920bd9205b39dc42aff4098421ed06a1b4efcf88d1de06318f8f3b', 'hex'),
						Buffer.from('fe19fa54f5fae4a53852731cbd0fcf58f596abf4fa04ee0fb4934ef312d17ec7', 'hex'),
						Buffer.from('611c771e859e59fdb2b4c37b8a6ecc8e250efca4261027231aeea05e6f6ca793', 'hex'),
						Buffer.from('241c6e079b308db183409bc33212cb0706df858c11cd99a3e9ff24b9f161d44c', 'hex'),
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const { errors } = transaction.validate();
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe("'.mandatoryKeys' should NOT have more than 64 items");
		});

		it('should return error when optionalKeys has too many keys', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					optionalKeys: [
						Buffer.from('0ae0ab0443a104dc538d8e504042139781a6ee83420b12d65c1a1dbb35397abe', 'hex'),
						Buffer.from('8f260b844d505a7d94e9c50cc85057c826705534d9ff9f58dc2b9743eba61d14', 'hex'),
						Buffer.from('abfb43d61e969062e1ddf1abcfb12e2f6d6b5b490615f4acfab76222bf72861a', 'hex'),
						Buffer.from('5d40580e8c8ad319a45559f33822c0f94163a00ec59127107cbc9ebd6c3f3919', 'hex'),
						Buffer.from('82fd499f675d19361b2949893c668008204c03b8c16c779279f8a34e1d1e66cc', 'hex'),
						Buffer.from('719f2e68ec2f191a1100c6a8cc7c8d7029badeea46acd6fe4030f2da506c744c', 'hex'),
						Buffer.from('928f1702c16a1dad5db6d5eaf2a19a3b7134a0c1476dd2d7dd6f73e234cc598d', 'hex'),
						Buffer.from('e8591d417051d4e0c6bc8367b6f09f4e3c2098b587b4a6d21018d75ede99e3a7', 'hex'),
						Buffer.from('2e213644a1fe00342c93ad9ea30cdc2af6d2da53c2613cbac2966262f499e5e4', 'hex'),
						Buffer.from('65c9dbeb9280c7643ae6207c5dd4867ba85c44976c87efadd0b57e2eb4d5d159', 'hex'),
						Buffer.from('91c805f2c95a8e89f9b27f0d0e824e21949af1a64ddf1f99dbc1de4e9fcd5058', 'hex'),
						Buffer.from('b1bb829261844de21a938cb14852eb2e6622b301d36429a7342128b5f717b430', 'hex'),
						Buffer.from('986a6726a4106b6b61b3032e2e0f3355090ab95b5d85bb2dad567cd746ba6249', 'hex'),
						Buffer.from('3d2aa90f5be3d63314678840e4f5e585ce32b6194e56a368aa444484516ffebc', 'hex'),
						Buffer.from('4b91e7c176e87fbbd6bdb514dc2525184a46468068eadfb73b8ed2a3c253f551', 'hex'),
						Buffer.from('ae99eca282dc9bad3d8cca99ba868c7844e5ca353cbbd8b02c54508d6de81bf4', 'hex'),
						Buffer.from('59ebe49bf5506028ae2059f2627a555f71c2ce8709068357fae497ff088ad88b', 'hex'),
						Buffer.from('5e5049ea89db852bde4d81b52cba0e915635fe95f39e90020ad182b7aa755e20', 'hex'),
						Buffer.from('85c12832b6d42272755c7177f3a2b4a763583ca54f94a08ade2bd5b5ba3d25fc', 'hex'),
						Buffer.from('1d477386ec8edcac7dd43e04d69b6f3eaf5d4b4accab2a58a92e874ea95ca7a2', 'hex'),
						Buffer.from('a3e1014a1b04bf7fad9ce90b458319675aed014373854adcbe9b916440b74f15', 'hex'),
						Buffer.from('4753f69f277041dca86d8e53837095cec0aed2675f9d3c9a3a80f3e0a5362cd7', 'hex'),
						Buffer.from('8b95411c417754770eb52485fdc2385ed198e513ee72db43d926db92eeec84f1', 'hex'),
						Buffer.from('b0bf02c1ebd1c1d82bb036aa5fac27a5c1bcd2a49ffcbe050a5fa8d53c35d9ca', 'hex'),
						Buffer.from('60e092183ad21af4f91d325ac7cb2afab95060d6402f081816f180ebc4526a67', 'hex'),
						Buffer.from('3280c52f4b83e76840a1fe98a23667dde1b7fe277a30ab9b2df3a6d3c559cdf8', 'hex'),
						Buffer.from('0bf8a93fe4f1f020cd90e7d45a7f28cc8753a71c21994eca5fe4f84cdb80bc82', 'hex'),
						Buffer.from('7db504b893c433ad1bf1a7baeb315b1329b4655836e06a328b9e2384201884d9', 'hex'),
						Buffer.from('bc4209302bf7c40c815337970650bf9683cefc3cfa4a1d6d441352f107be5895', 'hex'),
						Buffer.from('59600a6a170a0da1df773c3ae111c2ee938d79da60040d71db7440625facb630', 'hex'),
						Buffer.from('ae8504282e21724316e3317950e24f0b38bbacaecdb450f2ecb2eba1f5e6932f', 'hex'),
						Buffer.from('46122f81da4bd004a02dc542f8cb3b285c471f982d9684a94505dd6bf181edf5', 'hex'),
						Buffer.from('3c65e537c7308e862c457c5da9a5e0ab1d08a39e34b02f909a39f2b74c543aed', 'hex'),
						Buffer.from('85411b418de8a03e2c24777d41eafd5bbe7bff0c3c6d10d3d583fd82e4f854a7', 'hex'),
						Buffer.from('1a123271bc58ec351dba2ed56171eb53f4c2455a9466d884cba0c71a6d70c9b5', 'hex'),
						Buffer.from('f0a3c1e41d102e0dc1e07eb2c8ada5cf0c5795c1446aa2bfdf6307528ce6945a', 'hex'),
						Buffer.from('d894f206335f471a61d4af9a69756967eafa1f2d88052b1e5345544d529546c8', 'hex'),
						Buffer.from('114299018df7e5a44d8ada91827cdcbc128551c57b7a41806649c231240b236e', 'hex'),
						Buffer.from('1b107ec81b8a537dc3df57a2678106ba1db0ea44d3fdee7c1d44acf9dc8df6b4', 'hex'),
						Buffer.from('6d44775d424b9d4cf7878a9b202bf33fcc3777aea512052ac0100f9ce263b9e8', 'hex'),
						Buffer.from('fc4cb03857426b4e9236866cdfbf5acce1895d55bf62136848257531b297202e', 'hex'),
						Buffer.from('5239e7c876b6c699044e3503a9d94c7f5cc308b724e311a4ce224f0cb5131311', 'hex'),
						Buffer.from('a9f2c3b6a0b6de77778c3f4701d0d226d77fdbbe6bbbfa1f04a2b5ad319b80ce', 'hex'),
						Buffer.from('1386990cbba5deff14d72412bc8bba5656b732001a1da866e4d56969abdd497b', 'hex'),
						Buffer.from('db3c934f3fa77fb2b1cacb6bf2af79b4a3960d398b5eead14e887f212f2ad6e3', 'hex'),
						Buffer.from('38e01877a8f65f77bc3ddf23f049f0bb02812b024e0c04f8061b99196cefa2b3', 'hex'),
						Buffer.from('b0d0a7b20c5aba6032245bb836edb558e811667dc4fa858442435ee060b4b105', 'hex'),
						Buffer.from('6ba3891efa736e4e3f10d63d55162084f43e02c0ff942316b8535e17846bc644', 'hex'),
						Buffer.from('7bf4c5536da5a9ac818cfdac18ba76d3ac8ebb2747430712791dd9fca898fe49', 'hex'),
						Buffer.from('8ffd91a133cfb37bb67f951a15b4c6dd141fcfdf54a41b8117f2f96b2be2cc3c', 'hex'),
						Buffer.from('9780ffde1995f3417860197af2f78d9122f80c322d2e3fe7f3b5282d6013b145', 'hex'),
						Buffer.from('3ef50167c0a4e662f54f8e26f4cedf3130e79b335ed5b36cc4762c838165ee35', 'hex'),
						Buffer.from('f91c76a60e8642b6a176b165794be2ed8d9d0df2d4b9d669816d9fafa56d1bdb', 'hex'),
						Buffer.from('bfba2c7f9504e5fbf04a6a61879a8cdeb937b2ffacae5bce5c9e28dd8ce8401f', 'hex'),
						Buffer.from('ff5e44b923fe526c5b91f5eeb5d86aa15d5e9bf0439e7b5ab4ffe94a4d975a03', 'hex'),
						Buffer.from('958e0e0f69ffb13183f5a17615959caf9cda94a8c555a71d64c48597ddfe04ee', 'hex'),
						Buffer.from('70eddd0fb5f1b615decbf14da0cc682d833433dd96784390a105cee4e59e71e1', 'hex'),
						Buffer.from('ddd91ddbf19c70e05f6f16b2833879ea5f0e4f53b8709a69430fbd0834288c11', 'hex'),
						Buffer.from('fdddf36692068bfa95ee40ecac8331694a9dfef8d3aabd9fe84e945c8005f7f3', 'hex'),
						Buffer.from('54838b6aae920bd9205b39dc42aff4098421ed06a1b4efcf88d1de06318f8f3b', 'hex'),
						Buffer.from('fe19fa54f5fae4a53852731cbd0fcf58f596abf4fa04ee0fb4934ef312d17ec7', 'hex'),
						Buffer.from('611c771e859e59fdb2b4c37b8a6ecc8e250efca4261027231aeea05e6f6ca793', 'hex'),
						Buffer.from('241c6e079b308db183409bc33212cb0706df858c11cd99a3e9ff24b9f161d44c', 'hex'),
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const { errors } = transaction.validate();
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe("'.optionalKeys' should NOT have more than 64 items");
		});

		it('should return errors when mandatory keys are not unique', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					mandatoryKeys: [
						Buffer.from('f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3', 'hex'),
						Buffer.from('f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3', 'hex'),
					],
				},
			};

			const transaction = new MultisignatureTransaction(invalidTransaction);
			const { errors } = transaction.validate();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('MandatoryKeys contains duplicate public keys');
		});

		it('should return errors when optional keys are not unique', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					optionalKeys: [
						Buffer.from('57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4', 'hex'),
						Buffer.from('57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4', 'hex'),
					],
				},
			};

			const transaction = new MultisignatureTransaction(invalidTransaction);
			const { errors } = transaction.validate();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('OptionalKeys contains duplicate public keys');
		});
	});

	describe('#validateAsset', () => {
		it('should return no errors when transaction is valid', () => {
			const transaction = new MultisignatureTransaction(decodedMultiSignature);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(0);
		});

		it('should return errors when numberOfSignatures is bigger than the sum of all keys', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 5,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys',
			);
		});

		it('should return errors when numberOfSignatures is smaller than mandatory key count', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 1,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys',
			);
		});

		it('should return errors when mandatory and optional key sets are not disjointed', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 2,
					mandatoryKeys: [
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
					optionalKeys: [
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Invalid combination of Mandatory and Optional keys');
		});

		it('should return errors when mandatory keys set is not sorted', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 2,
					mandatoryKeys: [
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Mandatory keys should be sorted lexicographically');
		});

		it('should return errors when optional keys set is not sorted', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					numberOfSignatures: 2,
					optionalKeys: [
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
						Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe('Optional keys should be sorted lexicographically');
		});

		it('should return errors when the number of optional and mandatory keys is more than 64', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					optionalKeys: [
						Buffer.from('0ae0ab0443a104dc538d8e504042139781a6ee83420b12d65c1a1dbb35397abe', 'hex'),
						Buffer.from('8f260b844d505a7d94e9c50cc85057c826705534d9ff9f58dc2b9743eba61d14', 'hex'),
						Buffer.from('abfb43d61e969062e1ddf1abcfb12e2f6d6b5b490615f4acfab76222bf72861a', 'hex'),
						Buffer.from('5d40580e8c8ad319a45559f33822c0f94163a00ec59127107cbc9ebd6c3f3919', 'hex'),
						Buffer.from('82fd499f675d19361b2949893c668008204c03b8c16c779279f8a34e1d1e66cc', 'hex'),
						Buffer.from('719f2e68ec2f191a1100c6a8cc7c8d7029badeea46acd6fe4030f2da506c744c', 'hex'),
						Buffer.from('928f1702c16a1dad5db6d5eaf2a19a3b7134a0c1476dd2d7dd6f73e234cc598d', 'hex'),
						Buffer.from('e8591d417051d4e0c6bc8367b6f09f4e3c2098b587b4a6d21018d75ede99e3a7', 'hex'),
						Buffer.from('2e213644a1fe00342c93ad9ea30cdc2af6d2da53c2613cbac2966262f499e5e4', 'hex'),
						Buffer.from('65c9dbeb9280c7643ae6207c5dd4867ba85c44976c87efadd0b57e2eb4d5d159', 'hex'),
						Buffer.from('91c805f2c95a8e89f9b27f0d0e824e21949af1a64ddf1f99dbc1de4e9fcd5058', 'hex'),
						Buffer.from('b1bb829261844de21a938cb14852eb2e6622b301d36429a7342128b5f717b430', 'hex'),
						Buffer.from('986a6726a4106b6b61b3032e2e0f3355090ab95b5d85bb2dad567cd746ba6249', 'hex'),
						Buffer.from('3d2aa90f5be3d63314678840e4f5e585ce32b6194e56a368aa444484516ffebc', 'hex'),
						Buffer.from('4b91e7c176e87fbbd6bdb514dc2525184a46468068eadfb73b8ed2a3c253f551', 'hex'),
						Buffer.from('ae99eca282dc9bad3d8cca99ba868c7844e5ca353cbbd8b02c54508d6de81bf4', 'hex'),
						Buffer.from('59ebe49bf5506028ae2059f2627a555f71c2ce8709068357fae497ff088ad88b', 'hex'),
						Buffer.from('5e5049ea89db852bde4d81b52cba0e915635fe95f39e90020ad182b7aa755e20', 'hex'),
						Buffer.from('85c12832b6d42272755c7177f3a2b4a763583ca54f94a08ade2bd5b5ba3d25fc', 'hex'),
						Buffer.from('1d477386ec8edcac7dd43e04d69b6f3eaf5d4b4accab2a58a92e874ea95ca7a2', 'hex'),
						Buffer.from('a3e1014a1b04bf7fad9ce90b458319675aed014373854adcbe9b916440b74f15', 'hex'),
						Buffer.from('4753f69f277041dca86d8e53837095cec0aed2675f9d3c9a3a80f3e0a5362cd7', 'hex'),
						Buffer.from('8b95411c417754770eb52485fdc2385ed198e513ee72db43d926db92eeec84f1', 'hex'),
						Buffer.from('b0bf02c1ebd1c1d82bb036aa5fac27a5c1bcd2a49ffcbe050a5fa8d53c35d9ca', 'hex'),
						Buffer.from('60e092183ad21af4f91d325ac7cb2afab95060d6402f081816f180ebc4526a67', 'hex'),
						Buffer.from('3280c52f4b83e76840a1fe98a23667dde1b7fe277a30ab9b2df3a6d3c559cdf8', 'hex'),
						Buffer.from('0bf8a93fe4f1f020cd90e7d45a7f28cc8753a71c21994eca5fe4f84cdb80bc82', 'hex'),
						Buffer.from('7db504b893c433ad1bf1a7baeb315b1329b4655836e06a328b9e2384201884d9', 'hex'),
						Buffer.from('bc4209302bf7c40c815337970650bf9683cefc3cfa4a1d6d441352f107be5895', 'hex'),
						Buffer.from('59600a6a170a0da1df773c3ae111c2ee938d79da60040d71db7440625facb630', 'hex'),
						Buffer.from('ae8504282e21724316e3317950e24f0b38bbacaecdb450f2ecb2eba1f5e6932f', 'hex'),
						Buffer.from('46122f81da4bd004a02dc542f8cb3b285c471f982d9684a94505dd6bf181edf5', 'hex'),
						Buffer.from('3c65e537c7308e862c457c5da9a5e0ab1d08a39e34b02f909a39f2b74c543aed', 'hex'),
						Buffer.from('85411b418de8a03e2c24777d41eafd5bbe7bff0c3c6d10d3d583fd82e4f854a7', 'hex'),
						Buffer.from('1a123271bc58ec351dba2ed56171eb53f4c2455a9466d884cba0c71a6d70c9b5', 'hex'),
						Buffer.from('f0a3c1e41d102e0dc1e07eb2c8ada5cf0c5795c1446aa2bfdf6307528ce6945a', 'hex'),
						Buffer.from('d894f206335f471a61d4af9a69756967eafa1f2d88052b1e5345544d529546c8', 'hex'),
						Buffer.from('114299018df7e5a44d8ada91827cdcbc128551c57b7a41806649c231240b236e', 'hex'),
						Buffer.from('1b107ec81b8a537dc3df57a2678106ba1db0ea44d3fdee7c1d44acf9dc8df6b4', 'hex'),
						Buffer.from('6d44775d424b9d4cf7878a9b202bf33fcc3777aea512052ac0100f9ce263b9e8', 'hex'),
						Buffer.from('fc4cb03857426b4e9236866cdfbf5acce1895d55bf62136848257531b297202e', 'hex'),
						Buffer.from('5239e7c876b6c699044e3503a9d94c7f5cc308b724e311a4ce224f0cb5131311', 'hex'),
						Buffer.from('a9f2c3b6a0b6de77778c3f4701d0d226d77fdbbe6bbbfa1f04a2b5ad319b80ce', 'hex'),
						Buffer.from('1386990cbba5deff14d72412bc8bba5656b732001a1da866e4d56969abdd497b', 'hex'),
						Buffer.from('db3c934f3fa77fb2b1cacb6bf2af79b4a3960d398b5eead14e887f212f2ad6e3', 'hex'),
						Buffer.from('38e01877a8f65f77bc3ddf23f049f0bb02812b024e0c04f8061b99196cefa2b3', 'hex'),
						Buffer.from('b0d0a7b20c5aba6032245bb836edb558e811667dc4fa858442435ee060b4b105', 'hex'),
						Buffer.from('6ba3891efa736e4e3f10d63d55162084f43e02c0ff942316b8535e17846bc644', 'hex'),
						Buffer.from('7bf4c5536da5a9ac818cfdac18ba76d3ac8ebb2747430712791dd9fca898fe49', 'hex'),
						Buffer.from('8ffd91a133cfb37bb67f951a15b4c6dd141fcfdf54a41b8117f2f96b2be2cc3c', 'hex'),
						Buffer.from('9780ffde1995f3417860197af2f78d9122f80c322d2e3fe7f3b5282d6013b145', 'hex'),
						Buffer.from('3ef50167c0a4e662f54f8e26f4cedf3130e79b335ed5b36cc4762c838165ee35', 'hex'),
						Buffer.from('f91c76a60e8642b6a176b165794be2ed8d9d0df2d4b9d669816d9fafa56d1bdb', 'hex'),
						Buffer.from('bfba2c7f9504e5fbf04a6a61879a8cdeb937b2ffacae5bce5c9e28dd8ce8401f', 'hex'),
						Buffer.from('ff5e44b923fe526c5b91f5eeb5d86aa15d5e9bf0439e7b5ab4ffe94a4d975a03', 'hex'),
						Buffer.from('958e0e0f69ffb13183f5a17615959caf9cda94a8c555a71d64c48597ddfe04ee', 'hex'),
						Buffer.from('70eddd0fb5f1b615decbf14da0cc682d833433dd96784390a105cee4e59e71e1', 'hex'),
						Buffer.from('ddd91ddbf19c70e05f6f16b2833879ea5f0e4f53b8709a69430fbd0834288c11', 'hex'),
						Buffer.from('fdddf36692068bfa95ee40ecac8331694a9dfef8d3aabd9fe84e945c8005f7f3', 'hex'),
						Buffer.from('54838b6aae920bd9205b39dc42aff4098421ed06a1b4efcf88d1de06318f8f3b', 'hex'),
						Buffer.from('fe19fa54f5fae4a53852731cbd0fcf58f596abf4fa04ee0fb4934ef312d17ec7', 'hex'),
						Buffer.from('611c771e859e59fdb2b4c37b8a6ecc8e250efca4261027231aeea05e6f6ca793', 'hex'),
						Buffer.from('241c6e079b308db183409bc33212cb0706df858c11cd99a3e9ff24b9f161d44c', 'hex'),
						Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
					],
					mandatoryKeys: [
						Buffer.from('5f1383f6ee41d2b8d3a04993a6e87ac8e382eb9c76131a1a0cfaaa5b29b9b879', 'hex'),
						Buffer.from('c883c1829924cfa928ea82b75b9159f5ead532071e8d473db19851cd876bd2a1', 'hex'),
						Buffer.from('ecff042468ff6e6c46a7dd5e30a7f913b476c489a3803448fd1626f47fa842d5', 'hex'),
						Buffer.from('7ccf78d9dd7c8f5cd45bff1bf201659f38467700aff86f8cb636f67d9cac6c13', 'hex'),
						Buffer.from('1c24a8194c7d1c654f870ee57cef949c3cd638c01c8a762e05fd7e28ee8b5958', 'hex'),
						Buffer.from('75dd20b41cfc877352f0ba13518d65c70bf599cd2dbebc34ce2c4a0fdda50a51', 'hex'),
						Buffer.from('cc87862092247346068a6f55f950338b705d0910c6d938d9f5c24f1947d1dcbe', 'hex'),
						Buffer.from('bfb3a220b03c57aee90dca44bb172a0927e149547ff756b8f178a1a7f83e38f9', 'hex'),
						Buffer.from('05eb834f63516423c255edcad9fe29e9ef5cba148098d338651d03828f446dbc', 'hex'),
						Buffer.from('b79171c8492760f051a26c42fd94bed6950dc3c9a9791c77e2c0b46b562c5b49', 'hex'),
						Buffer.from('e21f5c9ab7c394ab742fc10a32e9cf628feb6715c80ad6120d705b107ca4f34f', 'hex'),
						Buffer.from('fa76adbd1f635bd9a6a3368a4e8f56f69ba1c62c95e675d9d845417321855a75', 'hex'),
						Buffer.from('27c870d874c925c64afa4eb4d27eab414ad6a810bb8cbb2c34c3ca5055355aa3', 'hex'),
						Buffer.from('afa742b30068a0572d30ea8c62fa32430ee4289140355dd79f4666e58990ffb1', 'hex'),
						Buffer.from('fcfc466e9b39077a6a86bf3525c1d8588ef9b3c48a2ca9ccf9e8dfb2a189ef4c', 'hex'),
						Buffer.from('94179647403dd32298339e3f06952394867abb2abd5d15c8c0383d5149ac1576', 'hex'),
						Buffer.from('43fb784169750383d740765890613e5070ba62b860bb91714087b3fa5602f6c2', 'hex'),
						Buffer.from('b41343142af897702ca098615ff75c1496b2897d3a68d3a55eb51d00351cc153', 'hex'),
						Buffer.from('11a98f7b1ab6a33020e6c7abcea015d1b41f5b6612c14ac6e35cd4b2992d8fb9', 'hex'),
						Buffer.from('7bfa7d33abf391527b4e632fa74e4b832b632f0729f6502a7512e3cc858eb30a', 'hex'),
						Buffer.from('d6897d15815985365539c97ebd9746970cd49139e6a4e1596411210746aeb154', 'hex'),
						Buffer.from('938aa2599d26f05901d9c2e66748c22d7f9d945f452dae811ba35b4986f471b0', 'hex'),
						Buffer.from('e95cc58376f74ec8f6a0c2927c666e13418dad6b819303dc5106926301219d4e', 'hex'),
						Buffer.from('9c2173012372ce22c34754a18ad34f8516cadb133765c081efd702ec21baf54f', 'hex'),
						Buffer.from('efc24285385313d58af91a58e5b1fc480a629ef7821f4057a91b95067a589051', 'hex'),
						Buffer.from('f1025a4b5b56d62e1af90c049017361aac5335c078aaf57928dada4dde24d10e', 'hex'),
						Buffer.from('bb5f044b1d4797ea7cbb316bb70c3f3b160139076b8fbd5c8e2a8c47ea888aa2', 'hex'),
						Buffer.from('3cf37a7db8a8ff35aa0d6ae7eb193d190749f12f1fbcfb2725c63c0afcc5fd78', 'hex'),
						Buffer.from('1d43f31550b4464c2e44236132284df67b3a194f2d0c79b010b1dc8c69e11c4c', 'hex'),
						Buffer.from('e271186c04d0748c44351f0c8f23ef15ac23a6b039cb3d7a1b935c919f3a025c', 'hex'),
						Buffer.from('39c11e4b9c85f6b5d17f4fdf4d3ae2ecf96abed75bc65c364a1e6603a99a6772', 'hex'),
						Buffer.from('ac1563a15d151854c4a4c693f3c2be408b4231b9c0e34bc337ac0023742ae389', 'hex'),
						Buffer.from('8542954b2d23d0a13810c12334ef6a6736c8bda7c5875a34ca442f3efc3a0ab7', 'hex'),
						Buffer.from('6d4da605b697a4e016861fc64b1103951ac0e3557ab0a3b65285b9ed86c02f62', 'hex'),
						Buffer.from('837eeaf484eb6e40ad40011e0daa889bfddfbc6872f118dac0626188cd634a29', 'hex'),
						Buffer.from('6591f35d0c1e8b5d9c618ae4e5481b98e0e0aaaa6c54346d693482e87ffe8562', 'hex'),
						Buffer.from('522e2cfc567e6200bb1b191e4fed05877d6408fb8e5c38bec0107d657e144f1c', 'hex'),
						Buffer.from('158f3b42d6e381908b1bad80c5825ed2d5c5014be51294f8c8b2af9dfe15eb26', 'hex'),
						Buffer.from('64979c11c12655a7208d43ec70210a8b30423ea82e0ba73f14a10980d3746370', 'hex'),
						Buffer.from('3fff3974ef3846ea5997a94a9c2ca68b15bd0def004c8bbe05650e16e904def0', 'hex'),
						Buffer.from('2ba8eb614c4129088772b16efda6820f1eafe63719da7d2dcb81e1879fc7d06e', 'hex'),
						Buffer.from('78f9192270d7e33e38209ddecf3e3a998c24577e0b97276428f58677b77cfdf9', 'hex'),
						Buffer.from('5343918d6ec34c2f4692b3a33e7bbf8bd443de0611c6f2e2100b4a05bbd602fd', 'hex'),
						Buffer.from('48fce61e977f6e68883ebe3955bc2ddc02714c2fdaa9cf4de8887b5414a7b4f8', 'hex'),
						Buffer.from('46b5f9fad208d21e12a53dbbe06589f195a8be6195326e6c979f169c0bc2e6cc', 'hex'),
						Buffer.from('5efcbe3ceb9b010edca45e2353053ed636689239797a49fbf78cf6ebf13aba4e', 'hex'),
						Buffer.from('6cb8923f70317328aa236fdd26cf76806169f7c0317507d2c7b09425e9761d13', 'hex'),
						Buffer.from('2fbfdad9c96e26d644bc28d8aeba3948beeee58abe3955e359e3a82c9d92e607', 'hex'),
						Buffer.from('4f2fba0765a1fbbe2d1c202d38438040cf7fee721155b8ab02dea99465e0dca9', 'hex'),
						Buffer.from('7f7abf3e3955d215150bf70bf1601626cfbb5ef8b80bdf775d04c230946b1b75', 'hex'),
						Buffer.from('7c70c7c80000fffda70ce8ebbecd9ec4f406955ac77e4fddc73a706e58f8a80b', 'hex'),
						Buffer.from('7280db45183d3e40d0767b99881e85b044b68a0bf92977a6404d6a37d93b7ae9', 'hex'),
						Buffer.from('364acb080b8710bc01eb84e1cc84fa5ac56666734649a86750b00b2cfa0c4fad', 'hex'),
						Buffer.from('237fa4a68d359762e975760f7369b3a9f38539cbd56b589235a50515c125882a', 'hex'),
						Buffer.from('b750ed1217fc8df93879b80f1d78665db4df3bd22af2338679cfd25ee887f46d', 'hex'),
						Buffer.from('23540993c96cd2ba5a07e0096301e662bd8ec497ad522845bcdf4777b111dda3', 'hex'),
						Buffer.from('d6d25e525fd2bd0eec040f9699b97221f85f0f4781debaed91cfaea508b7c291', 'hex'),
						Buffer.from('ec3fba09bd3a7c8e244ebc73c7514a50bbced89ef2a4f53cbf39ddbfdf17e06d', 'hex'),
						Buffer.from('52e1520c899507007af225ec560bb971c9dcc92673cad1a44923c7edf8d82bf7', 'hex'),
						Buffer.from('66bb01fd03d1f8cff6d778c0aef8434f58a079db6f680a27082486a6be5f0538', 'hex'),
						Buffer.from('5821f7b93c12d22f6e6fae4be71cb6aa2f4186a5b2afb8c617bbbf9949a9833e', 'hex'),
						Buffer.from('15cd016bf76fb6ae83aa5818da8ec792b2fdbc90f448de22b0dadf4f8cbb07d6', 'hex'),
						Buffer.from('a52df22c356ebf40ee51ce1499af690610ce722a532646bcc105c7367f73977b', 'hex'),
						Buffer.from('e65808335987b9a398a3391940ee2ab45107b693fe5a1b60b395eb1038e9a573', 'hex'),
					],
					numberOfSignatures: 64,
				},
			};

			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				'The count of Mandatory and Optional keys should be between 1 and 64',
			);
		});

		it('should return errors when the number of optional and mandatory keys is less than 1', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
					optionalKeys: [],
					mandatoryKeys: [],
					numberOfSignatures: 1,
				},
			};

			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(2);
			expect(errors[0].message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys',
			);
			expect(errors[1].message).toBe(
				'The count of Mandatory and Optional keys should be between 1 and 64',
			);
		});

		it('should return error when number of mandatory, optional and sender keys do not match the number of signatures', () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
				},
				signatures: [...decodedMultiSignature.signatures],
			};
			invalidTransaction.signatures.pop();

			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				'The number of mandatory, optional and sender keys should match the number of signatures',
			);
		});
	});

	describe('#verifySignatures', () => {
		it('should not fail to validate valid signatures', async () => {
			const result = await validTestTransaction.verifySignatures(store);
			expect(result.status).toBe(1);
			expect(result.errors).toHaveLength(0);
		});

		it('should return error if first signature is not from the sender public key', async () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
				},
				signatures: [...decodedMultiSignature.signatures],
				networkIdentifier,
			};

			invalidTransaction.signatures[0] = Buffer.from(
				'6667778476d2d300d04cbdb8442eaa4a759999f04846d3098946f45911acbfc6592832840ef290dcc55c2b9e3e07cf5896ac5c01cd0dba740a643f0de1677f06',
				'hex',
			);

			const invalid = new MultisignatureTransaction(invalidTransaction);

			const result = await invalid.verifySignatures(store);
			expect(result.status).toBe(0);
			expect(result.errors[0].message).toBe(
				'Failed to validate signature Zmd3hHbS0wDQTL24RC6qSnWZmfBIRtMJiUb0WRGsv8ZZKDKEDvKQ3MVcK54+B89YlqxcAc0NunQKZD8N4Wd/Bg==',
			);
		});

		it('should return error if any of the mandatory signatures is not valid', async () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
				},
				signatures: [...decodedMultiSignature.signatures],
				networkIdentifier,
			};

			// this is the first mandatory signature from the fixture
			invalidTransaction.signatures[1][10] = 10;

			const invalid = new MultisignatureTransaction(invalidTransaction);

			const result = await invalid.verifySignatures(store);
			expect(result.status).toBe(0);
			expect(result.errors[0].message).toBe(
				'Failed to validate signature d9jTRuBAvsJq/Qr1WEXPNqrq4KB4az8Ao3eJjWmZ9DiEgke/d2OYsu57bLGwfNdef586xizmXoYLJ1r98b6RDA==',
			);
		});

		it('should return error if any of the optional signatures is not valid', async () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
				},
				signatures: [...decodedMultiSignature.signatures],
				networkIdentifier,
			};

			// this is the first optional signature from the fixture
			invalidTransaction.signatures[3][10] = 9;

			const invalid = new MultisignatureTransaction(invalidTransaction);

			const result = await invalid.verifySignatures(store);
			expect(result.status).toBe(0);
			expect(result.errors[0].message).toBe(
				'Failed to validate signature T8FCEBGI16mz8Al3yRClRz3mBotK9d93dTD+Bz4yhp5ohFa1YE2p1l5+FwOt/lPolfwVb0FHJ+oSP340SA+oDg==',
			);
		});

		it('should return error if signatures from sender, mandatory and optional keys are not all present', async () => {
			const invalidTransaction = {
				...decodedMultiSignature,
				asset: {
					...decodedMultiSignature.asset,
				},
				signatures: [...decodedMultiSignature.signatures],
				networkIdentifier,
			};
			invalidTransaction.signatures.pop();

			const invalid = new MultisignatureTransaction(invalidTransaction);

			const result = await invalid.verifySignatures(store);
			expect(result.status).toBe(0);
			expect(result.errors[0].message).toBe('There are missing signatures');
		});

		// TODO: Update after updating protocol-specs
		it('should fail if any of the signatures is empty string', async () => {
			const invalidRegistration = cloneDeep(validTestTransaction);
			invalidRegistration.signatures[0] = Buffer.alloc(0);

			const result = await invalidRegistration.verifySignatures(store);

			expect(result.status).toBe(0);
			expect(result.errors[0].message).toBe('A signature is required for each registered key.');
		});
	});

	describe('#applyAsset', () => {
		beforeEach(() => {
			storeAccountGetStub.mockReturnValue(targetMultisigAccount);
		});

		it('should call state store', async () => {
			await (validTestTransaction as any).applyAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(validTestTransaction.senderId);

			expect(storeAccountSetStub).toHaveBeenCalledWith(
				multisignatureSender.address,
				convertedAccount,
			);
		});

		it('should return no errors', async () => {
			const errors = await (validTestTransaction as any).applyAsset(store);

			expect(errors).toHaveLength(0);
		});

		for (const testCase of fixtures.testCases) {
			// eslint-disable-next-line no-loop-func
			describe(testCase.description, () => {
				it('should apply without error', async () => {
					const buffer = Buffer.from(testCase.output.transaction, 'base64');
					const id = hash(buffer);
					const decodedBaseTransaction = codec.decode<BaseTransaction>(
						BaseTransaction.BASE_SCHEMA,
						buffer,
					);
					const decodedAsset = codec.decode<MultiSignatureAsset>(
						MultisignatureTransaction.ASSET_SCHEMA,
						decodedBaseTransaction.asset as Buffer,
					);
					const tx = new MultisignatureTransaction({
						...decodedBaseTransaction,
						asset: decodedAsset,
						id,
					});
					const errors = await (tx as any).applyAsset(store);
					expect(errors).toHaveLength(0);
				});
			});
		}

		it('should return error when account is already multisignature', async () => {
			storeAccountGetStub.mockReturnValue(targetMultisigAccount);
			await (validTestTransaction as any).applyAsset(store);
			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toBe('.signatures');
		});
	});
});
