import { isEntity } from '#lib/entities.js';
import { isSiteScope, SITE_SCOPES, type SiteScope } from '#lib/sites.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { parse as parseYaml } from 'yaml';
import MiniSearch from 'minisearch';
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
	parent?: string;
	title?: string;
	meta: Record<string, unknown> | null;
	children?: DataRecordRef[];
	locale?: Locale;
}

type Locale = 'sv' | 'en';

function splitLocale(id: string): { id: string; locale: Locale } {
	const match = id.match(/^(.*)\.(en|sv)$/);
	return match ? { id: match[1], locale: match[2] as Locale } : { id, locale: 'sv' };
}

function parseDataPath(path: string): DataRecordRef | null {
	const match = path.match(/^\/data\/([^/]+)\/([^/]+)\/(.+)\.(?:yaml|yml|md|svx)$/);
	if (!match) return null;
	const [, scope, entity, rawId] = match;
	if (scope === 'registry') return { scope, entity: 'registry', id: entity, meta: null };
	if (!isSiteScope(scope) || !isEntity(entity)) return null;
	const { id, locale } = splitLocale(rawId);
	const parent = id.includes('/') ? id.split('/').slice(0, -1).join('/') : undefined;
	return { scope, entity, id, parent, meta: null, locale };
}

function recordMeta(path: string, body: string): Record<string, unknown> | null {
	try {
		if (path.endsWith('.yaml') || path.endsWith('.yml')) {
			return parseYaml(body) as Record<string, unknown>;
		}
		const frontmatter = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
		return frontmatter ? (parseYaml(frontmatter[1]) as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

function extraSites(path: string, body: string): SiteScope[] {
	const sites = recordMeta(path, body)?.sites;
	return Array.isArray(sites) ? sites.filter(isSiteScope) : [];
}

function recordTitle(path: string, body: string): string | undefined {
	const meta = recordMeta(path, body);
	const title = meta?.title ?? meta?.name;
	return typeof title === 'string' ? title : undefined;
}

function visibleOn(ref: DataRecordRef, path: string, body: string, scope: string): boolean {
	return ref.scope === scope || extraSites(path, body).includes(scope as SiteScope);
}

function bestVariant<T extends { locale?: Locale }>(a: T, b: T): T {
	const want = getLocale() === 'en' ? 'en' : 'sv';
	if (a.locale === want) return a;
	if (b.locale === want) return b;
	return a.locale === 'sv' ? a : b;
}

export function listRecords(scope: string, entity: string): DataRecordRef[] {
	const byKey = new Map<string, DataRecordRef>();
	for (const [path, body] of Object.entries(RAW)) {
		const ref = parseDataPath(path);
		if (!ref || ref.entity !== entity || !visibleOn(ref, path, body, scope)) continue;
		const record: DataRecordRef = {
			...ref,
			title: recordTitle(path, body),
			meta: recordMeta(path, body)
		};
		const key = `${ref.scope}/${ref.entity}/${ref.id}`;
		byKey.set(key, byKey.has(key) ? bestVariant(byKey.get(key)!, record) : record);
	}
	return [...byKey.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function nestRecords(items: DataRecordRef[]): DataRecordRef[] {
	const top = items.filter((i) => !i.parent);
	for (const p of top)
		p.children = items.filter((c) => c.parent === p.id).sort((a, b) => a.id.localeCompare(b.id));
	return top;
}

export function flatRecords(items: DataRecordRef[]): DataRecordRef[] {
	return items.flatMap((i) => [i, ...(i.children ?? [])]);
}

export interface DataRecord {
	id: string;
	body: string;
	home: SiteScope;
	title?: string;
	meta: Record<string, unknown> | null;
}

function recordPaths(home: string, entity: string, id: string): string[] {
	const exts = ['yaml', 'yml', 'md', 'svx'];
	const paths: string[] = [];
	if (getLocale() === 'en') {
		for (const ext of exts) paths.push(`/data/${home}/${entity}/${id}.en.${ext}`);
	}
	for (const ext of exts) paths.push(`/data/${home}/${entity}/${id}.${ext}`);
	return paths;
}

export function getRecord(scope: string, entity: string, id: string): DataRecord | null {
	for (const home of SITE_SCOPES) {
		for (const path of recordPaths(home, entity, id)) {
			if (!(path in RAW)) continue;
			const body = RAW[path];
			if (!visibleOn({ scope: home, entity, id, meta: null }, path, body, scope)) return null;
			const meta = recordMeta(path, body);
			const title = meta?.title ?? meta?.name;
			return {
				id,
				body,
				home,
				title: typeof title === 'string' ? title : undefined,
				meta
			};
		}
	}
	return null;
}

export function articleFor(entity: string, id: string): Component | undefined {
	const exts = ['svx', 'md'];
	const suffixes = getLocale() === 'en' ? ['.en', ''] : [''];
	for (const scope of SITE_SCOPES) {
		for (const suffix of suffixes) {
			for (const ext of exts) {
				const article = ARTICLES[`/data/${scope}/${entity}/${id}${suffix}.${ext}`];
				if (article) return article;
			}
		}
	}
	return undefined;
}

export function listPages(scope: string): DataRecordRef[] {
	const byKey = new Map<string, DataRecordRef>();
	for (const [path, body] of Object.entries(RAW)) {
		const match = path.match(/^\/data\/([^/]+)\/pages\/([^/]+)\.(?:md|svx)$/);
		if (!match) continue;
		const [, home, rawId] = match;
		if (!isSiteScope(home)) continue;
		const { id, locale } = splitLocale(rawId);
		const ref: DataRecordRef = { scope: home, entity: 'pages', id, meta: null, locale };
		if (!visibleOn(ref, path, body, scope)) continue;
		const record: DataRecordRef = {
			...ref,
			title: recordTitle(path, body),
			meta: recordMeta(path, body)
		};
		const key = `${home}/pages/${id}`;
		byKey.set(key, byKey.has(key) ? bestVariant(byKey.get(key)!, record) : record);
	}
	return [...byKey.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export interface SearchHit extends DataRecordRef {
	description?: string;
	score: number;
	matchedFields: string[];
}

const fold = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();

const tokenize = (s: string) =>
	fold(s)
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);

function flattenStrings(v: unknown, out: string[] = []): string[] {
	if (typeof v === 'string') out.push(v);
	else if (typeof v === 'number' || typeof v === 'boolean') out.push(String(v));
	else if (Array.isArray(v)) v.forEach((i) => flattenStrings(i, out));
	else if (v && typeof v === 'object') Object.values(v).forEach((i) => flattenStrings(i, out));
	return out;
}

function articleText(path: string, body: string): string {
	if (!path.endsWith('.md') && !path.endsWith('.svx')) return '';
	return body.replace(/^---\r?\n[\s\S]*?\r?\n---/, ' ').replace(/```[\s\S]*?```/g, ' ');
}

function searchRef(path: string): DataRecordRef | null {
	const ref = parseDataPath(path);
	if (ref) return ref.entity === 'registry' ? null : ref;
	const match = path.match(/^\/data\/([^/]+)\/pages\/([^/]+)\.(?:md|svx)$/);
	if (!match) return null;
	const [, home, rawId] = match;
	if (!isSiteScope(home)) return null;
	return { scope: home, entity: 'pages', id: splitLocale(rawId).id, meta: null };
}

type StoredHit = DataRecordRef & { description?: string; tokens: string[] };

function bigrams(s: string): Set<string> {
	const set = new Set<string>();
	for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
	return set;
}

function dice(a: string, b: string): number {
	if (a === b) return 1;
	const A = bigrams(a);
	const B = bigrams(b);
	if (!A.size || !B.size) return 0;
	let overlap = 0;
	for (const g of A) if (B.has(g)) overlap++;
	return (2 * overlap) / (A.size + B.size);
}

let SEARCH_INDEX: MiniSearch | null = null;
const SEARCH_STORE = new Map<string, StoredHit>();

function getSearchIndex(): MiniSearch {
	if (SEARCH_INDEX) return SEARCH_INDEX;
	const index = new MiniSearch({
		fields: ['title', 'idText', 'description', 'meta', 'body'],
		tokenize
	});
	const docs: Record<string, string>[] = [];
	const variants = new Map<string, { ref: DataRecordRef; paths: string[] }>();
	for (const path of Object.keys(RAW)) {
		const ref = searchRef(path);
		if (!ref) continue;
		const key = `${ref.scope}/${ref.entity}/${ref.id}`;
		const entry = variants.get(key) ?? { ref, paths: [] };
		entry.paths.push(path);
		variants.set(key, entry);
	}
	for (const [key, { ref, paths }] of variants) {
		let title = ref.id;
		let description: string | undefined;
		const metas: string[] = [];
		const bodies: string[] = [];
		for (const path of paths) {
			const body = RAW[path];
			const meta = recordMeta(path, body);
			title = recordTitle(path, body) ?? title;
			const text = articleText(path, body);
			description ??=
				typeof meta?.description === 'string'
					? meta.description
					: text.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined;
			metas.push(flattenStrings(meta ?? {}).join(' '));
			bodies.push(text);
		}
		SEARCH_STORE.set(key, {
			...ref,
			title,
			meta: recordMeta(paths[0], RAW[paths[0]]),
			description,
			tokens: tokenize(`${ref.id} ${title} ${description ?? ''}`)
		});
		docs.push({
			id: key,
			title,
			idText: ref.id,
			description: description ?? '',
			meta: metas.join(' '),
			body: bodies.join(' ')
		});
	}
	index.addAll(docs);
	SEARCH_INDEX = index;
	return index;
}

export function searchRecords(query: string): SearchHit[] {
	const index = getSearchIndex();
	const options = {
		prefix: true,
		fuzzy: (term: string) => (term.length >= 5 ? 2 : 1),
		boost: { title: 4, idText: 2, description: 1.5 }
	};
	let results = index.search(query, { ...options, combineWith: 'AND' });
	if (!results.length) results = index.search(query, options);

	if (!results.length) {
		const q = fold(query).replace(/[^\p{L}\p{N}]+/gu, '');
		return [...SEARCH_STORE.values()]
			.map((h) => ({
				h,
				score: h.tokens.length
					? Math.max(...h.tokens.map((t) => dice(q, t) + (t.startsWith(q.slice(0, 2)) ? 0.1 : 0)))
					: 0
			}))
			.filter(({ score }) => score >= 0.35)
			.sort((a, b) => b.score - a.score)
			.slice(0, 10)
			.map(({ h, score }) => ({
				scope: h.scope,
				entity: h.entity,
				id: h.id,
				title: h.title,
				meta: h.meta,
				description: h.description,
				score,
				matchedFields: ['id', 'title']
			}));
	}

	return results
		.map((r): SearchHit | null => {
			const stored = SEARCH_STORE.get(String(r.id));
			if (!stored) return null;
			return {
				scope: stored.scope,
				entity: stored.entity,
				id: stored.id,
				title: stored.title,
				meta: stored.meta,
				description: stored.description,
				score: r.score,
				matchedFields: [...new Set(Object.values(r.match).flat())]
			};
		})
		.filter((h): h is SearchHit => h !== null);
}
