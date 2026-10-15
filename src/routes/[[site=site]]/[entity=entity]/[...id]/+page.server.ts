import { error } from '@sveltejs/kit';
import { SITE_SCOPE } from '$app/env/private';
import { resolveScope } from '#lib/scope.js';
import { externalUrls, fetchExternalInfo } from '#lib/externalInfo.js';
import { listRecords, navGroups, recordLocales } from '#lib/data.js';
import { getRecord } from '#lib/data.server.js';
import { articleHtmlFor } from '#lib/articles.server.js';
import { extractHeadings } from '#lib/headings.js';
import { ENTITIES, type Entity } from '#lib/entities.js';
import { ENTITY_LABEL } from '#lib/meta.js';
import { siteHost, type SiteScope } from '#lib/sites.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import * as m from '#lib/paraglide/messages.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const scope = resolveScope(params.site, url.hostname);
	const record = getRecord(scope, params.entity, params.id);
	if (!record) error(404, 'Not found');
	const { body, ...recordRef } = record;
	const nav = navGroups(scope);
	const entity = params.entity as Entity;
	const host = siteHost(scope);
	const lang = getLocale() === 'en' ? 'en' : 'sv';
	const idPath = params.id.split('/').map(encodeURIComponent).join('/');
	const locPath = `${lang === 'en' ? '/en' : ''}`;
	const canonical = `https://${host}${locPath}/${entity}/${idPath}`;
	const meta = record.meta ?? {};
	const title = record.title ?? params.id;
	const description = typeof meta.description === 'string' ? meta.description : undefined;
	const parent = params.id.includes('/')
		? nav
				.find((g) => g.entity === entity)
				?.items.find((i) => i.id === params.id.split('/').slice(0, -1).join('/'))
		: undefined;
	const hrefFor = (id: string) =>
		`https://${host}${locPath}/${entity}/${id.split('/').map(encodeURIComponent).join('/')}`;
	const main =
		entity === 'lagstiftning'
			? {
					'@type': 'Legislation',
					name: title,
					url: canonical,
					inLanguage: lang,
					...(typeof meta.legislationType === 'string' || typeof meta.type === 'string'
						? { legislationType: String(meta.legislationType ?? meta.type) }
						: {}),
					...(typeof meta.jurisdiction === 'string'
						? { legislationJurisdiction: meta.jurisdiction }
						: {}),
					...(meta.designation || meta.sfs || meta.celex
						? { legislationIdentifier: String(meta.designation ?? meta.sfs ?? meta.celex) }
						: {}),
					...(parent
						? {
								isPartOf: {
									'@type': 'Legislation',
									name: parent.title ?? parent.id,
									url: hrefFor(parent.id)
								}
							}
						: {}),
					...(description ? { description } : {})
				}
			: {
					'@type': 'Article',
					headline: title,
					url: canonical,
					inLanguage: lang,
					...(description ? { description } : {}),
					isPartOf: { '@type': 'WebSite', name: host, url: `https://${host}` }
				};
	const crumbs = [
		{ name: m.nav_home(), url: `https://${host}${locPath}/` },
		{ name: ENTITY_LABEL[entity](), url: `https://${host}${locPath}/${entity}` },
		...(parent ? [{ name: parent.title ?? parent.id, url: hrefFor(parent.id) }] : []),
		{ name: title, url: canonical }
	];
	const ldJson = JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			main,
			{
				'@type': 'BreadcrumbList',
				itemListElement: crumbs.map((c, i) => ({
					'@type': 'ListItem',
					position: i + 1,
					name: c.name,
					item: c.url
				}))
			}
		]
	});
	return {
		scope,
		entity,
		id: params.id,
		record: recordRef,
		toc: extractHeadings(body),
		locales: recordLocales(record.home, params.entity, params.id),
		articleHtml: articleHtmlFor(params.entity, params.id, scope),
		external: fetchExternalInfo(externalUrls(record.meta ?? null)),
		nav,
		ldJson
	};
};

export const entries: EntryGenerator = () => {
	const scope = (SITE_SCOPE as SiteScope | undefined) ?? 'regelverk';
	return ENTITIES.flatMap((entity) =>
		listRecords(scope, entity).map((r) => ({ entity, id: r.id }))
	);
};
