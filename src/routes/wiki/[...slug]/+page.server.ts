import { externalUrls, fetchExternalInfo } from '#lib/externalInfo.js';
import { commits } from '#lib/generated/commits.js';
import { listPages, listRecords, recordLocales } from '#lib/data.js';
import { getRecord } from '#lib/data.server.js';
import { articleHtmlFor } from '#lib/articles.server.js';
import { resolveScope } from '#lib/scope.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { ENTITIES, isEntity, type Entity } from '#lib/entities.js';
import { SITE_SCOPES, isSiteScope, siteHost } from '#lib/sites.js';
import type { EntryGenerator, PageServerLoad } from './$types';

const dateOf = (meta: Record<string, unknown> | null): string => {
	const v = meta?.lastReviewed ?? meta?.published;
	return typeof v === 'string' ? v : '';
};

export const load: PageServerLoad = async ({ params, url }) => {
	const parts = params.slug.split('/');
	const ref =
		parts.length >= 3 && isSiteScope(parts[0]) && (isEntity(parts[1]) || parts[1] === 'pages')
			? { scope: parts[0], entity: parts[1] as Entity | 'pages', id: parts.slice(2).join('/') }
			: null;

	const all =
		ref?.entity === 'pages'
			? ENTITIES.flatMap((entity) => listRecords(ref.scope, entity).map((r) => ({ ...r, entity })))
			: [];

	const record = ref ? getRecord(ref.scope, ref.entity, ref.id) : null;

	const scope = ref?.scope ?? 'regelverk';
	const host = siteHost(scope);
	const title = record?.title ?? ref?.id ?? params.slug;
	const description =
		typeof record?.meta?.description === 'string' ? record.meta.description : undefined;
	const canonical = ref
		? ref.entity === 'pages'
			? `https://${host}/wiki/${ref.scope}/pages/${ref.id.split('/').map(encodeURIComponent).join('/')}`
			: `https://${host}/${ref.entity}/${ref.id.split('/').map(encodeURIComponent).join('/')}`
		: `https://${host}`;
	const ldJson = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: title,
		url: canonical,
		inLanguage: getLocale() === 'en' ? 'en' : 'sv',
		...(description ? { description } : {}),
		isPartOf: { '@type': 'WebSite', name: host, url: `https://${host}` }
	});

	return {
		slug: params.slug,
		ref,
		record,
		locales: record && ref ? recordLocales(ref.scope, ref.entity, ref.id) : [],
		ldJson,
		articleHtml: ref
			? articleHtmlFor(ref.entity, ref.id, resolveScope(undefined, url.hostname))
			: undefined,
		external: await fetchExternalInfo(externalUrls(record?.meta ?? null)),
		pages: ref ? listPages(ref.scope) : [],
		updates:
			ref?.id === 'uppdateringar'
				? all
						.filter((r) => dateOf(r.meta))
						.sort((a, b) => dateOf(b.meta).localeCompare(dateOf(a.meta)))
						.slice(0, 20)
				: [],
		sources:
			ref?.id === 'kallor'
				? all
						.filter((r) => typeof r.meta?.source === 'string' || typeof r.meta?.url === 'string')
						.sort((a, b) =>
							(a.entity + (a.title ?? a.id)).localeCompare(b.entity + (b.title ?? b.id))
						)
				: [],
		commits: ref?.id === 'andringslogg' ? commits : []
	};
};

export const entries: EntryGenerator = () =>
	SITE_SCOPES.flatMap((scope) => [
		...ENTITIES.flatMap((entity) =>
			listRecords(scope, entity).map((r) => ({
				slug: `${r.scope}/${entity}/${r.id}`
			}))
		),
		...listPages(scope).map((p) => ({ slug: `${p.scope}/pages/${p.id}` }))
	]);
