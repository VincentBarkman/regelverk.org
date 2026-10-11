import { resolveScope } from '#lib/scope.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => ({
	scope: resolveScope(params.site, url.hostname)
});

export const entries: EntryGenerator = () => [{}];
