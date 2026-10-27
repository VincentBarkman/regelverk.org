import { searchRecords, suggestQuery } from '#lib/data.server.js';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = ({ url }) => {
	const query = (url.searchParams.get('search') ?? url.searchParams.get('q') ?? '')
		.trim()
		.slice(0, 200);
	const results = query.length >= 2 ? searchRecords(query) : [];
	return {
		query,
		results,
		suggestion: query.length >= 2 && !results.length ? suggestQuery(query) : null
	};
};
