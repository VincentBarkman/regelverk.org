import { dev } from '$app/env';
import { resolveScope } from '#lib/scope.js';
import { siteHost } from '#lib/sites.js';
import { listRecords, listPages } from '#lib/data.js';
import { ENTITIES } from '#lib/entities.js';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = ({ url }) => {
	const scope = resolveScope(undefined, url.hostname);
	const host = dev ? url.host : siteHost(scope);

	const lines: string[] = [
		`# ${host}`,
		'',
		'> regelverk.org is a database of legislation, standards, authorities, requirements and guides for security domains (OT, IT, physical security, fire safety, electrical safety, occupational safety) in Sweden and the EU. Content is available in Swedish (default) and English (/en prefix).',
		'',
		`Site map for the other sections: https://regelverk.org/sitemap.xml`,
		'',
		'Machine-readable JSON API:',
		`- List records: https://${host}/api/records?entity={entity} (entities: lagstiftning, standarder, ramverk, myndigheter, system, krav, implementera, sakerhet, branscher, lar-dig; optional &site={subdomain})`,
		`- Record detail (incl. markdown body, related records, backlinks, versions): https://${host}/api/records/{entity}/{id}`,
		''
	];

	for (const entity of ENTITIES) {
		const recs = listRecords(scope, entity).filter((r) => !r.parent);
		if (!recs.length) continue;
		lines.push(`## ${entity}`);
		lines.push('');
		for (const r of recs) {
			const desc = typeof r.meta?.description === 'string' ? ` — ${r.meta.description}` : '';
			const idPath = r.id.split('/').map(encodeURIComponent).join('/');
			lines.push(`- [${r.title ?? r.id}](https://${host}/${entity}/${idPath})${desc}`);
		}
		lines.push('');
	}

	const pages = listPages(scope);
	if (pages.length) {
		lines.push('## Pages');
		lines.push('');
		for (const p of pages)
			lines.push(`- [${p.title ?? p.id}](https://${host}/wiki/${p.scope}/pages/${p.id})`);
		lines.push('');
	}

	return new Response(lines.join('\n'), {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
