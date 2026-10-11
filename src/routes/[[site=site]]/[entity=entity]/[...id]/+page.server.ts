import { error } from '@sveltejs/kit';
import { SITE_SCOPE } from '$app/env/private';
import { resolveScope } from '#lib/scope.js';
import { externalUrls, fetchExternalInfo } from '#lib/externalInfo.js';
import { getRecord, listRecords, nestRecords } from '#lib/data.js';
import { ENTITIES } from '#lib/entities.js';
import type { SiteScope } from '#lib/sites.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const scope = resolveScope(params.site, url.hostname);
	const record = getRecord(scope, params.entity, params.id);
	if (!record) error(404, 'Not found');
	return {
		scope,
		entity: params.entity,
		id: params.id,
		record,
		external: await fetchExternalInfo(externalUrls(record?.meta ?? null)),
		nav: ENTITIES.map((entity) => ({
			entity,
			items: nestRecords(listRecords(scope, entity))
		})).filter((g) => g.items.length)
	};
};

export const entries: EntryGenerator = () => {
	const scope = (SITE_SCOPE as SiteScope | undefined) ?? 'regelverk';
	return ENTITIES.flatMap((entity) =>
		listRecords(scope, entity).map((r) => ({ entity, id: r.id }))
	);
};
