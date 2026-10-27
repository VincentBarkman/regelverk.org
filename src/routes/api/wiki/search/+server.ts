import { json } from '@sveltejs/kit';
import { searchRecords, suggestQuery } from '#lib/data.server.js';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	const results =
		q.length >= 2
			? searchRecords(q)
					.slice(0, 8)
					.map((r) => ({
						id: r.id,
						slug: `${r.scope}/${r.entity}/${r.id}`,
						title: r.title ?? r.id,
						description: r.description ?? '',
						entity: r.entity,
						scope: r.scope
					}))
			: [];
	return json({ results, suggestion: results.length ? null : suggestQuery(q) });
};
