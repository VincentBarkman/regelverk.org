import { resolveScope } from '#lib/scope.js';
import { listRecords } from '#lib/data.js';
import { ENTITIES } from '#lib/entities.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const scope = resolveScope(params.site, url.hostname);
	return {
		scope,
		entity: params.entity,
		records: listRecords(scope, params.entity)
	};
};

export const entries: EntryGenerator = () => ENTITIES.map((entity) => ({ entity }));
