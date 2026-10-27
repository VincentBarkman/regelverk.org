import { json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { resolveScope } from '#lib/scope.js';
import { isSiteScope, siteHost } from '#lib/sites.js';
import { isEntity, listRecords } from '#lib/data.js';
import { ENTITIES } from '#lib/entities.js';
import type { RequestHandler } from './$types';

export const prerender = false;

const HEADERS = {
	'access-control-allow-origin': '*',
	'cache-control': 'public, max-age=300'
};

const recordUrl = (recordScope: string, entity: string, id: string, fallbackHost: string) => {
	const host = dev ? fallbackHost : isSiteScope(recordScope) ? siteHost(recordScope) : fallbackHost;
	return `https://${host}/${entity}/${id.split('/').map(encodeURIComponent).join('/')}`;
};

export const GET: RequestHandler = ({ url }) => {
	const siteParam = url.searchParams.get('site');
	const scope = isSiteScope(siteParam) ? siteParam : resolveScope(undefined, url.hostname);
	const entityParam = url.searchParams.get('entity');
	const host = dev ? url.host : siteHost(scope);

	if (entityParam !== null && !isEntity(entityParam))
		return json({ error: 'invalid_entity', entities: ENTITIES }, { status: 400, headers: HEADERS });

	const entities = entityParam ? [entityParam] : ENTITIES;
	const records = entities.flatMap((entity) =>
		listRecords(scope, entity).map((r) => ({
			scope: r.scope,
			entity: r.entity,
			id: r.id,
			parent: r.parent,
			title: r.title,
			meta: r.meta,
			url: recordUrl(isSiteScope(r.scope) ? r.scope : scope, r.entity, r.id, host)
		}))
	);

	return json({ site: scope, count: records.length, records }, { headers: HEADERS });
};
