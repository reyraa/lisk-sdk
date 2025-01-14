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

export const defaultConfig = {
	type: 'object',
	properties: {
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			description: 'The http server port for forger plugin.',
		},
		whiteList: {
			type: 'array',
			items: {
				type: 'string',
			},
			description:
				'Explicitly allowing some identified entities access to forger plugin endpoints.',
		},
		dataPath: {
			type: 'string',
			format: 'path',
			minLength: 1,
			maxLength: 50,
			example: '~/.lisk/plugins/data',
			description:
				'The data path for storing forging related information captured from application.',
		},
		webhook: {
			type: 'array',
			description: 'Third party API endpoints with configurable events to emit.',
			items: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						description: 'Third party API endpoints.',
					},
					events: {
						type: 'array',
						items: {
							type: 'string',
						},
						description: 'List of specific events to be emitted.',
					},
				},
				required: ['url'],
			},
		},
		cors: {
			type: 'object',
			properties: {
				origin: {
					anyOf: [{ type: 'string' }, { type: 'boolean' }],
				},
				methods: {
					type: 'array',
				},
			},
			required: ['origin'],
		},
		limits: {
			type: 'object',
			properties: {
				max: {
					type: 'integer',
				},
				delayMs: {
					type: 'integer',
				},
				delayAfter: {
					type: 'integer',
				},
				windowMs: {
					type: 'integer',
				},
				headersTimeout: {
					type: 'integer',
					minimum: 1,
					maximum: 40000,
				},
				serverSetTimeout: {
					type: 'integer',
					minimum: 1,
					maximum: 120000,
				},
			},
			required: ['max', 'delayMs', 'delayAfter', 'windowMs', 'headersTimeout', 'serverSetTimeout'],
		},
	},
	required: ['port', 'whiteList', 'dataPath', 'cors', 'limits'],
	default: {
		port: 4001,
		whiteList: ['127.0.0.1'],
		webhook: [],
		dataPath: '~/.lisk/plugins/data',
		cors: {
			origin: '*',
			methods: ['GET', 'POST', 'PUT'],
		},
		limits: {
			max: 0,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 60000,
			headersTimeout: 5000,
			serverSetTimeout: 20000,
		},
	},
};
