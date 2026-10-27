// Generates per-site PNG assets into static/:
//   og-{scope}.png              1200x630  social card
//   og/r-{scope}-{entity}-{id}.png  1200x630  per-record card for top records
//   icon-192-{scope}.png        192x192   PWA icon
//   icon-512-{scope}.png        512x512   PWA icon (also maskable)
//   apple-touch-icon-{scope}.png 180x180  iOS icon
// Also writes src/lib/generated/ogImages.ts mapping record keys to og paths.
// Run: pnpm exec playwright install chromium && node scripts/gen-site-images.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE_COLOR = {
	regelverk: '#0d0d0d',
	ot: '#ea580c',
	it: '#2563eb',
	fysisk: '#9333ea',
	brandskydd: '#dc2626',
	el: '#ca8a04',
	arbetsmiljo: '#16a34a'
};

const SCOPES = Object.keys(SITE_COLOR);
const msgs = JSON.parse(readFileSync('messages/sv.json', 'utf8'));

const NAME = {
	regelverk: 'regelverk.org',
	ot: msgs.site_long_ot,
	it: msgs.site_long_it,
	fysisk: msgs.site_long_fysisk,
	brandskydd: msgs.site_long_brandskydd,
	el: msgs.site_long_el,
	arbetsmiljo: msgs.site_long_arbetsmiljo
};

const DESC = {
	regelverk: msgs.site_desc_regelverk,
	ot: msgs.site_desc_ot,
	it: msgs.site_desc_it,
	fysisk: msgs.site_desc_fysisk,
	brandskydd: msgs.site_desc_brandskydd,
	el: msgs.site_desc_el,
	arbetsmiljo: msgs.site_desc_arbetsmiljo
};

const faviconSvg = (scope) =>
	readFileSync(
		scope === 'regelverk' ? 'static/favicon.svg' : `static/favicon-${scope}.svg`,
		'utf8'
	).replace('<svg ', '<svg width="100%" height="100%" ');

const tint = (hex, amt) => {
	const n = parseInt(hex.slice(1), 16);
	const mix = (c) => Math.round(c + (255 - c) * amt);
	return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
};

const FONT = `system-ui,-apple-system,'Segoe UI',sans-serif`;

const ogHtml = (scope, color, svg) => `<!doctype html><html><body style="margin:0">
<div style="width:1200px;height:630px;display:flex;font-family:${FONT};background:#fff">
	<div style="width:28px;background:${color}"></div>
	<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:56px 72px">
		<div style="display:flex;align-items:center;gap:48px">
			<div style="width:132px;height:132px;flex:none">${svg}</div>
			<div>
				<div style="font-size:62px;font-weight:700;color:#1c1917;letter-spacing:-0.02em;line-height:1.1">${NAME[scope]}</div>
				<div style="font-size:38px;font-weight:600;color:${color};margin-top:10px">${scope === 'regelverk' ? 'Regelverk för alla sektorer' : 'regelverk.org'}</div>
			</div>
		</div>
		<div style="margin-top:44px;font-size:28px;line-height:1.45;color:#57534e">${DESC[scope]}</div>
	</div>
</div></body></html>`;

const iconHtml = (color, svg, size) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${tint(color, 0.9)};font-family:${FONT}">
	<div style="width:${Math.round(size * 0.55)}px;height:${Math.round(size * 0.55)}px">${svg}</div>
</div></body></html>`;

const browser = await chromium.launch();

for (const scope of SCOPES) {
	const color = SITE_COLOR[scope];
	const svg = faviconSvg(scope);
	const page = await browser.newPage();

	await page.setViewportSize({ width: 1200, height: 630 });
	await page.setContent(ogHtml(scope, color, svg));
	await page.screenshot({ path: `static/og-${scope}.png` });

	for (const size of [192, 512]) {
		await page.setViewportSize({ width: size, height: size });
		await page.setContent(iconHtml(color, svg, size));
		await page.screenshot({ path: `static/icon-${size}-${scope}.png` });
	}

	await page.setViewportSize({ width: 180, height: 180 });
	await page.setContent(iconHtml(color, svg, 180));
	await page.screenshot({ path: `static/apple-touch-icon-${scope}.png` });

	await page.close();
	console.log(`generated ${scope}`);
}

// --- per-record OG cards for top records -------------------------------------

const ENT_LABEL = {
	lagstiftning: msgs.ent_lagstiftning,
	standarder: msgs.ent_standarder,
	ramverk: msgs.ent_ramverk,
	myndigheter: msgs.ent_myndigheter,
	system: msgs.ent_system,
	krav: msgs.ent_krav,
	implementera: msgs.ent_implementera,
	sakerhet: msgs.ent_sakerhet,
	branscher: msgs.ent_branscher,
	'lar-dig': msgs.ent_lar_dig
};

const extract = (file) => {
	const src = readFileSync(file, 'utf8');
	const lit = src.match(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/);
	if (lit) return JSON.parse(JSON.parse(lit[1]));
	const obj = src.match(/=\s*(\{[\s\S]*\});?\s*$/);
	return JSON.parse(obj[1]);
};

const topNav = extract('src/lib/generated/topNav.ts');
const allRecords = extract('src/lib/generated/records.ts');

// best (sv-first) record variant per scope/entity/id
const recordMap = new Map();
for (const r of allRecords) {
	const key = `${r.scope}/${r.entity}/${r.id}`;
	const prev = recordMap.get(key);
	if (!prev || (r.locale === 'sv' && prev.locale !== 'sv')) recordMap.set(key, r);
}

// union of top records per scope/entity (sv + en lists)
const ogTargets = new Map();
for (const [key, list] of Object.entries(topNav)) {
	const [, scope, entity] = key.split(':');
	for (const { id } of list) {
		const rec =
			recordMap.get(`${scope}/${entity}/${id}`) ?? recordMap.get(`regelverk/${entity}/${id}`);
		if (!rec) continue;
		const k = `${scope}/${entity}/${id}`;
		if (!ogTargets.has(k)) ogTargets.set(k, rec);
	}
}

const esc = (s) =>
	String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

const safe = (id) => id.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
const ogPathFor = (scope, entity, id) => `/og/r-${scope}-${entity}-${safe(id)}.png`;

const ogRecordHtml = ({
	title,
	designation,
	entity,
	scope,
	color,
	svg
}) => `<!doctype html><html><body style="margin:0">
<div style="width:1200px;height:630px;display:flex;font-family:${FONT};background:#fff">
	<div style="width:28px;background:${color}"></div>
	<div style="flex:1;display:flex;flex-direction:column;padding:52px 64px;min-width:0">
		<div style="display:flex;align-items:center;gap:14px;font-size:26px;font-weight:600;color:${color}">
			<span>${esc(ENT_LABEL[entity] ?? entity)}</span>
			${designation ? `<span style="color:#a8a29e;font-weight:500">· ${esc(designation)}</span>` : ''}
		</div>
		<div style="margin-top:20px;font-size:${title.length > 90 ? 40 : title.length > 55 ? 48 : 56}px;font-weight:700;color:#1c1917;letter-spacing:-0.015em;line-height:1.15;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${esc(title)}</div>
		<div style="margin-top:auto;display:flex;align-items:center;gap:16px">
			<div style="width:44px;height:44px;flex:none">${svg}</div>
			<div style="font-size:26px;font-weight:600;color:#57534e">${NAME[scope]}</div>
		</div>
	</div>
</div></body></html>`;

mkdirSync('static/og', { recursive: true });
const ogMap = {};
if (ogTargets.size) {
	const page = await browser.newPage();
	await page.setViewportSize({ width: 1200, height: 630 });
	for (const [key, rec] of ogTargets) {
		const [scope, entity, id] = key.split('/');
		const color = SITE_COLOR[scope] ?? '#0d0d0d';
		const svg = faviconSvg(scope in SITE_COLOR ? scope : 'regelverk');
		const title = rec.title ?? rec.meta?.name ?? id;
		const designation = typeof rec.meta?.designation === 'string' ? rec.meta.designation : '';
		await page.setContent(ogRecordHtml({ title, designation, entity, scope, color, svg }));
		const p = ogPathFor(scope, entity, id);
		await page.screenshot({ path: `static${p}` });
		ogMap[key] = p;
	}
	await page.close();
	console.log(`generated ${ogTargets.size} record og images`);
}

writeFileSync(
	'src/lib/generated/ogImages.ts',
	`export const recordOg: Record<string, string> = ${JSON.stringify(ogMap, null, '\t')};\n`
);

await browser.close();
