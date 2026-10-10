import { isEntity } from '#lib/entities.js';
import { isSiteScope, SITE_SCOPES, type SiteScope } from '#lib/sites.js';
import { parse as parseYaml } from 'yaml';
import type { Component } from 'svelte';

const RAW = import.meta.glob('/data/**/*.{yaml,yml,md,svx}', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const ARTICLES = import.meta.glob('/data/**/*.{md,svx}', {
	import: 'default',
	eager: true
}) as Record<string, Component>;

export interface DataRecordRef {
	scope: string;
	entity: string;
	id: string;
}

function parseDataPath(path: string): DataRecordRef | null {
	const match = path.match(/^\/data\/([^/]+)\/([^/]+)\/([^/]+)\.(?:yaml|yml|md|svx)$/);
	if (!match) return null;
	const [, scope, entity, id] = match;
	if (scope === 'registry') return { scope, entity: 'registry', id: entity };
	if (!isSiteScope(scope) || !isEntity(entity)) return null;
	return { scope, entity, id };
}

function extraSites(path: string, body: string): SiteScope[] {
	let meta: unknown;
	try {
		if (path.endsWith('.yaml') || path.endsWith('.yml')) {
			meta = parseYaml(body);
		} else {
			const frontmatter = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
			meta = frontmatter ? parseYaml(frontmatter[1]) : null;
		}
	} catch {
		return [];
	}
	const sites = (meta as { sites?: unknown } | null)?.sites;
	return Array.isArray(sites) ? sites.filter(isSiteScope) : [];
}

function visibleOn(ref: DataRecordRef, path: string, body: string, scope: string): boolean {
	return ref.scope === scope || extraSites(path, body).includes(scope as SiteScope);
}

export function listRecords(scope: string, entity: string): DataRecordRef[] {
	return Object.entries(RAW)
		.map(([path, body]) => {
			const ref = parseDataPath(path);
			if (!ref || ref.entity !== entity || !visibleOn(ref, path, body, scope)) return null;
			return ref;
		})
		.filter((r): r is DataRecordRef => r !== null)
		.sort((a, b) => a.id.localeCompare(b.id));
}

export interface DataRecord {
	id: string;
	body: string;
	home: SiteScope;
}

export function getRecord(scope: string, entity: string, id: string): DataRecord | null {
	for (const home of SITE_SCOPES) {
		for (const ext of ['yaml', 'yml', 'md', 'svx']) {
			const path = `/data/${home}/${entity}/${id}.${ext}`;
			if (!(path in RAW)) continue;
			const body = RAW[path];
			if (!visibleOn({ scope: home, entity, id }, path, body, scope)) return null;
			return { id, body, home };
		}
	}
	return null;
}

export function articleFor(entity: string, id: string): Component | undefined {
	for (const scope of SITE_SCOPES) {
		for (const ext of ['svx', 'md']) {
			const article = ARTICLES[`/data/${scope}/${entity}/${id}.${ext}`];
			if (article) return article;
		}
	}
	return undefined;
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
