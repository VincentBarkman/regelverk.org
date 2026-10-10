import { resolveScope } from '#lib/scope.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	return { scope: resolveScope(params.site, url.hostname) };
};
