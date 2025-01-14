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

import { Slots } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { delegatesUserNamesSchema, forgerListSchema, voteWeightsSchema } from '../../src/schemas';
import * as randomSeedModule from '../../src/random_seed';
import { Dpos } from '../../src';
import { Account, BlockHeader, VoteWeights, DelegateWeight } from '../../src/types';
import { BLOCK_TIME } from '../fixtures/constants';
import { getDelegateAccounts } from '../utils/round_delegates';
import { StateStoreMock } from '../utils/state_store_mock';
import {
	CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
	CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
	CHAIN_STATE_DELEGATE_USERNAMES,
} from '../../src/constants';
import { randomBigIntWithPowerof8 } from '../utils/random_int';
import * as delegateAddresses from '../fixtures/delegate_addresses.json';

const MS_IN_A_SEC = 1000;
const GENESIS_BLOCK_TIMESTAMP = new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;

const convertVoteWeight = (buffer: Buffer): VoteWeights => {
	const { voteWeights: parsedVoteWeights } = codec.decode(voteWeightsSchema, buffer);

	const voteWeights = parsedVoteWeights.map((vw: any) => ({
		round: vw.round,
		delegates: vw.delegates.map((d: any) => ({
			address: Buffer.from(d.address, 'binary'),
			voteWeight: BigInt(d.voteWeight),
		})),
	}));
	return voteWeights;
};

describe('Vote weight snapshot', () => {
	const { accounts: forgers, publicKeyMap } = getDelegateAccounts(103);
	const defaultLastBlockHeader = { timestamp: 12300 } as BlockHeader;

	let dpos: Dpos;
	let chainStub: any;
	let stateStore: StateStoreMock;

	beforeEach(() => {
		chainStub = {
			slots: new Slots({
				genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
				interval: BLOCK_TIME,
			}) as any,
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
				getConsensusState: jest.fn().mockResolvedValue(undefined),
				getDelegateAccounts: jest.fn().mockResolvedValue([]),
				getDelegates: jest.fn().mockResolvedValue([]),
			},
		};
		const initDelegates = delegateAddresses.map(addr => Buffer.from(addr, 'base64'));
		dpos = new Dpos({
			chain: chainStub,
			initDelegates,
			genesisBlockHeight: 0,
			initRound: 3,
		});

		const forgerListObject = {
			forgersList: [
				{
					round: 1,
					delegates: [...forgers.map(d => d.address).slice(0, 102)],
					standby: [],
				},
			],
		};

		const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

		stateStore = new StateStoreMock(
			[],
			{},
			{
				lastBlockHeaders: [defaultLastBlockHeader],
				chainData: {
					[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
				},
			},
		);
	});

	describe('given genesis block', () => {
		let delegates: Account[];
		let genesisBlock: BlockHeader;

		beforeEach(() => {
			// Arrange
			const delegateAccounts1 = getDelegateAccounts(103);
			delegates = delegateAccounts1.accounts;
			for (const delegate of delegates) {
				delegate.asset.delegate.totalVotesReceived = BigInt(10) ** BigInt(12);
			}

			genesisBlock = {
				id: Buffer.from('genesis-block'),
				timestamp: 10,
				height: 0,
				version: 0,
				generatorPublicKey: delegateAccounts1.publicKeyMap.get(forgers[0].address),
				reward: BigInt(500000000),
				asset: {
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
				},
			} as BlockHeader;
			stateStore = new StateStoreMock(
				[...delegates],
				{},
				{ lastBlockHeaders: [defaultLastBlockHeader] },
			);
		});

		describe('when apply is called', () => {
			it('should not save any vote snapshot', async () => {
				// Act
				await dpos.apply(genesisBlock, stateStore);

				// Assert
				const voteWeightsBuffer = await stateStore.consensus.get(
					CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
				);

				expect(voteWeightsBuffer).toBeUndefined();
			});
		});
	});

	describe('given block within the bootstrap period', () => {
		describe('when the block is not the last block of the round', () => {
			let delegates: Account[];
			let block: BlockHeader;

			beforeEach(() => {
				// Arrange
				const delegateAccounts2 = getDelegateAccounts(103);
				delegates = delegateAccounts2.accounts;
				for (const delegate of delegates) {
					delegate.asset.delegate.totalVotesReceived = BigInt(10) ** BigInt(12);
				}
				block = {
					id: Buffer.from('random-block'),
					timestamp: 500,
					height: 50,
					version: 2,
					generatorPublicKey: delegateAccounts2.publicKeyMap.get(forgers[0].address),
					reward: BigInt(500000000),
					asset: {
						seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					},
				} as BlockHeader;
				const forgerListObject = {
					forgersList: [
						{
							round: 1,
							delegates: [...forgers.map(d => d.address).slice(0, 102)],
							standby: [],
						},
					],
				};
				const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);
				stateStore = new StateStoreMock(
					[forgers[0], ...delegates],
					{
						[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
					},
					{
						lastBlockHeaders: [defaultLastBlockHeader],
					},
				);
				jest.spyOn(stateStore.consensus, 'set');
			});

			it('should not snapshot the voteweight', async () => {
				// Act
				await dpos.apply(block, stateStore);

				// Assert
				expect(stateStore.consensus.set).not.toHaveBeenCalled();
				expect(chainStub.dataAccess.getDelegates).not.toHaveBeenCalled();
			});
		});

		describe('when the block is last block of a round', () => {
			let block: BlockHeader;
			let delegates: Account[];
			let updatedDelegate: Account;

			beforeEach(() => {
				const delegateAccounts3 = getDelegateAccounts(200);
				delegates = delegateAccounts3.accounts;
				for (const delegate of delegates) {
					delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(900, 5000);
					delegate.asset.sentVotes.push({
						delegateAddress: delegate.address,
						amount: delegate.asset.delegate.totalVotesReceived,
					});
				}

				const { accounts } = getDelegateAccounts(1);
				[updatedDelegate] = accounts;

				updatedDelegate.asset.delegate.totalVotesReceived = BigInt(6000) * BigInt(10) ** BigInt(9);
				updatedDelegate.asset.sentVotes.push({
					delegateAddress: updatedDelegate.address,
					amount: updatedDelegate.asset.delegate.totalVotesReceived,
				});

				block = {
					id: Buffer.from('random-block'),
					timestamp: 1030,
					height: 103,
					version: 2,
					generatorPublicKey: delegateAccounts3.publicKeyMap.get(forgers[0].address),
					reward: BigInt(500000000),
					asset: {
						seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					},
				} as BlockHeader;

				chainStub.dataAccess.getDelegates.mockResolvedValue([...delegates, updatedDelegate]);

				const forgerListObject = {
					forgersList: [
						{
							round: 1,
							delegates: [...forgers.map(d => d.address).slice(0, 102)],
							standby: [],
						},
					],
				};

				const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

				const voteWeightsObject = {
					voteWeights: [
						{
							round: 11,
							delegates: [
								...delegates.map(d => ({
									address: d.address,
									voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
								})),
							],
						},
					],
				};

				const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

				const updatedVote = BigInt(100) * BigInt(10) ** BigInt(8);

				stateStore = new StateStoreMock(
					[
						forgers[0],
						{
							...updatedDelegate,
							asset: {
								...updatedDelegate.asset,
								delegate: {
									...updatedDelegate.asset.delegate,
									totalVotesReceived: updatedVote,
								},
								sentVotes: [
									{
										delegateAddress: updatedDelegate.address,
										amount: updatedVote,
									},
								],
							},
						},
					],
					{
						[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: Buffer.from(mockedForgersList),
						[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: Buffer.from(mockedVoteWeights),
					},
					{ lastBlockHeaders: [defaultLastBlockHeader] },
				);
			});

			it('should update vote weight', async () => {
				// Act
				await dpos.apply(block, stateStore);

				// Assert
				const voteWeightsBuffer = await stateStore.consensus.get(
					CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
				);

				const { voteWeights } = codec.decode(voteWeightsSchema, voteWeightsBuffer as Buffer);

				expect(voteWeights).toHaveLength(2);
				expect(voteWeights[1].round).toEqual(4);
				const updatedDelegateInList = voteWeights[1].delegates.find((d: Account) =>
					d.address.equals(updatedDelegate.address),
				);
				expect(updatedDelegateInList).toBeUndefined();
			});
		});
	});

	describe('given block not in the bootstrap period', () => {
		describe('given not the last block of a round', () => {
			let delegates: Account[];
			let block: BlockHeader;

			beforeEach(() => {
				// Arrange
				const delegateAccounts4 = getDelegateAccounts(103);
				delegates = delegateAccounts4.accounts;

				for (const delegate of delegates) {
					delegate.asset.delegate.totalVotesReceived = BigInt(10) ** BigInt(12);
				}
				block = {
					id: Buffer.from('random-block'),
					timestamp: 5600,
					height: 560,
					version: 2,
					generatorPublicKey: publicKeyMap.get(forgers[0].address),
					reward: BigInt(500000000),
					asset: {
						seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					},
				} as BlockHeader;
				const forgerListObject = {
					forgersList: [
						{
							round: 6,
							delegates: [...forgers.map(d => d.address).slice(0, 102)],
							standby: [],
						},
					],
				};
				const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);
				stateStore = new StateStoreMock(
					[forgers[0], ...delegates],
					{
						[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
					},
					{
						lastBlockHeaders: [defaultLastBlockHeader],
					},
				);
				jest.spyOn(stateStore.consensus, 'set');
			});

			describe('when apply is called', () => {
				it('should not snapshot the voteweight', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					expect(stateStore.consensus.set).not.toHaveBeenCalled();
					expect(chainStub.dataAccess.getDelegates).not.toHaveBeenCalled();
				});
			});
		});

		describe('given the last block of a round', () => {
			let delegates: Account[];
			let block: BlockHeader;

			describe('when there are changes in the last block', () => {
				let updatedDelegate: Account;

				beforeEach(() => {
					const delegateAccounts5 = getDelegateAccounts(200);
					delegates = delegateAccounts5.accounts;

					for (const delegate of delegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(900, 5000);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}

					const { accounts } = getDelegateAccounts(1);
					[updatedDelegate] = accounts;

					updatedDelegate.asset.delegate.totalVotesReceived =
						BigInt(6000) * BigInt(10) ** BigInt(9);
					updatedDelegate.asset.sentVotes.push({
						delegateAddress: updatedDelegate.address,
						amount: updatedDelegate.asset.delegate.totalVotesReceived,
					});

					block = {
						id: Buffer.from('random-block'),
						timestamp: 10100,
						height: 1030,
						version: 2,
						generatorPublicKey: publicKeyMap.get(forgers[0].address),
						reward: BigInt(500000000),
						asset: {
							seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
						},
					} as BlockHeader;

					chainStub.dataAccess.getDelegates.mockResolvedValue([...delegates, updatedDelegate]);

					// Setup for missed block calculation
					const forgedBlocks = forgers
						.map((f, i) => ({
							generatorPublicKey: publicKeyMap.get(f.address),
							height: 928 + i,
						}))
						.slice(0, 102);
					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(forgedBlocks);

					const forgerListObject = {
						forgersList: [
							{
								round: 10,
								delegates: [...forgers.map(d => d.address).slice(0, 102)],
								standby: [],
							},
						],
					};

					const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

					const voteWeightsObject = {
						voteWeights: [
							{
								round: 11,
								delegates: [
									...delegates.map(d => ({
										address: d.address,
										voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
									})),
								],
							},
						],
					};

					const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

					const updatedVote = BigInt(100) * BigInt(10) ** BigInt(8);

					stateStore = new StateStoreMock(
						[
							forgers[0],
							{
								...updatedDelegate,
								asset: {
									...updatedDelegate.asset,
									delegate: {
										...updatedDelegate.asset.delegate,
										totalVotesReceived: updatedVote,
									},
									sentVotes: [
										{
											delegateAddress: updatedDelegate.address,
											amount: updatedVote,
										},
									],
								},
							},
						],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: Buffer.from(mockedForgersList),
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: Buffer.from(mockedVoteWeights),
						},
						{ lastBlockHeaders: [defaultLastBlockHeader] },
					);

					const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
					const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
					jest
						.spyOn(randomSeedModule, 'generateRandomSeeds')
						.mockReturnValue([randomSeed1, randomSeed2]);
				});

				it('should affect the vote weights snapshot created', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					const voteWeightsBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
					);

					const { voteWeights } = codec.decode(voteWeightsSchema, voteWeightsBuffer as Buffer);

					expect(voteWeights).toHaveLength(2);
					expect(voteWeights[1].round).toEqual(13);
					const updatedDelegateInList = voteWeights[1].delegates.find((d: Account) =>
						d.address.equals(updatedDelegate.address),
					);
					expect(updatedDelegateInList).toBeUndefined();
				});
			});

			describe('when number of registered delegates is less than 103', () => {
				beforeEach(() => {
					const delegateAccounts6 = getDelegateAccounts(50);
					delegates = delegateAccounts6.accounts;

					for (const delegate of delegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(500, 999);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}

					block = {
						id: Buffer.from('random-block'),
						timestamp: 10100,
						height: 1030,
						version: 2,
						generatorPublicKey: publicKeyMap.get(forgers[0].address),
						reward: BigInt(500000000),
						asset: {
							seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
						},
					} as BlockHeader;

					// Setup for missed block calculation
					const forgedBlocks = forgers
						.map((forger, i) => ({
							generatorPublicKey: publicKeyMap.get(forger.address),
							height: 928 + i,
						}))
						.slice(0, 102);

					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(forgedBlocks);

					const forgerListObject = {
						forgersList: [
							{
								round: 10,
								delegates: [...forgers.map(d => d.address).slice(0, 102)],
								standby: [],
							},
						],
					};

					const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

					const voteWeightsObject = {
						voteWeights: [
							{
								round: 11,
								delegates: [
									...delegates.map(d => ({
										address: d.address,
										voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
									})),
								],
							},
						],
					};

					const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

					const mockedDelegateUsernamesObject = {
						registeredDelegates: [
							...delegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
							{
								address: forgers[0].address,
								username: forgers[0].asset.delegate.username,
							},
						],
					};

					const mockedDelegateUsernames = codec.encode(
						delegatesUserNamesSchema,
						mockedDelegateUsernamesObject,
					);

					stateStore = new StateStoreMock(
						[...delegates, forgers[0]],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: mockedVoteWeights,
						},
						{
							lastBlockHeaders: [defaultLastBlockHeader],
							chainData: {
								[CHAIN_STATE_DELEGATE_USERNAMES]: mockedDelegateUsernames,
							},
						},
					);

					const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
					const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
					jest
						.spyOn(randomSeedModule, 'generateRandomSeeds')
						.mockReturnValue([randomSeed1, randomSeed2]);
				});

				it('should snapshot all of the delegates', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					const voteWeightsBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
					);
					const voteWeights = convertVoteWeight(voteWeightsBuffer as Buffer);
					expect(voteWeights).toHaveLength(2);
					expect(voteWeights[1].round).toEqual(13);
					// 50 and the forger is in the list
					expect(voteWeights[1].delegates).toHaveLength(50 + 1);
					const originalDelegatesCounts = voteWeights[0].delegates.reduce(
						(prev: number, current: DelegateWeight) => {
							const exist = delegates.find(d => d.address.equals(current.address));
							return exist ? prev + 1 : prev;
						},
						0,
					);
					// All the non zero delegate from the database should be in the list
					expect(originalDelegatesCounts).toEqual(delegates.length);
				});
			});

			describe('when there are less than 2 delegates who have received votes more than the threshold (1000 * 10^8)', () => {
				let additionalDelegates: Account[];
				beforeEach(() => {
					const delegateAccounts7 = getDelegateAccounts(101);
					delegates = delegateAccounts7.accounts;

					for (const delegate of delegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(1000, 1100);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					const { accounts } = getDelegateAccounts(2);
					additionalDelegates = accounts;

					for (const delegate of additionalDelegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(10, 999);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					block = {
						id: 'random-block',
						timestamp: 10100,
						height: 1030,
						version: 2,
						generatorPublicKey: publicKeyMap.get(forgers[0].address),
						reward: BigInt(500000000),
						totalFee: BigInt(100000000),
						asset: {
							seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
						},
					} as BlockHeader;

					const mockedDelegateUsernamesObject = {
						registeredDelegates: [
							...delegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
							...additionalDelegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
						],
					};

					const mockedDelegateUsernames = codec.encode(
						delegatesUserNamesSchema,
						mockedDelegateUsernamesObject,
					);

					// Setup for missed block calculation
					const forgedBlocks = forgers
						.map((forger, i) => ({
							generatorPublicKey: publicKeyMap.get(forger.address),
							height: 928 + i,
						}))
						.slice(0, 102);
					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(forgedBlocks);

					const forgerListObject = {
						forgersList: [
							{
								round: 10,
								delegates: [...forgers.map(d => d.address).slice(0, 102)],
								standby: [],
							},
						],
					};

					const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

					const voteWeightsObject = {
						voteWeights: [
							{
								round: 11,
								delegates: [
									...delegates.map(d => ({
										address: d.address,
										voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
									})),
								],
							},
						],
					};

					const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

					stateStore = new StateStoreMock(
						[...delegates, ...additionalDelegates, forgers[0]],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: mockedVoteWeights,
						},
						{
							lastBlockHeaders: [defaultLastBlockHeader],
							chainData: {
								[CHAIN_STATE_DELEGATE_USERNAMES]: mockedDelegateUsernames,
							},
						},
					);

					const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
					const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
					jest
						.spyOn(randomSeedModule, 'generateRandomSeeds')
						.mockReturnValue([randomSeed1, randomSeed2]);
				});

				it('should snapshot top 103 delegates', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					const voteWeightsBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
					);
					const voteWeights = convertVoteWeight(voteWeightsBuffer as Buffer);
					expect(voteWeights).toHaveLength(2);
					expect(voteWeights[1].round).toEqual(13);
					expect(voteWeights[1].delegates).toHaveLength(103);
					expect(
						additionalDelegates.every((delegate: Account) =>
							voteWeights[1].delegates.find((d: DelegateWeight) =>
								d.address.equals(delegate.address),
							),
						),
					).toBeTrue();
				});
			});

			describe('when there are more than 2 delegates who have received votes more than the threshold (1000 * 10^8)', () => {
				let additionalDelegates: Account[];
				beforeEach(() => {
					const delegateAccounts8 = getDelegateAccounts(101);
					delegates = delegateAccounts8.accounts;

					for (const delegate of delegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(3000, 5000);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					const { accounts } = getDelegateAccounts(300);
					additionalDelegates = accounts;
					for (const delegate of additionalDelegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(1000, 2999);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					block = {
						id: Buffer.from('random-block'),
						timestamp: 10100,
						height: 1030,
						version: 2,
						generatorPublicKey: publicKeyMap.get(forgers[0].address),
						reward: BigInt(500000000),
						asset: {
							seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
						},
					} as BlockHeader;

					const mockedDelegateUsernamesObject = {
						registeredDelegates: [
							...delegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
							...additionalDelegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
						],
					};

					const mockedDelegateUsernames = codec.encode(
						delegatesUserNamesSchema,
						mockedDelegateUsernamesObject,
					);

					// Setup for missed block calculation
					const forgedBlocks = forgers
						.map((forger, i) => ({
							generatorPublicKey: publicKeyMap.get(forger.address),
							height: 928 + i,
						}))
						.slice(0, 102);
					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(forgedBlocks);

					const voteWeightsObject = {
						voteWeights: [
							{
								round: 11,
								delegates: [
									...delegates.map(d => ({
										address: d.address,
										voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
									})),
								],
							},
						],
					};

					const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

					const forgerListObject = {
						forgersList: [
							{
								round: 10,
								delegates: [...forgers.map(d => d.address).slice(0, 102)],
								standby: [],
							},
						],
					};

					const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

					stateStore = new StateStoreMock(
						[...delegates, ...additionalDelegates, forgers[0]],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: mockedVoteWeights,
						},
						{
							lastBlockHeaders: [defaultLastBlockHeader],
							chainData: {
								[CHAIN_STATE_DELEGATE_USERNAMES]: mockedDelegateUsernames,
							},
						},
					);

					const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
					const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
					jest
						.spyOn(randomSeedModule, 'generateRandomSeeds')
						.mockReturnValue([randomSeed1, randomSeed2]);
				});

				it('should snapshot all the delegates who has more than the threshold', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					const voteWeightsBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
					);
					const voteWeights = convertVoteWeight(voteWeightsBuffer as Buffer);
					expect(voteWeights).toHaveLength(2);
					expect(voteWeights[1].round).toEqual(13);
					expect(voteWeights[1].delegates).toHaveLength(
						delegates.length + additionalDelegates.length,
					);
					expect(
						additionalDelegates.every((delegate: Account) =>
							voteWeights[1].delegates.find((d: DelegateWeight) =>
								d.address.equals(delegate.address),
							),
						),
					).toBeTrue();
				});
			});

			describe('when there are non-self voting delegate within the top 101 delegates', () => {
				let additionalDelegates: Account[];
				let nonSelfVotedDelegate: Account;

				beforeEach(() => {
					const delegateAccounts9 = getDelegateAccounts(101);
					delegates = delegateAccounts9.accounts;

					for (const delegate of delegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(3000, 5000);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					[nonSelfVotedDelegate] = delegates;
					// Update not to self vote
					(nonSelfVotedDelegate.asset.sentVotes[0] as any).delegateAddress = Buffer.from('123L');
					const { accounts } = getDelegateAccounts(300);
					additionalDelegates = accounts;
					for (const delegate of additionalDelegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(1000, 2999);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					block = {
						id: Buffer.from('random-block'),
						timestamp: 10100,
						height: 1030,
						version: 2,
						generatorPublicKey: publicKeyMap.get(forgers[0].address),
						reward: BigInt(500000000),
						asset: {
							seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
						},
					} as BlockHeader;

					const mockedDelegateUsernamesObject = {
						registeredDelegates: [
							...delegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
							...additionalDelegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
						],
					};

					const mockedDelegateUsernames = codec.encode(
						delegatesUserNamesSchema,
						mockedDelegateUsernamesObject,
					);

					// Setup for missed block calculation
					const forgedBlocks = forgers
						.map((forger, i) => ({
							generatorPublicKey: publicKeyMap.get(forger.address),
							height: 928 + i,
						}))
						.slice(0, 102);
					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(forgedBlocks);

					const voteWeightsObject = {
						voteWeights: [
							{
								round: 11,
								delegates: [
									...delegates.map(d => ({
										address: d.address,
										voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
									})),
								],
							},
						],
					};

					const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

					const forgerListObject = {
						forgersList: [
							{
								round: 10,
								delegates: [...forgers.map(d => d.address).slice(0, 102)],
								standby: [],
							},
						],
					};

					const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

					stateStore = new StateStoreMock(
						[...delegates, ...additionalDelegates, forgers[0]],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: mockedVoteWeights,
						},
						{
							lastBlockHeaders: [defaultLastBlockHeader],
							chainData: {
								[CHAIN_STATE_DELEGATE_USERNAMES]: mockedDelegateUsernames,
							},
						},
					);

					const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
					const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
					jest
						.spyOn(randomSeedModule, 'generateRandomSeeds')
						.mockReturnValue([randomSeed1, randomSeed2]);
				});

				it('should not include the non self voted delegate', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					const voteWeightsBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
					);
					const voteWeights = convertVoteWeight(voteWeightsBuffer as Buffer);
					expect(voteWeights).toHaveLength(2);
					expect(voteWeights[1].round).toEqual(13);
					expect(
						voteWeights[1].delegates.find((d: DelegateWeight) =>
							d.address.equals(nonSelfVotedDelegate.address),
						),
					).toBeUndefined();
					expect(voteWeights[1].delegates).toHaveLength(
						delegates.length + additionalDelegates.length - 1,
					);
				});
			});

			describe('when there are banned delegates within the top 101 delegates', () => {
				let additionalDelegates: Account[];
				let bannedDelegate: Account;

				beforeEach(() => {
					const delegateAccounts10 = getDelegateAccounts(101);
					delegates = delegateAccounts10.accounts;
					for (const delegate of delegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(3000, 5000);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					[bannedDelegate] = delegates;
					delegates[0].asset.delegate.isBanned = true;
					const { accounts } = getDelegateAccounts(300);
					additionalDelegates = accounts;
					for (const delegate of additionalDelegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(1000, 2999);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					block = {
						id: Buffer.from('random-block'),
						timestamp: 10100,
						height: 1030,
						version: 2,
						generatorPublicKey: publicKeyMap.get(forgers[0].address),
						reward: BigInt(500000000),
						asset: {
							seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
						},
					} as BlockHeader;

					const mockedDelegateUsernamesObject = {
						registeredDelegates: [
							...delegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
							...additionalDelegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
						],
					};

					const mockedDelegateUsernames = codec.encode(
						delegatesUserNamesSchema,
						mockedDelegateUsernamesObject,
					);

					// Setup for missed block calculation
					const forgedBlocks = forgers
						.map((forger, i) => ({
							generatorPublicKey: publicKeyMap.get(forger.address),
							height: 928 + i,
						}))
						.slice(0, 102);
					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(forgedBlocks);

					const forgerListObject = {
						forgersList: [
							{
								round: 10,
								delegates: [...forgers.map(d => d.address).slice(0, 102)],
								standby: [],
							},
						],
					};

					const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

					const voteWeightsObject = {
						voteWeights: [
							{
								round: 11,
								delegates: [
									...delegates.map(d => ({
										address: d.address,
										voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
									})),
								],
							},
						],
					};

					const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

					stateStore = new StateStoreMock(
						[...delegates, ...additionalDelegates, forgers[0]],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: mockedVoteWeights,
						},
						{
							lastBlockHeaders: [defaultLastBlockHeader],
							chainData: {
								[CHAIN_STATE_DELEGATE_USERNAMES]: mockedDelegateUsernames,
							},
						},
					);

					const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
					const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
					jest
						.spyOn(randomSeedModule, 'generateRandomSeeds')
						.mockReturnValue([randomSeed1, randomSeed2]);
				});

				it('should not include the banned delegate', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					const voteWeightsBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
					);
					const voteWeights = convertVoteWeight(voteWeightsBuffer as Buffer);
					expect(voteWeights).toHaveLength(2);
					expect(voteWeights[1].round).toEqual(13);
					expect(
						voteWeights[1].delegates.find((d: DelegateWeight) =>
							d.address.equals(bannedDelegate.address),
						),
					).toBeUndefined();
					expect(voteWeights[1].delegates).toHaveLength(
						delegates.length + additionalDelegates.length - 1,
					);
				});
			});

			describe('when there are delegates who are being punished within the top 101 delegates, and the list is not sufficient', () => {
				let punishedDelegate: Account;

				beforeEach(() => {
					// 102 because forger is included as zero vote weight delegate
					const delegateAccounts11 = getDelegateAccounts(102);
					delegates = delegateAccounts11.accounts;

					for (const delegate of delegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(10, 999);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					[punishedDelegate] = delegates;
					delegates[0].asset.delegate.pomHeights.push(10);
					block = {
						id: Buffer.from('random-block'),
						timestamp: 10100,
						height: 1030,
						version: 2,
						generatorPublicKey: publicKeyMap.get(forgers[0].address),
						reward: BigInt(500000000),
						asset: {
							seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
						},
					} as BlockHeader;

					const mockedDelegateUsernamesObject = {
						registeredDelegates: [
							...delegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
							{
								username: forgers[0].asset.delegate.username,
								address: forgers[0].address,
							},
						],
					};

					const mockedDelegateUsernames = codec.encode(
						delegatesUserNamesSchema,
						mockedDelegateUsernamesObject,
					);

					// Setup for missed block calculation
					const forgedBlocks = forgers
						.map((forger, i) => ({
							generatorPublicKey: publicKeyMap.get(forger.address),
							height: 928 + i,
						}))
						.slice(0, 102);
					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(forgedBlocks);

					const forgerListObject = {
						forgersList: [
							{
								round: 10,
								delegates: [...forgers.map(d => d.address).slice(0, 100)],
								standby: [...forgers.map(d => d.address).slice(101, 102)],
							},
						],
					};

					const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

					const voteWeightsObject = {
						voteWeights: [
							{
								round: 11,
								delegates: [
									...delegates.slice(0, 100).map(d => ({
										address: d.address,
										voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
									})),
								],
							},
						],
					};

					const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

					stateStore = new StateStoreMock(
						[...delegates, forgers[0]],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: mockedVoteWeights,
						},
						{
							lastBlockHeaders: [defaultLastBlockHeader],
							chainData: {
								[CHAIN_STATE_DELEGATE_USERNAMES]: mockedDelegateUsernames,
							},
						},
					);

					const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
					const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
					jest
						.spyOn(randomSeedModule, 'generateRandomSeeds')
						.mockReturnValue([randomSeed1, randomSeed2]);
				});

				it('should include the punished delegate as vote weight 0', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					const voteWeightsBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
					);
					const voteWeights = convertVoteWeight(voteWeightsBuffer as Buffer);
					expect(voteWeights).toHaveLength(2);
					expect(voteWeights[1].round).toEqual(13);
					const snapshotedPunishedDelegate = voteWeights[1].delegates.find((d: DelegateWeight) =>
						d.address.equals(punishedDelegate.address),
					);
					expect(snapshotedPunishedDelegate?.voteWeight).toEqual(BigInt(0));
					expect(voteWeights[1].delegates).toHaveLength(103);
				});
			});

			describe('when there are delegates who are being punished within the top 101 delegates, but there are enough delegates', () => {
				let additionalDelegates: Account[];
				let punishedDelegate: Account;

				beforeEach(() => {
					const delegateAccounts12 = getDelegateAccounts(101);
					delegates = delegateAccounts12.accounts;
					for (const delegate of delegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(3000, 5000);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					[punishedDelegate] = delegates;
					delegates[0].asset.delegate.pomHeights.push(10);
					const { accounts } = getDelegateAccounts(300);
					additionalDelegates = accounts;
					for (const delegate of additionalDelegates) {
						delegate.asset.delegate.totalVotesReceived = randomBigIntWithPowerof8(1000, 2999);
						delegate.asset.sentVotes.push({
							delegateAddress: delegate.address,
							amount: delegate.asset.delegate.totalVotesReceived,
						});
					}
					block = {
						id: Buffer.from('random-block'),
						timestamp: 10100,
						height: 1030,
						version: 2,
						generatorPublicKey: publicKeyMap.get(forgers[0].address),
						reward: BigInt(500000000),
						asset: {
							seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
						},
					} as BlockHeader;

					const mockedDelegateUsernamesObject = {
						registeredDelegates: [
							...delegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
							...additionalDelegates.map(delegate => ({
								address: delegate.address,
								username: delegate.asset.delegate.username,
							})),
						],
					};

					const mockedDelegateUsernames = codec.encode(
						delegatesUserNamesSchema,
						mockedDelegateUsernamesObject,
					);

					// Setup for missed block calculation
					const forgedBlocks = forgers
						.map((forger, i) => ({
							generatorPublicKey: publicKeyMap.get(forger.address),
							height: 928 + i,
						}))
						.slice(0, 102);
					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(forgedBlocks);

					const forgerListObject = {
						forgersList: [
							{
								round: 10,
								delegates: [...forgers.map(d => d.address).slice(0, 102)],
								standby: [],
							},
						],
					};

					const mockedForgersList = codec.encode(forgerListSchema, forgerListObject);

					const voteWeightsObject = {
						voteWeights: [
							{
								round: 11,
								delegates: [
									...delegates.map(d => ({
										address: d.address,
										voteWeight: BigInt(d.asset.delegate.totalVotesReceived),
									})),
								],
							},
						],
					};

					const mockedVoteWeights = codec.encode(voteWeightsSchema, voteWeightsObject);

					stateStore = new StateStoreMock(
						[...delegates, ...additionalDelegates, forgers[0]],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: mockedForgersList,
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: mockedVoteWeights,
						},
						{
							lastBlockHeaders: [defaultLastBlockHeader],
							chainData: {
								[CHAIN_STATE_DELEGATE_USERNAMES]: mockedDelegateUsernames,
							},
						},
					);

					const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
					const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
					jest
						.spyOn(randomSeedModule, 'generateRandomSeeds')
						.mockReturnValue([randomSeed1, randomSeed2]);
				});

				it('should not include the delegate who is being punished', async () => {
					// Act
					await dpos.apply(block, stateStore);

					// Assert
					const voteWeightsBuffer = await stateStore.consensus.get(
						CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
					);
					const voteWeights = convertVoteWeight(voteWeightsBuffer as Buffer);
					expect(voteWeights).toHaveLength(2);
					expect(voteWeights[1].round).toEqual(13);
					expect(
						voteWeights[1].delegates.find((d: DelegateWeight) =>
							d.address.equals(punishedDelegate.address),
						),
					).toBeUndefined();
					expect(voteWeights[1].delegates).toHaveLength(
						delegates.length + additionalDelegates.length - 1,
					);
				});
			});
		});
	});
});
