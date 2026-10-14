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
	return [...byKey.values()].sort((a, b) => a.id.localeCompare(b.id, 'sv', { numeric: true }));
}

export function nestRecords(items: DataRecordRef[]): DataRecordRef[] {
	const top = items.filter((i) => !i.parent);
	for (const p of top)
		p.children = items
			.filter((c) => c.parent === p.id)
			.sort((a, b) => a.id.localeCompare(b.id, 'sv', { numeric: true }));
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
	return [...byKey.values()].sort((a, b) => a.id.localeCompare(b.id, 'sv', { numeric: true }));
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

export { isEntity, isSiteScope };
