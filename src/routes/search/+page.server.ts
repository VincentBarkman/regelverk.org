import { searchRecords } from '#lib/data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const query = (url.searchParams.get('search') ?? url.searchParams.get('q') ?? '').trim();
	return {
		query,
		results: query.length >= 2 ? searchRecords(query) : []
	};
};
