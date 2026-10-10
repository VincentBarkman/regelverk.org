import { resolveScope } from '#lib/scope.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => ({
	slug: params.page,
	scope: resolveScope(params.site, url.hostname)
});
