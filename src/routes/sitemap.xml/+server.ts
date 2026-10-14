import { dev } from '$app/env';
import { resolveScope } from '#lib/scope.js';
import { siteHost } from '#lib/sites.js';
import { listRecords, listPages, recordLocales } from '#lib/data.js';
import { ENTITIES } from '#lib/entities.js';
import type { RequestHandler } from './$types';

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const url = (
	base: string,
	path: string,
	alts: { hreflang: string; path: string }[] = [],
	lastmod?: string
) =>
	`\t<url>\n\t\t<loc>${esc(base + path)}</loc>${alts
		.map(
			(a) =>
				`\n\t\t<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${esc(base + a.path)}"/>`
		)
		.join('')}\n\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${esc(
		base + path
	)}"/>${lastmod ? `\n\t\t<lastmod>${lastmod}</lastmod>` : ''}\n\t</url>`;

export const GET: RequestHandler = ({ url: req }) => {
	const scope = resolveScope(undefined, req.hostname);
	const base = dev ? req.origin : `https://${siteHost(scope)}`;
	const urls: string[] = [];

	urls.push(url(base, '/'));
	for (const entity of ENTITIES) urls.push(url(base, `/${entity}`));
	for (const p of ['privacy', 'terms', 'disclaimer']) urls.push(url(base, `/legal/${p}`));

	for (const entity of ENTITIES) {
		for (const r of listRecords(scope, entity)) {
			const path = `/${entity}/${r.id.split('/').map(encodeURIComponent).join('/')}`;
			const locales = recordLocales(r.scope, entity, r.id);
			const alts = [
				...(locales.includes('sv') ? [{ hreflang: 'sv', path }] : []),
				...(locales.includes('en') ? [{ hreflang: 'en', path: `/en${path}` }] : [])
			];
			const lastmod =
				typeof r.meta?.lastReviewed === 'string'
					? r.meta.lastReviewed
					: typeof r.meta?.sourceChecked === 'string'
						? r.meta.sourceChecked
						: undefined;
			urls.push(url(base, path, alts, lastmod));
		}
	}

	for (const p of listPages(scope)) urls.push(url(base, `/wiki/${scope}/pages/${p.id}`));

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>`;
	return new Response(xml, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
};
