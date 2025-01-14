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

interface RoundConstructor {
	readonly genesisBlockHeight: number;
	readonly initRound: number;
	readonly blocksPerRound: number;
}

export class Rounds {
	public readonly blocksPerRound: number;
	public readonly initRound: number;
	private readonly _genesisHeight: number;

	public constructor({ blocksPerRound, genesisBlockHeight, initRound }: RoundConstructor) {
		this.blocksPerRound = blocksPerRound;
		this._genesisHeight = genesisBlockHeight;
		this.initRound = initRound;
	}

	public isBootstrapPeriod(height: number): boolean {
		return height > this._genesisHeight && height <= this.lastHeightBootstrap();
	}

	public lastHeightBootstrap(): number {
		return this.initRound * this.blocksPerRound + this._genesisHeight;
	}

	public calcRound(height: number): number {
		return Math.ceil(height / this.blocksPerRound);
	}

	public calcRoundStartHeight(round: number): number {
		return (round < 1 ? 0 : round - 1) * this.blocksPerRound + 1;
	}

	public calcRoundEndHeight(round: number): number {
		return (round < 1 ? 1 : round) * this.blocksPerRound;
	}

	public calcRoundMiddleHeight(round: number): number {
		return Math.floor((this.calcRoundStartHeight(round) + this.calcRoundEndHeight(round)) / 2);
	}
}
