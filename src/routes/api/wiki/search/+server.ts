import { json } from '@sveltejs/kit';
import { searchRecords } from '#lib/data.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	const results =
		q.length >= 2
			? searchRecords(q).map((r) => ({
					id: r.id,
					slug: `${r.scope}/${r.entity}/${r.id}`,
					title: r.id,
					description: `${r.scope} / ${r.entity}`
				}))
			: [];
	return json({ results });
};
