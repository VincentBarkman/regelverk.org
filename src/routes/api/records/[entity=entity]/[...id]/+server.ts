import { json } from '@sveltejs/kit';
import { resolveScope } from '#lib/scope.js';
import { isSiteScope } from '#lib/sites.js';
import {
	recordLocales,
	baseIdOf,
	isVersionRecord,
	versionSiblings,
	referencedByRecords
} from '#lib/data.js';
import { getRecord } from '#lib/data.server.js';
import type { RequestHandler } from './$types';

export const prerender = false;

const HEADERS = {
	'access-control-allow-origin': '*',
	'cache-control': 'public, max-age=300'
};

export const GET: RequestHandler = ({ params, url }) => {
	const siteParam = url.searchParams.get('site');
	const scope = isSiteScope(siteParam) ? siteParam : resolveScope(undefined, url.hostname);
	const { entity, id } = params;

	const record = getRecord(scope, entity, id);
	if (!record)
		return json({ error: 'not_found', scope, entity, id }, { status: 404, headers: HEADERS });

	const meta = record.meta ?? {};
	const related = Array.isArray(meta.related) ? (meta.related as string[]) : [];

	return json(
		{
			scope: record.home,
			entity,
			id,
			title: record.title ?? id,
			meta: record.meta,
			locales: recordLocales(record.home, entity, id),
			related,
			referencedBy: referencedByRecords(scope, id, record.meta).map((r) => ({
				scope: r.scope,
				entity: r.entity,
				id: r.id,
				title: r.title ?? r.id
			})),
			versions: {
				...(isVersionRecord(id, record.meta) && id !== baseIdOf(id)
					? { parent: baseIdOf(id) }
					: {}),
				siblings: versionSiblings(scope, entity, id).map((r) => {
					const version = typeof r.meta?.version === 'string' ? r.meta.version : null;
					const designation = typeof r.meta?.designation === 'string' ? r.meta.designation : null;
					return {
						id: r.id,
						title: r.title ?? designation ?? (version ? `v${version}` : r.id),
						version
					};
				})
			},
			body: record.body,
			bodyFormat: 'markdown'
		},
		{ headers: HEADERS }
	);
};
