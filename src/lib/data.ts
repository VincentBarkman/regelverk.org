import { isEntity } from '#lib/entities.js';
import { isSiteScope } from '#lib/sites.js';

const RAW = import.meta.glob('/data/**/*.{yaml,yml}', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export interface DataRecordRef {
	scope: string;
	entity: string;
	id: string;
}

function parseDataPath(path: string): DataRecordRef | null {
	const match = path.match(/^\/data\/([^/]+)\/([^/]+)\/([^/]+)\.(?:yaml|yml)$/);
	if (!match) return null;
	const [, scope, entity, id] = match;
	if (scope === 'registry') return { scope, entity: 'registry', id: entity };
	if (!isSiteScope(scope) || !isEntity(entity)) return null;
	return { scope, entity, id };
}

export function listRecords(scope: string, entity: string): DataRecordRef[] {
	return Object.keys(RAW)
		.map(parseDataPath)
		.filter((r): r is DataRecordRef => r !== null && r.scope === scope && r.entity === entity)
		.sort((a, b) => a.id.localeCompare(b.id));
}

export function getRecord(scope: string, entity: string, id: string): { id: string; body: string } | null {
	for (const ext of ['yaml', 'yml']) {
		const path = `/data/${scope}/${entity}/${id}.${ext}`;
		if (path in RAW) return { id, body: RAW[path] };
	}
	return null;
}

export interface SearchHit extends DataRecordRef {
	field: 'id' | 'body';
}

export function searchRecords(query: string): SearchHit[] {
	const q = query.toLowerCase();
	const hits: SearchHit[] = [];
	for (const [path, body] of Object.entries(RAW)) {
		const ref = parseDataPath(path);
		if (!ref) continue;
		if (ref.id.toLowerCase().includes(q)) hits.push({ ...ref, field: 'id' });
		else if (body.toLowerCase().includes(q)) hits.push({ ...ref, field: 'body' });
	}
	return hits;
}

