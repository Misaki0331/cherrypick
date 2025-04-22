/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserIpsRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:user-ips',
	res: {
		type: 'array',
		optional: false,
		nullable: false,
		items: {
			type: 'object',
			optional: false,
			nullable: false,
			properties: {
				ip: { type: 'string' },
				accessedAt: {
					type: 'string',
					optional: false,
					nullable: false,
					format: 'date-time',
				},
				id: {
					type: 'string',
					optional: false,
					nullable: false,
					format: 'misskey:id',
				},
				user: {
					type: 'object',
					optional: true, nullable: false,
					ref: 'UserLite',
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		query: { type: 'string' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
	},
	required: ['query'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.userIpsRepository)
		private userIpsRepository: UserIpsRepository,
		private userEntityService: UserEntityService,

		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = await this.userIpsRepository.createQueryBuilder('userIp')
				.where('userIp.ip ILIKE :ip', { ip: '%' + sqlLikeEscape(ps.query) + '%' })
				.orderBy('userIp.createdAt', 'DESC')
			;
			const results = await query
				.limit(ps.limit)
				.getMany();
			const users = await this.userEntityService.packMany(results.map(r => r.userId), null);
			return results
				.map(result => ({
					id: result.userId,
					ip: result.ip,
					accessedAt: result.createdAt.toISOString(),
					user: users.find(u => u.id === result.userId),
				}))
				.filter(item => item.user !== undefined);
		});
	}
}
