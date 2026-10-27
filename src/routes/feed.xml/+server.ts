import { dev } from '$app/env';
import { resolveScope } from '#lib/scope.js';
import { isSiteScope, siteHost } from '#lib/sites.js';
import { siteTitle, SITE_DESC } from '#lib/meta.js';
import { listRecords } from '#lib/data.js';
import { ENTITIES } from '#lib/entities.js';
import type { RequestHandler } from './$types';

export const prerender = false;

const LIMIT = 30;

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const metaDate = (meta: Record<string, unknown> | null): string | null => {
	const v = meta?.lastReviewed ?? meta?.sourceChecked ?? meta?.published;
	if (typeof v !== 'string' || !v) return null;
	return Number.isNaN(new Date(v).getTime()) ? null : v;
};

export const GET: RequestHandler = ({ url }) => {
	const scope = resolveScope(undefined, url.hostname);
	const host = dev ? url.host : siteHost(scope);
	const feedUrl = `https://${host}/feed.xml`;

	const items = ENTITIES.flatMap((entity) =>
		listRecords(scope, entity)
			.filter((r) => !r.parent)
			.map((r) => ({ entity, r, date: metaDate(r.meta) }))
	)
		.filter((x) => x.date !== null)
		.sort((a, b) => (a.date! < b.date! ? 1 : -1))
		.slice(0, LIMIT);

	const itemXml = items
		.map(({ entity, r, date }) => {
			const pubDate = new Date(date!).toUTCString();
			const recordHost = dev ? host : isSiteScope(r.scope) ? siteHost(r.scope) : host;
			const idPath = r.id.split('/').map(encodeURIComponent).join('/');
			const link = `https://${recordHost}/${entity}/${idPath}`;
			const desc = typeof r.meta?.description === 'string' ? r.meta.description : '';
			return [
				'<item>',
				`<title>${esc(r.title ?? r.id)}</title>`,
				`<link>${link}</link>`,
				`<guid isPermaLink="true">${link}</guid>`,
				`<category>${entity}</category>`,
				`<pubDate>${pubDate}</pubDate>`,
				desc ? `<description>${esc(desc)}</description>` : '',
				'</item>'
			]
				.filter(Boolean)
				.join('');
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(siteTitle(scope))}</title>
<link>https://${host}/</link>
<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
<description>${esc(SITE_DESC[scope]())}</description>
<language>${url.pathname.startsWith('/en') ? 'en' : 'sv'}</language>
${itemXml}
</channel>
</rss>`;

	return new Response(xml, {
		headers: {
			'content-type': 'application/rss+xml; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
};
