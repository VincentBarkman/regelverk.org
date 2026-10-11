import { resolveScope } from '#lib/scope.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	return { scope: resolveScope(params.site, url.hostname) };
};

// Site paths are dev-only; production scopes resolve from the subdomain,
// so only the bare home page is prerendered.
export const entries: EntryGenerator = () => [{}];
