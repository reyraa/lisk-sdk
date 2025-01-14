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
import { Request, Response, NextFunction } from 'express';
import { isBase64String, isNumberString } from '@liskhq/lisk-validator';
import { BaseChannel, PluginCodec } from 'lisk-framework';

export const getBlockById = (channel: BaseChannel, codec: PluginCodec) => async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const blockId = req.params.id;

	if (!isBase64String(blockId)) {
		res.status(400).send({
			errors: [{ message: 'The block id parameter should be a base64 string.' }],
		});
		return;
	}

	try {
		const block = await channel.invoke<string>('app:getBlockByID', { id: blockId });
		res.status(200).send({ data: codec.decodeBlock(block) });
	} catch (err) {
		if (/^Specified key blocks:id:(.*)does not exist/.test((err as Error).message)) {
			res.status(404).send({
				errors: [{ message: `Block with id '${blockId}' was not found` }],
			});
		} else {
			next(err);
		}
	}
};

export const getBlockByHeight = (channel: BaseChannel, codec: PluginCodec) => async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const { height } = req.query;

	if (!isNumberString(height)) {
		res.status(400).send({
			errors: [{ message: 'The block height query parameter should be a number.' }],
		});
		return;
	}

	try {
		const block = await channel.invoke<string>('app:getBlockByHeight', {
			height: parseInt(height as string, 10),
		});
		res.status(200).send({ data: [codec.decodeBlock(block)] });
	} catch (err) {
		if (/^Specified key blocks:height:(.*)does not exist/.test((err as Error).message)) {
			res.status(404).send({
				errors: [{ message: `Block with height '${height as string}' was not found` }],
			});
		} else {
			next(err);
		}
	}
};
