import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import MiniSearch from 'minisearch';

const DATA = 'data';
const OUT = 'src/lib/generated';

const SITE_SCOPES = ['regelverk', 'ot', 'it', 'fysisk', 'brandskydd', 'el', 'arbetsmiljo'];
const ENTITIES = [
	'lagstiftning',
	'standarder',
	'ramverk',
	'myndigheter',
	'system',
	'krav',
	'implementera',
	'sakerhet',
	'branscher',
	'lar-dig'
];

function* walk(dir) {
	for (const e of readdirSync(dir)) {
		const p = join(dir, e);
		if (statSync(p).isDirectory()) yield* walk(p);
		else yield p;
	}
}

const splitLocale = (id) => {
	const m = id.match(/^(.*)\.(en|sv)$/);
	return m ? { id: m[1], locale: m[2] } : { id, locale: 'sv' };
};

const parseMeta = (path, body) => {
	try {
		if (path.endsWith('.yaml') || path.endsWith('.yml')) return parseYaml(body);
		const fm = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
		return fm ? parseYaml(fm[1]) : null;
	} catch {
		return null;
	}
};

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tokenize = (s) =>
	fold(s)
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);

const flattenStrings = (v, out = []) => {
	if (typeof v === 'string') out.push(v);
	else if (typeof v === 'number' || typeof v === 'boolean') out.push(String(v));
	else if (Array.isArray(v)) v.forEach((i) => flattenStrings(i, out));
	else if (v && typeof v === 'object') Object.values(v).forEach((i) => flattenStrings(i, out));
	return out;
};

const articleText = (path, body) =>
	path.endsWith('.md') || path.endsWith('.svx')
		? body.replace(/^---\r?\n[\s\S]*?\r?\n---/, ' ').replace(/```[\s\S]*?```/g, ' ')
		: '';

const META_KEYS = new Set([
	'name',
	'short',
	'designation',
	'aliases',
	'logo',
	'description',
	'sites',
	'related',
	'type',
	'issuer',
	'jurisdiction',
	'published',
	'appliesFrom',
	'applies-from',
	'lastReviewed',
	'sourceChecked',
	'version',
	'source',
	'url',
	'celex',
	'sfs',
	'implements',
	'reviewStatus',
	'legalStatus',
	'licenseClass',
	'edition',
	'status'
]);

const pickMeta = (meta) => {
	if (!meta || typeof meta !== 'object') return meta ?? null;
	const out = {};
	for (const k of META_KEYS) if (k in meta) out[k] = meta[k];
	return out;
};

const files = [...walk(DATA)].filter((p) => /\.(ya?ml|md|svx)$/.test(p));
const records = [];
const searchPaths = new Map();

for (const file of files) {
	const rel = '/' + file.replaceAll('\\', '/');
	const m = rel.match(/^\/data\/([^/]+)\/([^/]+)\/(.+)\.(?:yaml|yml|md|svx)$/);
	if (!m) continue;
	const [, scope, entity, rawId] = m;
	if (scope === 'registry') continue;
	const body = readFileSync(file, 'utf-8');

	let ref = null;
	if (SITE_SCOPES.includes(scope) && entity === 'pages') {
		const { id, locale } = splitLocale(rawId);
		ref = { scope, entity: 'pages', id, parent: undefined, locale };
	} else if (SITE_SCOPES.includes(scope) && ENTITIES.includes(entity)) {
		const { id, locale } = splitLocale(rawId);
		const parent = id.includes('/') ? id.split('/').slice(0, -1).join('/') : undefined;
		ref = { scope, entity, id, parent, locale };
	}
	if (!ref) continue;

	const meta = parseMeta(file, body);
	const title = meta?.title ?? meta?.name;
	records.push({
		scope: ref.scope,
		entity: ref.entity,
		id: ref.id,
		parent: ref.parent,
		locale: ref.locale,
		title: typeof title === 'string' ? title : undefined,
		meta: pickMeta(meta)
	});

	const key = `${ref.scope}/${ref.entity}/${ref.id}`;
	const entry = searchPaths.get(key) ?? { ref, paths: [] };
	entry.paths.push({ path: file, rel, body });
	searchPaths.set(key, entry);
}

const index = new MiniSearch({
	fields: ['title', 'idText', 'description', 'meta', 'body'],
	tokenize
});
const store = {};
const docs = [];
for (const [key, { ref, paths }] of searchPaths) {
	let title = ref.id;
	let description;
	const metas = [];
	const bodies = [];
	for (const { path, body } of paths) {
		const meta = parseMeta(path, body);
		title = (meta?.title ?? meta?.name) || title;
		const text = articleText(path, body);
		description ??=
			typeof meta?.description === 'string'
				? meta.description
				: text.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined;
		metas.push(flattenStrings(meta ?? {}).join(' '));
		bodies.push(text);
	}
	store[key] = {
		scope: ref.scope,
		entity: ref.entity,
		id: ref.id,
		parent: ref.parent,
		locale: ref.locale,
		title,
		meta: paths[0] ? parseMeta(paths[0].path, paths[0].body) : null,
		description,
		tokens: tokenize(`${ref.id} ${title} ${description ?? ''}`)
	};
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

const visibleOn = (scope, r) =>
	r.scope === scope || (Array.isArray(r.meta?.sites) && r.meta.sites.includes(scope));

const bestVariant = (a, b, want) =>
	a.locale === want ? a : b.locale === want ? b : a.locale === 'sv' ? a : b;

const topNav = {};
for (const scope of SITE_SCOPES)
	for (const entity of ENTITIES)
		for (const locale of ['sv', 'en']) {
			const byKey = new Map();
			for (const r of records) {
				if (r.entity !== entity || r.parent || !visibleOn(scope, r)) continue;
				const k = `${r.scope}/${r.id}`;
				byKey.set(k, byKey.has(k) ? bestVariant(byKey.get(k), r, locale) : r);
			}
			const top = [...byKey.values()]
				.sort((a, b) => a.id.localeCompare(b.id, 'sv', { numeric: true }))
				.slice(0, 5)
				.map((r) => ({ id: r.id, title: r.title }));
			if (top.length) topNav[`${locale}:${scope}:${entity}`] = top;
		}

mkdirSync(OUT, { recursive: true });
writeFileSync(
	join(OUT, 'records.ts'),
	`export const records: { scope: string; entity: string; id: string; parent?: string; locale?: string; title?: string; meta: Record<string, unknown> | null }[] = JSON.parse(${JSON.stringify(JSON.stringify(records))});\n`
);
writeFileSync(
	join(OUT, 'searchIndex.ts'),
	`export const searchIndexJson: string = ${JSON.stringify(JSON.stringify(index))};\nexport const searchStore: Record<string, unknown> = ${JSON.stringify(store)};\n`
);
writeFileSync(
	join(OUT, 'topNav.ts'),
	`export const topNav: Record<string, { id: string; title?: string }[]> = ${JSON.stringify(topNav, null, '\t')};\n`
);

const recordOg = {};
if (existsSync('static/og')) {
	for (const f of readdirSync('static/og')) {
		if (!f.startsWith('r-') || !f.endsWith('.png')) continue;
		const rest = f.slice(2, -4);
		const scope = SITE_SCOPES.find((s) => rest.startsWith(`${s}-`));
		if (!scope) continue;
		const afterScope = rest.slice(scope.length + 1);
		const entity = [...ENTITIES]
			.sort((a, b) => b.length - a.length)
			.find((e) => afterScope.startsWith(`${e}-`));
		if (!entity) continue;
		recordOg[`${scope}/${entity}/${afterScope.slice(entity.length + 1)}`] = `/og/${f}`;
	}
}
writeFileSync(
	join(OUT, 'ogImages.ts'),
	`export const recordOg: Record<string, string> = ${JSON.stringify(recordOg, null, '\t')};\n`
);

console.log(`manifest: ${records.length} records, ${docs.length} search docs`);
