import { resolveScope } from '#lib/scope.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => ({
	slug: params.page,
	scope: resolveScope(params.site, url.hostname)
});

export const entries: EntryGenerator = () =>
	['privacy', 'terms', 'disclaimer'].map((page) => ({ page }));
