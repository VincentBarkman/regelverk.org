import { error } from '@sveltejs/kit';
import { SITE_SCOPE } from '$app/env/private';
import { resolveScope } from '#lib/scope.js';
import { externalUrls, fetchExternalInfo } from '#lib/externalInfo.js';
import { listRecords, navGroups, recordLocales } from '#lib/data.js';
import { getRecord } from '#lib/data.server.js';
import { articleHtmlFor } from '#lib/articles.server.js';
import { extractHeadings } from '#lib/headings.js';
import { ENTITIES } from '#lib/entities.js';
import type { SiteScope } from '#lib/sites.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const scope = resolveScope(params.site, url.hostname);
	const record = getRecord(scope, params.entity, params.id);
	if (!record) error(404, 'Not found');
	const { body, ...recordRef } = record;
	return {
		scope,
		entity: params.entity,
		id: params.id,
		record: recordRef,
		toc: extractHeadings(body),
		locales: recordLocales(record.home, params.entity, params.id),
		articleHtml: articleHtmlFor(params.entity, params.id),
		external: fetchExternalInfo(externalUrls(record.meta ?? null)),
		nav: navGroups(scope)
	};
};

export const entries: EntryGenerator = () => {
	const scope = (SITE_SCOPE as SiteScope | undefined) ?? 'regelverk';
	return ENTITIES.flatMap((entity) =>
		listRecords(scope, entity).map((r) => ({ entity, id: r.id }))
	);
};
