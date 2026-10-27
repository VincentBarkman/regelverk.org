import { resolveScope } from '#lib/scope.js';
import { recordGraph } from '#lib/data.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const scope = resolveScope(params.site, url.hostname);
	return { scope, ...recordGraph(scope) };
};

export const entries: EntryGenerator = () => [{}];
