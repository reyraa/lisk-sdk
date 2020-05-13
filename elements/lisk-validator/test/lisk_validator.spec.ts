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
import { validator } from '../src/lisk_validator';

describe('validator', () => {
	const baseSchemaId = 'test/schema';
	let baseSchema: object;

	beforeAll(() => {
		baseSchema = {
			$id: baseSchemaId,
			type: 'object',
		};
	});

	describe('signature', () => {
		let signatureSchema: object;
		beforeEach(() => {
			signatureSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'signature',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid signature is provided', () => {
			expect(
				validator.validate(signatureSchema, {
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304',
				}),
			).toHaveLength(0);
		});

		it('should validate to false when non-hex character is in the signature', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signature' },
					message: 'should match format "signature"',
				},
			];

			expect(
				validator.validate(signatureSchema, {
					target:
						'zzzzzzzzzzzzzzzzzzzzzzzzzzzzf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when the signature is under 128 characters', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signature' },
					message: 'should match format "signature"',
				},
			];

			expect(
				validator.validate(signatureSchema, {
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b730',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when the signature is over 128 characters', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signature' },
					message: 'should match format "signature"',
				},
			];

			expect(
				validator.validate(signatureSchema, {
					target:
						'd5bdb0577f53fe5d79009c42facdf295a555e9542c851ec49feef1680f824a1ebae00733d935f078c3ef621bc20ee88d81390f9c97f75adb14731504861b7304a',
				}),
			).toEqual(expectedError);
		});
	});

	describe('id', () => {
		let idSchema: object;
		beforeEach(() => {
			idSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'id',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid id is provided', () => {
			expect(
				validator.validate(idSchema, { target: '3543510233978718399' }),
			).toEqual([]);
		});

		it('should validate to true when valid id with leading zeros is provided', () => {
			expect(validator.validate(idSchema, { target: '00123' })).toEqual([]);
		});

		it('should validate to false when number greater than maximum is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'id' },
					message: 'should match format "id"',
				},
			];

			expect(
				validator.validate(idSchema, { target: '18446744073709551616' }),
			).toEqual(expectedError);
		});

		it('should validate to false when number is provided', () => {
			const expectedError = [
				{
					keyword: 'type',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/type',
					params: { type: 'string' },
					message: 'should be string',
				},
			];

			expect(
				validator.validate(idSchema, { target: 3543510233978718399 }),
			).toEqual(expectedError);
		});

		it('should validate to false when it is empty', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'id' },
					message: 'should match format "id"',
				},
			];
			expect(validator.validate(idSchema, { target: '' })).toEqual(
				expectedError,
			);
		});
	});

	describe('emptyString', () => {
		let emptyStringSchema: object;
		beforeEach(() => {
			emptyStringSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'emptyString',
							},
						},
					},
				],
			};
		});

		it('should validate to true when empty string is provided', () => {
			expect(validator.validate(emptyStringSchema, { target: '' })).toEqual([]);
		});

		it('should validate to false when non empty string provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'emptyString' },
					message: 'should match format "emptyString"',
				},
			];

			expect(
				validator.validate(emptyStringSchema, {
					target: '18446744073709551616',
				}),
			).toEqual(expectedError);
		});
	});

	describe('legacyAddress', () => {
		let addressSchema: object;
		beforeEach(() => {
			addressSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'legacyAddress',
							},
						},
					},
				],
			};
			// validate = validator.compile(addressSchema);
		});

		it('should validate to true when valid address is provided', () => {
			expect(
				validator.validate(addressSchema, { target: '14815133512790761431L' }),
			).toEqual([]);
		});

		it('should validate to false when address with leading zeros is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'legacyAddress' },
					message: 'should match format "legacyAddress"',
				},
			];

			expect(
				validator.validate(addressSchema, { target: '00015133512790761431L' }),
			).toEqual(expectedError);
		});

		it('should validate to false when address including `.` is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'legacyAddress' },
					message: 'should match format "legacyAddress"',
				},
			];

			expect(
				validator.validate(addressSchema, { target: '14.15133512790761431L' }),
			).toEqual(expectedError);
		});

		it('should validate to false when number greater than maximum is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'legacyAddress' },
					message: 'should match format "legacyAddress"',
				},
			];

			expect(
				validator.validate(addressSchema, { target: '18446744073709551616L' }),
			).toEqual(expectedError);
		});

		it('should validate to false when the address does not end with "L"', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'legacyAddress' },
					message: 'should match format "legacyAddress"',
				},
			];

			expect(
				validator.validate(addressSchema, { target: '14815133512790761431X' }),
			).toEqual(expectedError);
		});

		it('should validate to false when the address only contains numbers', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'legacyAddress' },
					message: 'should match format "legacyAddress"',
				},
			];
			expect(
				validator.validate(addressSchema, { target: '18446744073709551616' }),
			).toEqual(expectedError);
		});

		it('should validate to false when the address is less than 2 characters', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'legacyAddress' },
					message: 'should match format "legacyAddress"',
				},
			];

			expect(validator.validate(addressSchema, { target: 'L' })).toEqual(
				expectedError,
			);
		});

		it('should validate to false when it is empty', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'legacyAddress' },
					message: 'should match format "legacyAddress"',
				},
			];

			expect(validator.validate(addressSchema, { target: '' })).toEqual(
				expectedError,
			);
		});
	});

	describe('non-transfer amount', () => {
		let nonTransferAmountSchema: object;
		beforeEach(() => {
			nonTransferAmountSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'nonTransferAmount',
							},
						},
					},
				],
			};
			// validate = validator.compile(nonTransferAmountSchema);
		});

		it('should validate to true when valid amount is provided', () => {
			expect(
				validator.validate(nonTransferAmountSchema, { target: '0' }),
			).toEqual([]);
		});

		it('should validate to false when invalid amount with leading zeros is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'nonTransferAmount' },
					message: 'should match format "nonTransferAmount"',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, { target: '000001' }),
			).toEqual(expectedError);
		});

		it('should validate to false when number greater than maximum is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'nonTransferAmount' },
					message: 'should match format "nonTransferAmount"',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, {
					target: '9223372036854775808',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when decimal number is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'nonTransferAmount' },
					message: 'should match format "nonTransferAmount"',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, { target: '190.105310' }),
			).toEqual(expectedError);
		});

		it('should validate to false when number is provided', () => {
			const expectedError = [
				{
					keyword: 'type',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/type',
					params: { type: 'string' },
					message: 'should be string',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, { target: 190105310 }),
			).toEqual(expectedError);
		});

		it('should validate to false when it is empty', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'nonTransferAmount' },
					message: 'should match format "nonTransferAmount"',
				},
			];

			expect(
				validator.validate(nonTransferAmountSchema, { target: '' }),
			).toEqual(expectedError);
		});
	});

	describe('transfer amount', () => {
		let transferAmountSchema: object;
		beforeEach(() => {
			transferAmountSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'transferAmount',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid amount is provided', () => {
			expect(
				validator.validate(transferAmountSchema, { target: '100' }),
			).toEqual([]);
		});

		it('should validate to true when valid amount with leading zeros is provided', () => {
			expect(
				validator.validate(transferAmountSchema, { target: '000000100' }),
			).toEqual([]);
		});

		it('should validate to false when amount is 0', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'transferAmount' },
					message: 'should match format "transferAmount"',
				},
			];

			expect(validator.validate(transferAmountSchema, { target: '0' })).toEqual(
				expectedError,
			);
		});

		it('should validate to false when number greater than maximum is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'transferAmount' },
					message: 'should match format "transferAmount"',
				},
			];

			expect(
				validator.validate(transferAmountSchema, {
					target: '9223372036854775808',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when decimal number is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'transferAmount' },
					message: 'should match format "transferAmount"',
				},
			];

			expect(
				validator.validate(transferAmountSchema, { target: '190.105310' }),
			).toEqual(expectedError);
		});

		it('should validate to false when number is provided', () => {
			const expectedError = [
				{
					keyword: 'type',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/type',
					params: { type: 'string' },
					message: 'should be string',
				},
			];

			expect(
				validator.validate(transferAmountSchema, { target: 190105310 }),
			).toEqual(expectedError);
		});

		it('should validate to false when it is empty', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'transferAmount' },
					message: 'should match format "transferAmount"',
				},
			];

			expect(validator.validate(transferAmountSchema, { target: '' })).toEqual(
				expectedError,
			);
		});
	});

	describe('fee', () => {
		let feeSchema: object;
		beforeEach(() => {
			feeSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'fee',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid fee is provided', () => {
			expect(validator.validate(feeSchema, { target: '100' })).toEqual([]);
		});

		it('should validate to true when valid fee with leading zeros is provided', () => {
			expect(validator.validate(feeSchema, { target: '000000100' })).toEqual(
				[],
			);
		});

		it('should validate to false when amount is 0', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'fee' },
					message: 'should match format "fee"',
				},
			];

			expect(validator.validate(feeSchema, { target: '0' })).toEqual(
				expectedError,
			);
		});

		it('should validate to false when number greater than maximum is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'fee' },
					message: 'should match format "fee"',
				},
			];

			expect(
				validator.validate(feeSchema, { target: '18446744073709551616' }),
			).toEqual(expectedError);
		});

		it('should validate to false when decimal number is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'fee' },
					message: 'should match format "fee"',
				},
			];

			expect(validator.validate(feeSchema, { target: '190.105310' })).toEqual(
				expectedError,
			);
		});

		it('should validate to false when number is provided', () => {
			const expectedError = [
				{
					keyword: 'type',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/type',
					params: { type: 'string' },
					message: 'should be string',
				},
			];
			expect(validator.validate(feeSchema, { target: 190105310 })).toEqual(
				expectedError,
			);
		});

		it('should validate to false when it is empty', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'fee' },
					message: 'should match format "fee"',
				},
			];

			expect(validator.validate(feeSchema, { target: '' })).toEqual(
				expectedError,
			);
		});
	});

	describe('emptyOrPublicKey', () => {
		let emptyOrPublicKeySchema: object;
		beforeEach(() => {
			emptyOrPublicKeySchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: ['string', 'null'],
								format: 'emptyOrPublicKey',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid publicKey is provided', () => {
			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual([]);
		});

		it('should validate to true when null is provided', () => {
			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target: null,
				}),
			).toEqual([]);
		});

		it('should validate to true when undefined is provided', () => {
			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target: undefined,
				}),
			).toEqual([]);
		});

		it('should validate to true when empty string is provided', () => {
			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target: '',
				}),
			).toEqual([]);
		});

		it('should validate to false when non-hex character is in the publicKey', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'emptyOrPublicKey' },
					message: 'should match format "emptyOrPublicKey"',
				},
			];

			expect(
				validator.validate(emptyOrPublicKeySchema, {
					target:
						'zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual(expectedError);
		});
	});

	describe('publicKey', () => {
		let publicKeySchema: object;
		beforeEach(() => {
			publicKeySchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'publicKey',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid publicKey is provided', () => {
			expect(
				validator.validate(publicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual([]);
		});

		it('should validate to false when non-hex character is in the publicKey', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(
				validator.validate(publicKeySchema, {
					target:
						'zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when publicKey is shorter', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(
				validator.validate(publicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when publicKey is longer', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(
				validator.validate(publicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when signed publicKey is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(
				validator.validate(publicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when it is empty', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'publicKey' },
					message: 'should match format "publicKey"',
				},
			];

			expect(validator.validate(publicKeySchema, { target: '' })).toEqual(
				expectedError,
			);
		});
	});

	describe('signedPublicKey', () => {
		let signedPublicKeySchema: object;
		beforeEach(() => {
			signedPublicKeySchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'signedPublicKey',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid + and publicKey is provided', () => {
			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual([]);
		});

		it('should validate to true when valid - and publicKey is provided', () => {
			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual([]);
		});

		it('should validate to false when non-hex character is in the publicKey', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'+zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when publicKey is shorter', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when publicKey is longer', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when non-signed publicKey is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(
				validator.validate(signedPublicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when it is empty', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'signedPublicKey' },
					message: 'should match format "signedPublicKey"',
				},
			];

			expect(validator.validate(signedPublicKeySchema, { target: '' })).toEqual(
				expectedError,
			);
		});
	});

	describe('additionPublicKey', () => {
		let additionPublicKeySchema: object;
		beforeEach(() => {
			additionPublicKeySchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'additionPublicKey',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid + and publicKey is provided', () => {
			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual([]);
		});

		it('should validate to false when valid - and publicKey is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when non-hex character is in the publicKey', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'+zzzzze75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when publicKey is shorter', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when publicKey is longer', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when non-signed publicKey is provided', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, {
					target:
						'05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b1',
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when it is empty', () => {
			const expectedError = [
				{
					keyword: 'format',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/format',
					params: { format: 'additionPublicKey' },
					message: 'should match format "additionPublicKey"',
				},
			];

			expect(
				validator.validate(additionPublicKeySchema, { target: '' }),
			).toEqual(expectedError);
		});
	});

	describe('uniqueSignedPublicKeys', () => {
		let uniqueSignedPublicKeysSchema: object;
		beforeEach(() => {
			uniqueSignedPublicKeysSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'array',
								uniqueSignedPublicKeys: true,
							},
						},
					},
				],
			};
		});

		it('should validate to true when unique signedPublicKey is provided', () => {
			expect(
				validator.validate(uniqueSignedPublicKeysSchema, {
					target: [
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+278a9aecf13e324c42d73cae7e21e5efc1520afb1abcda084d086d24441ed2b4',
					],
				}),
			).toEqual([]);
		});

		it('should validate to false when publicKeys are duplicated without the sign', () => {
			const expectedError = [
				{
					keyword: 'uniqueSignedPublicKeys',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/uniqueSignedPublicKeys',
					params: { keyword: 'uniqueSignedPublicKeys' },
					message: 'should pass "uniqueSignedPublicKeys" keyword validation',
				},
			];
			expect(
				validator.validate(uniqueSignedPublicKeysSchema, {
					target: [
						'-05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
					],
				}),
			).toEqual(expectedError);
		});

		it('should validate to false when publicKeys are duplicated with the same sign', () => {
			const expectedError = [
				{
					keyword: 'uniqueSignedPublicKeys',
					dataPath: '.target',
					schemaPath: '#/allOf/1/properties/target/uniqueSignedPublicKeys',
					params: { keyword: 'uniqueSignedPublicKeys' },
					message: 'should pass "uniqueSignedPublicKeys" keyword validation',
				},
			];

			expect(
				validator.validate(uniqueSignedPublicKeysSchema, {
					target: [
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
						'+05e1ce75b98d6051030e4e416483515cf8360be1a1bd6d2c14d925700dae021b',
					],
				}),
			).toEqual(expectedError);
		});
	});

	describe('noNullCharacter', () => {
		let noNullCharacterSchema: object;
		beforeEach(() => {
			noNullCharacterSchema = {
				allOf: [
					baseSchema,
					{
						properties: {
							target: {
								type: 'string',
								format: 'noNullCharacter',
							},
						},
					},
				],
			};
		});

		it('should validate to true when valid string is provided', () => {
			expect(
				validator.validate(noNullCharacterSchema, {
					target: 'some normal string',
				}),
			).toEqual([]);
		});

		it('should validate to true when it is empty', () => {
			expect(validator.validate(noNullCharacterSchema, { target: '' })).toEqual(
				[],
			);
		});

		it('should validate to false when string with null byte is provided', () => {
			const nullCharacterList = ['\0', '\x00', '\u0000'];
			nullCharacterList.forEach(nullChar => {
				const expectedError = [
					{
						keyword: 'format',
						dataPath: '.target',
						schemaPath: '#/allOf/1/properties/target/format',
						params: { format: 'noNullCharacter' },
						message: 'should match format "noNullCharacter"',
					},
				];

				expect(
					validator.validate(noNullCharacterSchema, {
						target: `${nullChar} hey \x01 :)`,
					}),
				).toEqual(expectedError);
			});
		});
	});
});
