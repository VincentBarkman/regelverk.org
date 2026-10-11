import { listRecords, nestRecords, searchRecords } from '#lib/data.js';
import { ENTITIES } from '#lib/entities.js';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = ({ url }) => {
	const query = (url.searchParams.get('search') ?? url.searchParams.get('q') ?? '').trim();
	return {
		query,
		results: query.length >= 2 ? searchRecords(query) : [],
		nav: ENTITIES.map((entity) => ({
			entity,
			items: nestRecords(listRecords('regelverk', entity))
		})).filter((g) => g.items.length)
	};
};
