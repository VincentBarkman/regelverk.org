import { ENTITIES, isEntity, type Entity } from '#lib/entities.js';
import { isSiteScope, type SiteScope } from '#lib/sites.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { records } from '#lib/generated/records.js';
import { topNav } from '#lib/generated/topNav.js';

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

function visibleOn(ref: DataRecordRef, scope: string): boolean {
	if (ref.scope === scope) return true;
	const sites = ref.meta?.sites;
	return Array.isArray(sites) ? sites.includes(scope) : false;
}

function bestVariant<T extends { locale?: string }>(a: T, b: T): T {
	const want = getLocale() === 'en' ? 'en' : 'sv';
	if (a.locale === want) return a;
	if (b.locale === want) return b;
	return a.locale === 'sv' ? a : b;
}

// legal document order: chapters/articles first, then sections (e.g.
// övergångsbestämmelser), then annexes last
const slugRank = (id: string) => {
	const leaf = id.slice(id.lastIndexOf('/') + 1);
	return leaf.startsWith('bilaga-') ? 2 : leaf.startsWith('avsnitt-') ? 1 : 0;
};

function byDocOrder(a: { id: string }, b: { id: string }): number {
	return slugRank(a.id) - slugRank(b.id) || a.id.localeCompare(b.id, 'sv', { numeric: true });
}

export function listRecords(scope: string, entity: string): DataRecordRef[] {
	const byKey = new Map<string, DataRecordRef>();
	for (const r of records) {
		if (r.entity !== entity || r.entity === 'registry') continue;
		const ref: DataRecordRef = {
			scope: r.scope,
			entity: r.entity,
			id: r.id,
			parent: r.parent,
			title: r.title,
			meta: r.meta,
			locale: r.locale as Locale | undefined
		};
		if (!visibleOn(ref, scope)) continue;
		const key = `${ref.scope}/${ref.entity}/${ref.id}`;
		byKey.set(key, byKey.has(key) ? bestVariant(byKey.get(key)!, ref) : ref);
	}
	return [...byKey.values()].sort(byDocOrder);
}

export function nestRecords(items: DataRecordRef[]): DataRecordRef[] {
	const top = items.filter((i) => !i.parent);
	for (const p of top) p.children = items.filter((c) => c.parent === p.id).sort(byDocOrder);
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

const NAV_META_KEYS = [
	'name',
	'short',
	'designation',
	'aliases',
	'logo',
	'description',
	'sites'
] as const;

function slimRef(ref: DataRecordRef): DataRecordRef {
	const meta = ref.meta;
	const slim: Record<string, unknown> = {};
	if (meta) for (const k of NAV_META_KEYS) if (k in meta) slim[k] = meta[k];
	return {
		...ref,
		meta: meta ? slim : meta,
		children: ref.children?.map(slimRef)
	};
}

const NAV_CACHE = new Map<string, { entity: Entity; items: DataRecordRef[] }[]>();

export function navGroups(scope: string): { entity: Entity; items: DataRecordRef[] }[] {
	const key = `${getLocale()}:${scope}`;
	const cached = NAV_CACHE.get(key);
	if (cached) return cached;
	const nav = ENTITIES.map((entity) => ({
		entity,
		items: nestRecords(listRecords(scope, entity)).map(slimRef)
	})).filter((g) => g.items.length);
	NAV_CACHE.set(key, nav);
	return nav;
}

export function listPages(scope: string): DataRecordRef[] {
	const byKey = new Map<string, DataRecordRef>();
	for (const r of records) {
		if (r.entity !== 'pages' || !isSiteScope(r.scope)) continue;
		const ref: DataRecordRef = {
			scope: r.scope,
			entity: 'pages',
			id: r.id,
			parent: r.parent,
			title: r.title,
			meta: r.meta,
			locale: r.locale as Locale | undefined
		};
		if (!visibleOn(ref, scope)) continue;
		const key = `${ref.scope}/pages/${ref.id}`;
		byKey.set(key, byKey.has(key) ? bestVariant(byKey.get(key)!, ref) : ref);
	}
	return [...byKey.values()].sort(byDocOrder);
}

export function topRecords(scope: string, entity: Entity): { id: string; title?: string }[] {
	const l = getLocale();
	return topNav[`${l}:${scope}:${entity}`] ?? topNav[`sv:${scope}:${entity}`] ?? [];
}

let LOCALE_SET: Set<string> | undefined;
const localeSet = () =>
	(LOCALE_SET ??= new Set(records.map((r) => `${r.scope}/${r.entity}/${r.id}:${r.locale}`)));

export function recordLocales(scope: string, entity: string, id: string): Locale[] {
	const out: Locale[] = [];
	for (const l of ['sv', 'en'] as const)
		if (localeSet().has(`${scope}/${entity}/${id}:${l}`)) out.push(l);
	return out;
}

export interface SearchHit extends DataRecordRef {
	description?: string;
	score: number;
	matchedFields: string[];
}

export const baseIdOf = (id: string): string =>
	id.includes('/') ? id.split('/').slice(0, -1).join('/') : id;

export const isVersionRecord = (id: string, meta: Record<string, unknown> | null): boolean =>
	/(^|\/)version-/.test(id) || (meta != null && 'version' in meta);

// Sibling records under the same parent that represent document versions
// (leaf named version-* or carrying a version frontmatter field).
export function versionSiblings(scope: string, entity: string, id: string): DataRecordRef[] {
	const baseId = baseIdOf(id);
	return listRecords(scope, entity).filter((r) => {
		if (r.id === id) return false;
		const leaf = r.id.slice(r.id.lastIndexOf('/') + 1);
		return r.parent === baseId && (leaf.startsWith('version-') || 'version' in (r.meta ?? {}));
	});
}

export interface GraphNode {
	id: string;
	title: string;
	entity: string;
	scope: string;
	parent?: string;
}

export type GraphEdgeKind = 'tree' | 'rel' | 'issuer';

export interface GraphEdge {
	a: number;
	b: number;
	kind: GraphEdgeKind;
}

// All records visible on a scope as nodes. Edges are the parent/child
// hierarchy, undirected links from related[] frontmatter, and issuer links
// (matched on id, name, short, designation, aliases).
export function recordGraph(scope: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
	const refs = ENTITIES.flatMap((e) => listRecords(scope, e));
	const keyToIdx = new Map<string, number>();
	const idToIdx = new Map<string, number>();
	refs.forEach((r, i) => {
		idToIdx.set(r.id, i);
		const keys = [
			r.id,
			r.meta?.name,
			r.meta?.short,
			r.meta?.designation,
			...(Array.isArray(r.meta?.aliases) ? r.meta.aliases : [])
		]
			.filter((k): k is string => typeof k === 'string' && !!k)
			.map((k) => k.toLowerCase());
		for (const k of keys) if (!keyToIdx.has(k)) keyToIdx.set(k, i);
	});
	const rank: Record<GraphEdgeKind, number> = { tree: 0, issuer: 1, rel: 2 };
	const edges = new Map<string, GraphEdge>();
	const add = (a: number, b: number, kind: GraphEdgeKind) => {
		if (a === b) return;
		const key = a < b ? `${a}-${b}` : `${b}-${a}`;
		const prev = edges.get(key);
		if (!prev || rank[kind] > rank[prev.kind]) edges.set(key, { a, b, kind });
	};
	refs.forEach((r, i) => {
		if (r.parent) {
			const p = idToIdx.get(r.parent);
			if (p !== undefined) add(p, i, 'tree');
		}
		for (const [field, kind] of [
			['related', 'rel'],
			['issuer', 'issuer']
		] as const) {
			const v = r.meta?.[field];
			for (const key of (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []).map((x) =>
				String(x).toLowerCase()
			)) {
				const j = keyToIdx.get(key);
				if (j !== undefined) add(i, j, kind);
			}
		}
	});
	return {
		nodes: refs.map((r) => ({
			id: r.id,
			title: r.title ?? r.id,
			entity: r.entity,
			scope: r.scope,
			parent: r.parent
		})),
		edges: [...edges.values()]
	};
}

// Records whose related[] frontmatter points at this record (by id, name,
// short, designation or any alias).
export function referencedByRecords(
	scope: string,
	id: string,
	meta: Record<string, unknown> | null
): DataRecordRef[] {
	const relKeys = new Set(
		[
			id,
			meta?.name,
			meta?.short,
			meta?.designation,
			...(Array.isArray(meta?.aliases) ? meta.aliases : [])
		]
			.filter((k): k is string => typeof k === 'string' && !!k)
			.map((k) => k.toLowerCase())
	);
	return ENTITIES.flatMap((e) => listRecords(scope, e)).filter(
		(r) =>
			r.id !== id &&
			Array.isArray(r.meta?.related) &&
			(r.meta.related as unknown[]).some((v) => relKeys.has(String(v).toLowerCase()))
	);
}

export { isEntity, isSiteScope };
