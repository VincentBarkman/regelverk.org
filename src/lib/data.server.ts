import { SITE_SCOPES, type SiteScope } from '#lib/sites.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { parse as parseYaml } from 'yaml';
import MiniSearch from 'minisearch';
import { searchIndexJson, searchStore } from '#lib/generated/searchIndex.js';
import type { DataRecord, DataRecordRef, SearchHit } from '#lib/data.js';

const RAW = import.meta.glob('/data/**/*.{yaml,yml,md,svx}', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

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

function visibleOn(ref: { scope: string }, meta: Record<string, unknown> | null, scope: string) {
	if (ref.scope === scope) return true;
	const sites = meta?.sites;
	return Array.isArray(sites) ? sites.includes(scope as SiteScope) : false;
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
			const meta = recordMeta(path, body);
			if (!visibleOn({ scope: home }, meta, scope)) return null;
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

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const tokenize = (s: string) =>
	fold(s)
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);

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
let SEARCH_STORE: Map<string, StoredHit> | null = null;

function getSearchIndex(): MiniSearch {
	if (!SEARCH_INDEX)
		SEARCH_INDEX = MiniSearch.loadJSON(searchIndexJson, {
			fields: ['title', 'idText', 'description', 'meta', 'body'],
			tokenize
		}) as MiniSearch;
	if (!SEARCH_STORE) SEARCH_STORE = new Map(Object.entries(searchStore)) as Map<string, StoredHit>;
	return SEARCH_INDEX;
}

function getStore(): Map<string, StoredHit> {
	getSearchIndex();
	return SEARCH_STORE!;
}

const MAX_QUERY_LEN = 200;

export function searchRecords(query: string): SearchHit[] {
	query = query.slice(0, MAX_QUERY_LEN);
	const index = getSearchIndex();
	const options = {
		prefix: true,
		fuzzy: (term: string) => (term.length >= 4 ? 2 : 1),
		boost: { title: 4, idText: 2, description: 1.5 }
	};
	let results = index.search(query, { ...options, combineWith: 'AND' });
	if (!results.length) results = index.search(query, options);

	if (!results.length) {
		const q = fold(query).replace(/[^\p{L}\p{N}]+/gu, '');
		const qWords = tokenize(query);
		const scoreOf = (h: StoredHit): number => {
			const idt = fold(`${h.id} ${h.title ?? ''}`).replace(/[^\p{L}\p{N}]+/gu, '');
			const tokScore = h.tokens.length
				? Math.max(...h.tokens.map((t) => dice(q, t) + (t.startsWith(q.slice(0, 2)) ? 0.1 : 0)))
				: 0;
			const strScore = idt && (idt.includes(q) || q.includes(idt)) ? 1 : dice(q, idt);
			const wordScore = qWords.length
				? Math.max(
						...qWords.map((w) =>
							h.tokens.length ? Math.max(...h.tokens.map((t) => dice(w, t))) : 0
						)
					)
				: 0;
			return Math.max(tokScore, strScore, wordScore);
		};
		const scored = [...getStore().values()]
			.map((h) => ({ h, score: scoreOf(h) }))
			.filter(({ score }) => score > 0)
			.sort((a, b) => b.score - a.score);
		const best = scored.filter(({ score }) => score >= 0.3);
		return (best.length ? best : scored.slice(0, 5)).slice(0, 10).map(({ h, score }) => ({
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

	const store = getStore();
	return results
		.map((r): SearchHit | null => {
			const stored = store.get(String(r.id));
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
