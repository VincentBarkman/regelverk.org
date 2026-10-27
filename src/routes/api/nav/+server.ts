import { json } from '@sveltejs/kit';
import { resolveScope } from '#lib/scope.js';
import { isSiteScope } from '#lib/sites.js';
import { navGroups } from '#lib/data.js';
import type { RequestHandler } from './$types';

// Nav groups are large (~200KB serialized) — serving them from a shared
// endpoint keeps them out of every page's hydration payload and lets the
// browser cache them across pages.
export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('scope');
	const scope = resolveScope(isSiteScope(q) ? q : undefined, url.hostname);
	return json(
		{ scope, groups: navGroups(scope) },
		{ headers: { 'cache-control': 'public, max-age=600' } }
	);
};
