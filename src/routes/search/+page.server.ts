import { navGroups } from '#lib/data.js';
import { searchRecords } from '#lib/data.server.js';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = ({ url }) => {
	const query = (url.searchParams.get('search') ?? url.searchParams.get('q') ?? '')
		.trim()
		.slice(0, 200);
	return {
		query,
		results: query.length >= 2 ? searchRecords(query) : [],
		nav: navGroups('regelverk')
	};
};
