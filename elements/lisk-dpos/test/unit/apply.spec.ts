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

import { Slots } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { voteWeightsSchema, forgerListSchema, delegatesUserNamesSchema } from '../../src/schemas';
import * as randomSeedModule from '../../src/random_seed';
import { Dpos, constants } from '../../src';
import { Account, BlockHeader, DecodedVoteWeights, DecodedForgersList } from '../../src/types';
import { BLOCK_TIME, ACTIVE_DELEGATES, STANDBY_DELEGATES } from '../fixtures/constants';
import {
	getDelegateAccounts,
	getDelegateAccountsWithVotesReceived,
} from '../utils/round_delegates';
import {
	CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
	CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
	CHAIN_STATE_DELEGATE_USERNAMES,
} from '../../src/constants';
import { StateStoreMock } from '../utils/state_store_mock';
import * as delegateAddresses from '../fixtures/delegate_addresses.json';

const MS_IN_A_SEC = 1000;
const GENESIS_BLOCK_TIMESTAMP = new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;

describe('dpos.apply()', () => {
	const { accounts: delegateAccounts, publicKeyMap } = getDelegateAccountsWithVotesReceived(
		ACTIVE_DELEGATES + STANDBY_DELEGATES,
	);
	const defaultLastBlockHeader = { timestamp: 12300 } as BlockHeader;

	let dpos: Dpos;
	let chainStub: any;
	let stateStore: StateStoreMock;
	const randomSeed1 = Buffer.from('283f543e68fea3c08e976ef66acd3586');
	const randomSeed2 = Buffer.from('354c87fa7674a8061920b9daafce92af');
	const initDelegates = delegateAddresses.map(addr => Buffer.from(addr, 'base64'));

	beforeEach(() => {
		// Arrange
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

		dpos = new Dpos({
			chain: chainStub,
			initDelegates,
			initRound: 1,
			genesisBlockHeight: 0,
		});

		stateStore = new StateStoreMock(
			[...delegateAccounts],
			{},
			{ lastBlockHeaders: [defaultLastBlockHeader] },
		);

		jest.spyOn(randomSeedModule, 'generateRandomSeeds').mockReturnValue([randomSeed1, randomSeed2]);
	});

	describe('Given block is the genesis block', () => {
		let genesisBlock: BlockHeader;
		let generator: Account;

		beforeEach(() => {
			generator = { ...delegateAccounts[0] };
			// Arrange
			genesisBlock = {
				id: Buffer.from('genesis-block'),
				timestamp: 10,
				height: 0,
				version: 0,
				generatorPublicKey: publicKeyMap.get(generator.address),
				reward: BigInt(500000000),
				asset: {
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
				},
			} as BlockHeader;

			stateStore = new StateStoreMock(
				[generator, ...delegateAccounts],
				{},
				{ lastBlockHeaders: [defaultLastBlockHeader] },
			);
		});

		it('save initial account usernames to the chain state', async () => {
			// Act
			await dpos.apply(genesisBlock, stateStore);

			// Assert
			const usernameBuffer = await stateStore.chain.get(CHAIN_STATE_DELEGATE_USERNAMES);

			const { registeredDelegates } = codec.decode<{
				registeredDelegates: { username: string; address: Buffer }[];
			}>(delegatesUserNamesSchema, usernameBuffer as Buffer);

			// delegate account and generator
			expect(registeredDelegates).toHaveLength(delegateAccounts.length + 1);
		});

		it('should save save forgers list for init rounds', async () => {
			// Act
			await dpos.apply(genesisBlock, stateStore);

			// Assert
			const forgersListBuffer = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);

			const { forgersList } = codec.decode<DecodedForgersList>(
				forgerListSchema,
				forgersListBuffer as Buffer,
			);

			expect(forgersList).toHaveLength(dpos.rounds.initRound);
			expect(forgersList[0].round).toEqual(1);
		});

		it('should resolve with "false"', async () => {
			// Act
			const result = await dpos.apply(genesisBlock, stateStore);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('given the last block of the bootstrap period', () => {
		let lastBlockOfRound: BlockHeader;
		let forgedDelegates: Account[];

		beforeEach(() => {
			const { accounts, publicKeyMap: publicKeyMap1 } = getDelegateAccountsWithVotesReceived(
				ACTIVE_DELEGATES + STANDBY_DELEGATES,
			);
			forgedDelegates = accounts;

			const delegateVoteWeights = [
				{
					round: 4,
					delegates: forgedDelegates.map(d => ({
						address: d.address,
						voteWeight: d.asset.delegate.totalVotesReceived,
					})),
				},
			];

			const encodedDelegateVoteWeights = codec.encode(voteWeightsSchema, {
				voteWeights: delegateVoteWeights,
			});

			const forgersList = {
				forgersList: [
					{
						round: 1,
						delegates: initDelegates,
						standby: [],
					},
					{
						round: 2,
						delegates: initDelegates,
						standby: [],
					},
					{
						round: 3,
						delegates: initDelegates,
						standby: [],
					},
				],
			};

			stateStore = new StateStoreMock(
				[...forgedDelegates],
				{
					[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: encodedDelegateVoteWeights,
					[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
				},
				{ lastBlockHeaders: [defaultLastBlockHeader] },
			);

			const forgedBlocks = forgedDelegates.map((delegate, i) => ({
				generatorPublicKey: publicKeyMap1.get(delegate.address),
				height: i,
			}));
			forgedBlocks.splice(forgedBlocks.length - 1);

			lastBlockOfRound = {
				height: 309,
				generatorPublicKey: publicKeyMap1.get(forgedDelegates[forgedDelegates.length - 1].address),
			} as BlockHeader;

			chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(forgedBlocks);
		});

		it('should save next round forgers in forgers list after applying last block of round', async () => {
			// Arrange
			const currentRound = dpos.rounds.calcRound(lastBlockOfRound.height);
			const nextRound = dpos.rounds.calcRound(lastBlockOfRound.height + 1);

			// Act
			await dpos.apply(lastBlockOfRound, stateStore);

			// Assert
			// make sure we calculate round number correctly
			expect(nextRound).toBe(currentRound + 1);
			// we must delete the delegate list before creating the new one
			const forgersListBuffer = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);

			const { forgersList } = codec.decode(forgerListSchema, forgersListBuffer as Buffer);

			const forgers = forgersList.find((fl: { round: number }) => fl.round === nextRound);

			expect(forgers?.round).toEqual(nextRound);
		});
	});

	describe('Given block is NOT the last block of the round', () => {
		let generator: Account;
		let block: BlockHeader;
		let forgersListBinary: Buffer;

		beforeEach(() => {
			generator = { ...delegateAccounts[1] };
			// Arrange
			block = {
				height: 2,
				generatorPublicKey: publicKeyMap.get(generator.address),
			} as BlockHeader;

			const forgerListObject = {
				forgersList: [
					{
						round: 1,
						delegates: delegateAccounts.map(d => d.address),
						standby: [],
					},
					{
						round: 2,
						delegates: delegateAccounts.map(d => d.address),
						standby: [],
					},
				],
			};
			const { accounts } = getDelegateAccountsWithVotesReceived(103);

			forgersListBinary = codec.encode(forgerListSchema, forgerListObject);

			stateStore = new StateStoreMock(
				[generator, ...accounts],
				{
					[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: forgersListBinary,
				},
				{ lastBlockHeaders: [defaultLastBlockHeader] },
			);
		});

		it('should NOT update forgers list', async () => {
			// Act
			await dpos.apply(block, stateStore);

			// Assert
			const consensusState = await stateStore.consensus.get(CONSENSUS_STATE_DELEGATE_FORGERS_LIST);

			expect((consensusState as Buffer).toString('utf8')).toEqual(
				forgersListBinary.toString('utf8'),
			);
		});

		describe('productivity of forgers', () => {
			let accountsPublicKeys: { accounts: any; publicKeyMap: any };
			let forgedDelegates: Account[];
			let forgersList: DecodedForgersList;
			let delegateVoteWeights: DecodedVoteWeights;

			beforeEach(() => {
				accountsPublicKeys = getDelegateAccounts(103);
				forgedDelegates = accountsPublicKeys.accounts;
				forgersList = {
					forgersList: [
						{
							round: 9,
							delegates: [...forgedDelegates.map(d => d.address)],
							standby: [],
						},
					],
				};
				delegateVoteWeights = {
					voteWeights: [
						{
							round: 10,
							delegates: forgedDelegates.map(d => ({
								address: d.address,
								voteWeight: d.asset.delegate.totalVotesReceived,
							})),
						},
					],
				};
			});

			describe('When only 1 delegate forged since last block', () => {
				// eslint-disable-next-line jest/expect-expect
				it('should increment "consecutiveMissedBlocks" for every forgers except forging delegate', async () => {
					const forgedDelegate = forgedDelegates[forgedDelegates.length - 1];
					// Arrange
					const lastBlock = {
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
						height: 926,
						timestamp: 9260,
					} as BlockHeader;
					block = {
						height: 927,
						timestamp: 10290,
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					} as BlockHeader;
					stateStore = new StateStoreMock(
						[...forgedDelegates],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: codec.encode(
								voteWeightsSchema,
								delegateVoteWeights,
							),
						},
						{ lastBlockHeaders: [lastBlock] },
					);
					// Act
					await dpos.apply(block, stateStore);

					expect.assertions(forgedDelegates.length + 1);
					for (const delegate of forgedDelegates) {
						const updatedAccount = await stateStore.account.get(delegate.address);
						if (delegate.address.equals(forgedDelegate.address)) {
							expect(updatedAccount.asset.delegate.consecutiveMissedBlocks).toEqual(0);
						} else {
							expect(updatedAccount.asset.delegate.consecutiveMissedBlocks).toEqual(1);
						}
					}
					const forger = await stateStore.account.get(forgedDelegate.address);
					expect(forger.asset.delegate.lastForgedHeight).toEqual(block.height);
				});
			});

			describe('When only 2 delegate missed a block since last block', () => {
				it('should increment "consecutiveMissedBlocks" only for forgers who missed a block', async () => {
					const forgedDelegate = forgedDelegates[forgedDelegates.length - 1];
					// Arrange
					const lastBlock = {
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
						height: 926,
						timestamp: 10260,
					} as BlockHeader;
					block = {
						height: 927,
						timestamp: 10290,
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					} as BlockHeader;
					stateStore = new StateStoreMock(
						[...forgedDelegates],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: codec.encode(
								voteWeightsSchema,
								delegateVoteWeights,
							),
						},
						{ lastBlockHeaders: [lastBlock] },
					);
					const forgerIndex = forgersList.forgersList[0].delegates.findIndex(forger =>
						forger.equals(forgedDelegate.address),
					);
					const missedDelegate = [
						forgedDelegates[forgerIndex - 1],
						forgedDelegates[forgerIndex - 2],
					];
					// Act
					await dpos.apply(block, stateStore);

					expect.assertions(forgedDelegates.length);
					for (const delegate of forgedDelegates) {
						const updatedAccount = await stateStore.account.get(delegate.address);
						if (
							missedDelegate.some(missedAccount => missedAccount.address.equals(delegate.address))
						) {
							expect(updatedAccount.asset.delegate.consecutiveMissedBlocks).toEqual(1);
						} else {
							expect(updatedAccount.asset.delegate.consecutiveMissedBlocks).toEqual(0);
						}
					}
				});
			});

			describe('When delegate missed more than 1 blocks since last block', () => {
				it('should increment "consecutiveMissedBlocks"  for the number of blocks that delegate missed ', async () => {
					const forgedDelegate = forgedDelegates[forgedDelegates.length - 1];
					// Arrange
					const lastBlock = {
						// 6 slots are missed twice
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(
							forgedDelegates[forgedDelegates.length - 1 - 6].address,
						),
						height: 926,
						timestamp: 9200,
					} as BlockHeader;
					block = {
						height: 927,
						timestamp: 10290,
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					} as BlockHeader;
					stateStore = new StateStoreMock(
						[...forgedDelegates],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: codec.encode(
								voteWeightsSchema,
								delegateVoteWeights,
							),
						},
						{ lastBlockHeaders: [lastBlock] },
					);
					const forgerIndex = forgersList.forgersList[0].delegates.findIndex(forger =>
						forger.equals(forgedDelegate.address),
					);
					const missedMorethan1Delegates = forgedDelegates.slice(forgerIndex - 5, forgerIndex);
					// Act
					await dpos.apply(block, stateStore);

					expect.assertions(forgedDelegates.length);
					for (const delegate of forgedDelegates) {
						const updatedAccount = await stateStore.account.get(delegate.address);
						if (delegate.address.equals(forgedDelegate.address)) {
							expect(updatedAccount.asset.delegate.consecutiveMissedBlocks).toEqual(0);
						} else if (
							missedMorethan1Delegates.some(missedAccount =>
								missedAccount.address.equals(delegate.address),
							)
						) {
							expect(updatedAccount.asset.delegate.consecutiveMissedBlocks).toEqual(2);
						} else {
							expect(updatedAccount.asset.delegate.consecutiveMissedBlocks).toEqual(1);
						}
					}
				});
			});

			describe('When all delegates successfully forges a block', () => {
				it('should NOT update "consecutiveMissedBlocks" for anyone', async () => {
					// Arrange
					const lastBlock = {
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(
							forgedDelegates[forgedDelegates.length - 2].address,
						),
						height: 926,
						timestamp: 10283,
					} as BlockHeader;
					block = {
						height: 927,
						timestamp: 10290,
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(
							forgedDelegates[forgedDelegates.length - 1].address,
						),
					} as BlockHeader;
					stateStore = new StateStoreMock(
						[...forgedDelegates],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: codec.encode(
								voteWeightsSchema,
								delegateVoteWeights,
							),
						},
						{ lastBlockHeaders: [lastBlock] },
					);

					// Act
					await dpos.apply(block, stateStore);
					expect.assertions(forgedDelegates.length + 1);
					for (const delegate of forgedDelegates) {
						const updatedAccount = await stateStore.account.get(delegate.address);
						expect(updatedAccount.asset.delegate.consecutiveMissedBlocks).toEqual(0);
					}
					const forger = await stateStore.account.get(
						forgedDelegates[forgedDelegates.length - 1].address,
					);
					expect(forger.asset.delegate.lastForgedHeight).toEqual(block.height);
				});
			});

			describe('when forger missed a block has 50 consecutive missed block, but forged within 260k blocks', () => {
				it('should not ban the missed forger', async () => {
					const forgedDelegate = forgedDelegates[forgedDelegates.length - 1];
					// Arrange
					const lastBlock = {
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
						height: 920006,
						timestamp: 10000270,
					} as BlockHeader;
					block = {
						height: 920007,
						timestamp: 10000290,
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					} as BlockHeader;
					const forgerIndex = forgersList.forgersList[0].delegates.findIndex(forger =>
						forger.equals(forgedDelegate.address),
					);
					const missedDelegate = forgedDelegates[forgerIndex - 1];
					forgersList = {
						forgersList: [
							{
								round: 8933,
								delegates: [...forgedDelegates.map(d => d.address)],
								standby: [],
							},
						],
					};
					delegateVoteWeights = {
						voteWeights: [
							{
								round: 10,
								delegates: forgedDelegates.map(d => ({
									address: d.address,
									voteWeight: d.asset.delegate.totalVotesReceived,
								})),
							},
						],
					};
					stateStore = new StateStoreMock(
						[
							...forgedDelegates.map(forger => {
								if (forger.address.equals(missedDelegate.address)) {
									// eslint-disable-next-line no-param-reassign
									forger.asset.delegate.lastForgedHeight = block.height - 260000 + 5000;
									// eslint-disable-next-line no-param-reassign
									forger.asset.delegate.consecutiveMissedBlocks = 50;
								}
								return forger;
							}),
						],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: codec.encode(
								voteWeightsSchema,
								delegateVoteWeights,
							),
						},
						{ lastBlockHeaders: [lastBlock] },
					);
					// Act
					await dpos.apply(block, stateStore);

					const updatedMissedForger = await stateStore.account.get(missedDelegate.address);
					expect(updatedMissedForger.asset.delegate.isBanned).toBeFalse();
					expect(updatedMissedForger.asset.delegate.consecutiveMissedBlocks).toEqual(51);
				});
			});

			describe('when forger missed a block has not forged within 260k blocks, but does not have 50 consecutive missed block', () => {
				it('should not ban the missed forger', async () => {
					const forgedDelegate = forgedDelegates[forgedDelegates.length - 1];
					// Arrange
					const lastBlock = {
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
						height: 920006,
						timestamp: 10000270,
					} as BlockHeader;
					block = {
						height: 920007,
						timestamp: 10000290,
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					} as BlockHeader;
					const forgerIndex = forgersList.forgersList[0].delegates.findIndex(forger =>
						forger.equals(forgedDelegate.address),
					);
					const missedDelegate = forgedDelegates[forgerIndex - 1];
					forgersList = {
						forgersList: [
							{
								round: 8933,
								delegates: [...forgedDelegates.map(d => d.address)],
								standby: [],
							},
						],
					};
					delegateVoteWeights = {
						voteWeights: [
							{
								round: 10,
								delegates: forgedDelegates.map(d => ({
									address: d.address,
									voteWeight: d.asset.delegate.totalVotesReceived,
								})),
							},
						],
					};
					stateStore = new StateStoreMock(
						[
							...forgedDelegates.map(forger => {
								if (forger.address.equals(missedDelegate.address)) {
									// eslint-disable-next-line no-param-reassign
									forger.asset.delegate.lastForgedHeight = block.height - 260000 - 1;
									// eslint-disable-next-line no-param-reassign
									forger.asset.delegate.consecutiveMissedBlocks = 40;
								}
								return forger;
							}),
						],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: codec.encode(
								voteWeightsSchema,
								delegateVoteWeights,
							),
						},
						{ lastBlockHeaders: [lastBlock] },
					);
					// Act
					await dpos.apply(block, stateStore);

					const updatedMissedForger = await stateStore.account.get(missedDelegate.address);
					expect(updatedMissedForger.asset.delegate.isBanned).toBeFalse();
					expect(updatedMissedForger.asset.delegate.consecutiveMissedBlocks).toEqual(41);
				});
			});

			describe('when forger missed a block has 50 consecutive missed block, and not forged within 260k blocks', () => {
				it('should ban the missed forger', async () => {
					const forgedDelegate = forgedDelegates[forgedDelegates.length - 1];
					// Arrange
					const lastBlock = {
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
						height: 920006,
						timestamp: 10000270,
					} as BlockHeader;
					block = {
						height: 920007,
						timestamp: 10000290,
						generatorPublicKey: accountsPublicKeys.publicKeyMap.get(forgedDelegate.address),
					} as BlockHeader;
					const forgerIndex = forgersList.forgersList[0].delegates.findIndex(forger =>
						forger.equals(forgedDelegate.address),
					);
					const missedDelegate = forgedDelegates[forgerIndex - 1];
					forgersList = {
						forgersList: [
							{
								round: 8933,
								delegates: [...forgedDelegates.map(d => d.address)],
								standby: [],
							},
						],
					};
					delegateVoteWeights = {
						voteWeights: [
							{
								round: 10,
								delegates: forgedDelegates.map(d => ({
									address: d.address,
									voteWeight: d.asset.delegate.totalVotesReceived,
								})),
							},
						],
					};
					stateStore = new StateStoreMock(
						[
							...forgedDelegates.map(forger => {
								if (forger.address.equals(missedDelegate.address)) {
									// eslint-disable-next-line no-param-reassign
									forger.asset.delegate.lastForgedHeight = block.height - 260000 - 1;
									// eslint-disable-next-line no-param-reassign
									forger.asset.delegate.consecutiveMissedBlocks = 50;
								}
								return forger;
							}),
						],
						{
							[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
							[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: codec.encode(
								voteWeightsSchema,
								delegateVoteWeights,
							),
						},
						{ lastBlockHeaders: [lastBlock] },
					);
					// Act
					await dpos.apply(block, stateStore);

					const updatedMissedForger = await stateStore.account.get(missedDelegate.address);
					expect(updatedMissedForger.asset.delegate.isBanned).toBeTrue();
					expect(updatedMissedForger.asset.delegate.consecutiveMissedBlocks).toEqual(51);
				});
			});
		});
	});

	describe('Given block is the last block of the round', () => {
		let lastBlockOfTheRoundNine: BlockHeader;
		let forgedDelegates: Account[];

		beforeEach(() => {
			const { accounts, publicKeyMap: publicKeyMap2 } = getDelegateAccountsWithVotesReceived(
				ACTIVE_DELEGATES + STANDBY_DELEGATES - 1,
			);
			forgedDelegates = accounts;

			const delegateVoteWeights = [
				{
					round: 10,
					delegates: forgedDelegates.map(d => ({
						address: d.address,
						voteWeight: d.asset.delegate.totalVotesReceived,
					})),
				},
			];

			const encodedDelegateVoteWeights = codec.encode(voteWeightsSchema, {
				voteWeights: delegateVoteWeights,
			});

			// Make 1 delegate forge twice
			forgedDelegates.push({ ...forgedDelegates[10] });
			const {
				accounts: [missedDelegate],
			} = getDelegateAccountsWithVotesReceived(1);

			const forgersList = {
				forgersList: [
					{
						round: 7,
						delegates: [...forgedDelegates.map(d => d.address), missedDelegate.address],
						standby: [],
					},
					{
						round: 8,
						delegates: [...forgedDelegates.map(d => d.address), missedDelegate.address],
						standby: [],
					},
					{
						round: 9,
						delegates: [...forgedDelegates.map(d => d.address), missedDelegate.address],
						standby: [],
					},
					{
						round: 10,
						delegates: [...forgedDelegates.map(d => d.address), missedDelegate.address],
						standby: [],
					},
				],
			};

			stateStore = new StateStoreMock(
				[...forgedDelegates, missedDelegate],
				{
					[CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS]: encodedDelegateVoteWeights,
					[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: codec.encode(forgerListSchema, forgersList),
				},
				{ lastBlockHeaders: [defaultLastBlockHeader] },
			);

			const forgedBlocks = forgedDelegates.map((delegate, i) => ({
				generatorPublicKey: publicKeyMap2.get(delegate.address),
				height: 825 + i,
			}));
			forgedBlocks.splice(forgedBlocks.length - 1);

			lastBlockOfTheRoundNine = {
				height: 927,
				generatorPublicKey: publicKeyMap2.get(forgedDelegates[forgedDelegates.length - 1].address),
			} as BlockHeader;

			chainStub.dataAccess.getBlockHeadersByHeightBetween.mockReturnValue(forgedBlocks);
		});

		it('should save next round forgers in forgers list after applying last block of round', async () => {
			// Arrange
			const currentRound = dpos.rounds.calcRound(lastBlockOfTheRoundNine.height);
			const nextRound = dpos.rounds.calcRound(lastBlockOfTheRoundNine.height + 1);

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

			// Assert
			// make sure we calculate round number correctly
			expect(nextRound).toBe(currentRound + 1);
			// we must delete the delegate list before creating the new one
			const forgersListBuffer = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);

			const { forgersList } = codec.decode(forgerListSchema, forgersListBuffer as Buffer);

			const forgers = forgersList.find((fl: { round: number }) => fl.round === nextRound);

			expect(forgers?.round).toEqual(nextRound);
		});

		it('should delete forgers list older than (finalizedBlockRound - 2)', async () => {
			// Arrange
			const finalizedBlockHeight = 1237;
			const finalizedBlockRound = Math.ceil(
				finalizedBlockHeight / (ACTIVE_DELEGATES + STANDBY_DELEGATES),
			);
			const bftRoundOffset = 2; // TODO: get from BFT constants
			const delegateActiveRoundLimit = 3;
			const expectedRound = finalizedBlockRound - bftRoundOffset - delegateActiveRoundLimit;

			// Check before finalize exist for test
			const forgersListBeforeBuffer = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);

			const { forgersList: forgersBeforeList } = codec.decode(
				forgerListSchema,
				forgersListBeforeBuffer as Buffer,
			);

			const filteredForgersBefore = forgersBeforeList.filter(
				(fl: { round: number }) => fl.round < expectedRound,
			);
			expect(filteredForgersBefore).toHaveLength(1);

			// Act
			await dpos.onBlockFinalized(stateStore, finalizedBlockHeight);

			const forgersListBuffer = await stateStore.consensus.get(
				CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
			);

			const { forgersList } = codec.decode(forgerListSchema, forgersListBuffer as Buffer);

			const filteredForgers = forgersList.filter(
				(fl: { round: number }) => fl.round < expectedRound,
			);

			// Assert
			expect(filteredForgers).toHaveLength(0);
		});

		it('should should emit EVENT_ROUND_CHANGED', async () => {
			// Arrange
			const eventCallback = jest.fn();
			const oldRound = lastBlockOfTheRoundNine.height / (ACTIVE_DELEGATES + STANDBY_DELEGATES);
			(dpos as any).events.on(constants.EVENT_ROUND_CHANGED, eventCallback);

			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect(eventCallback).toHaveBeenCalledWith({
				oldRound,
				newRound: oldRound + 1,
			});
		});

		it('should call generateRandomSeeds to get random seeds', async () => {
			// Act
			await dpos.apply(lastBlockOfTheRoundNine, stateStore);

			// Assert
			expect(randomSeedModule.generateRandomSeeds).toHaveBeenCalledTimes(1);
			expect(randomSeedModule.generateRandomSeeds).toHaveBeenCalledWith(
				9,
				dpos.rounds,
				expect.anything(),
			);
		});
	});
});
