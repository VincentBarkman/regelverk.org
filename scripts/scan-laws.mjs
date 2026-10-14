#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	unlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'data/registry/laws.yaml';
const OUT_DIR = 'data/regelverk/lagstiftning';
const RAW_DIR = 'data/registry/raw';
const MARK_START = '<!-- scan-laws:start -->';
const MARK_END = '<!-- scan-laws:end -->';
const TODAY = new Date().toISOString().slice(0, 10);

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const argVal = (n) => args[args.indexOf(`--${n}`) + 1];
const ONLY = args.includes('--law') ? argVal('law') : null;
const OFFLINE = flag('offline');
const DRY = flag('dry');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchDoc(url, tries = 14, headers = {}) {
	for (let i = 0; i < tries; i++) {
		try {
			const res = await fetch(url, {
				headers: { 'user-agent': 'Mozilla/5.0 (regelverk.org law scanner)', ...headers }
			});
			if (res.status === 200) return await res.text();
			if (res.headers.get('x-amzn-waf-action')) return null;
			if (![202, 429, 500, 502, 503].includes(res.status)) {
				const err = new Error(`HTTP ${res.status}`);
				err.fatal = true;
				throw err;
			}
		} catch (e) {
			if (e.fatal || i === tries - 1) throw e;
		}
		await sleep(5000 + i * 3000);
	}
	throw new Error(`fetch failed after ${tries} tries: ${url}`);
}
const ENTITIES = {
	nbsp: ' ',
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	ndash: '–',
	mdash: '—',
	sect: '§',
	para: '¶',
	hellip: '…',
	auml: 'ä',
	ouml: 'ö',
	aring: 'å',
	Auml: 'Ä',
	Ouml: 'Ö',
	Aring: 'Å',
	eacute: 'é',
	Eacute: 'É',
	egrave: 'è',
	laquo: '«',
	raquo: '»'
};

const decodeEntities = (s) =>
	s
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m);

function htmlToText(html) {
	let s = html
		.replace(/<a[^>]*id="ntc[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '$1')
		.replace(/<span class="oj-super[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1')
		.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/td>/gi, ' ')
		.replace(/<\/(?:p|tr|div|table|li|h[1-6]|tbody)>/gi, '\n')
		.replace(/<[^>]+>/g, '');
	s = decodeEntities(s);
	return s
		.split('\n')
		.map((l) => l.replace(/\s+/g, ' ').trim())
		.filter(Boolean)
		.join('\n\n');
}

const slugify = (s) =>
	s
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 };
const romanToInt = (r) => {
	let n = 0;
	for (let i = 0; i < r.length; i++)
		n += ROMAN[r[i]] < (ROMAN[r[i + 1]] ?? 0) ? -ROMAN[r[i]] : ROMAN[r[i]];
	return n;
};
function parseEurlex(html, locale) {
	const chRe = new RegExp(locale === 'en' ? '^\\s*CHAPTER\\b' : '^\\s*KAPITEL\\b');
	const marks = [];
	for (const m of html.matchAll(/<p[^>]*class="oj-ti-section-1"[^>]*>([\s\S]*?)<\/p>/g))
		marks.push({ pos: m.index, kind: 'heading', text: htmlToText(m[1]) });
	for (const m of html.matchAll(/<div class="eli-subdivision" id="art_(\d+[a-z]*)">/g))
		marks.push({ pos: m.index, kind: 'article', num: m[1] });
	for (const m of html.matchAll(/<div class="eli-subdivision" id="(anx|fms|sig)[^"]*">/g))
		marks.push({ pos: m.index, kind: 'end' });
	marks.sort((a, b) => a.pos - b.pos);

	const chapters = [];
	let cur = null;
	for (const mark of marks) {
		if (mark.kind === 'end') break;
		if (mark.kind === 'heading') {
			if (chRe.test(mark.text)) {
				const num =
					mark.text.match(/(?:KAPITEL|CHAPTER)\s+([IVXLCDM]+|\d+)/i)?.[1] ??
					`${chapters.length + 1}`;
				const n = /^\d+$/.test(num) ? +num : romanToInt(num);
				const after = html.slice(mark.pos, mark.pos + 3000);
				const sub = after.match(/class="oj-ti-section-2"[^>]*>([\s\S]*?)<\/p>/)?.[1];
				cur = {
					slug: `kap-${n}`,
					anchor: `cpt_${num}`,
					num: `${n}`,
					title: sub ? htmlToText(sub) : '',
					labelSv: `Kapitel ${num}`,
					labelEn: `Chapter ${num}`,
					provisions: []
				};
				chapters.push(cur);
			}
			continue;
		}
		if (!cur) {
			cur = {
				slug: 'artiklar',
				anchor: '',
				num: '0',
				title: '',
				labelSv: 'Artiklar',
				labelEn: 'Articles',
				provisions: []
			};
			chapters.push(cur);
		}
		const end = marks[marks.indexOf(mark) + 1]?.pos ?? html.length;
		const seg = html.slice(mark.pos, end);
		const subtitle = seg.match(/class="oj-sti-art"[^>]*>([\s\S]*?)<\/p>/)?.[1];
		const body = htmlToText(
			seg
				.replace(/^[\s\S]*?class="oj-ti-art"[^>]*>[^<]*<\/p>/, '')
				.replace(/<div class="eli-title"[\s\S]*?<\/div>/, '')
		);
		cur.provisions.push({
			label: `Artikel ${mark.num}`,
			labelEn: `Article ${mark.num}`,
			title: subtitle ? htmlToText(subtitle) : '',
			anchor: `art_${mark.num}`,
			body
		});
	}
	return chapters.filter((c) => c.provisions.length);
}

function parseCellarLegacy(html, locale) {
	const paras = [];
	for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
		const t = htmlToText(m[1]).replace(/\s+/g, ' ').trim();
		if (t) paras.push(t);
	}
	const secRe =
		locale === 'en'
			? /^(SECTION|CHAPTER|TITLE|PART)\s+[IVXLCDM\d]+/i
			: /^(AVSNITT|KAPITEL|DEL|AVDELNING)\s+[IVXLCDM\d]+/i;
	const artRe = locale === 'en' ? /^Article\s+\d+[a-z]*$/i : /^Artikel\s+\d+[a-z]*$/i;
	const numRe = /\d+[a-z]*/;

	const chapters = [];
	let cur = null;
	let prov = null;
	const flush = () => {
		if (prov && cur) cur.provisions.push(prov);
		prov = null;
	};
	for (let i = 0; i < paras.length; i++) {
		const t = paras[i];
		if (/^(HÄRIGENOM FÖRESKRIVS|HAS ADOPTED|HAR ANTAGIT)/i.test(t) && !cur) continue;
		if (secRe.test(t)) {
			flush();
			const prefix = t.match(secRe)[0];
			const rest = t.slice(prefix.length).trim();
			const num = prefix.match(/([IVXLCDM]+|\d+)$/)?.[1] ?? `${chapters.length + 1}`;
			const n = /^\d+$/.test(num) ? +num : romanToInt(num.toUpperCase());
			cur = {
				slug: `kap-${n}`,
				anchor: '',
				num: `${n}`,
				title: rest,
				labelSv: t.split(/\s+/).slice(0, 2).join(' '),
				labelEn: t.split(/\s+/).slice(0, 2).join(' '),
				provisions: []
			};
			chapters.push(cur);
			continue;
		}
		if (artRe.test(t)) {
			flush();
			if (!cur) {
				cur = {
					slug: 'artiklar',
					anchor: '',
					num: '0',
					title: '',
					labelSv: 'Artiklar',
					labelEn: 'Articles',
					provisions: []
				};
				chapters.push(cur);
			}
			const num = t.match(numRe)[0];
			let title = '';
			const next = paras[i + 1] ?? '';
			if (
				next &&
				next.length < 100 &&
				!/\.\s*$|^\d+\./.test(next) &&
				!artRe.test(next) &&
				!secRe.test(next)
			) {
				title = next;
				i++;
			}
			prov = {
				label: `Artikel ${num}`,
				labelEn: `Article ${num}`,
				title,
				anchor: `art_${num}`,
				body: ''
			};
			continue;
		}
		if (/^(BILAGA|ANNEX)\b/i.test(t)) {
			flush();
			break;
		}
		if (prov) prov.body = prov.body ? prov.body + '\n\n' + t : t;
		else if (cur) {
			if (!cur.provisions.length) cur.title = cur.title ? cur.title + ' ' + t : cur.title;
		}
	}
	flush();
	return chapters.filter((c) => c.provisions.length);
}

function parseRiksdagen(html, annex = false) {
	const chapters = new Map();
	for (const m of html.matchAll(/<h3[^>]*name="K(\d+)"[^>]*>([\s\S]*?)<\/h3>/g))
		chapters.set(m[1], htmlToText(m[2]).replace(/\s+/g, ' ').trim());

	const events = [];
	for (const m of html.matchAll(/<h3[^>]*name="K(\d+)"[^>]*>/g))
		events.push({ pos: m.index, kind: 'chapter', ch: m[1] });
	for (const m of html.matchAll(/<h4[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/h4>/g)) {
		const title = m[1].trim();
		if (annex) {
			if (/^(Del|Part|Partie|Première|Deuxième|Troisième|Bilaga)\b/i.test(title)) {
				events.push({ pos: m.index, kind: 'section', title });
				continue;
			}
			const isIntro = /^(Inledning|Preamble|Préambule)$/i.test(title);
			if (isIntro) events.push({ pos: m.index, kind: 'section', title });
			events.push({
				pos: m.index + (isIntro ? 1 : 0),
				kind: 'art',
				label: htmlToText(m[2]).replace(/\s+/g, ' ').trim() || title,
				bodyFrom: m.index + m[0].length
			});
			continue;
		}
		events.push({ pos: m.index, kind: 'section', title });
	}
	for (const m of html.matchAll(
		/<a name="(?:K(\d+))?P(\d+\s*[a-z]?)"><b[^>]*>([\d]+\s*[a-z]?)\s*§<\/b><\/a>([\s\S]*?)(?=<a name="(?:K\d+)?P\d+\s*[a-z]?"><b|<h[1-6][ >]|$)/g
	))
		events.push({
			pos: m.index,
			kind: 'para',
			ch: m[1] ?? null,
			anchor: m[1] ? `K${m[1]}P${m[2]}` : `P${m[2]}`,
			label: `${m[3].trim()} §`,
			bodyHtml: m[4]
		});
	events.sort((a, b) => a.pos - b.pos);
	for (let i = 0; i < events.length; i++) {
		const e = events[i];
		if (e.kind === 'art') e.bodyHtml = html.slice(e.bodyFrom, events[i + 1]?.pos ?? html.length);
	}

	const chaptered = events.some((e) => e.kind === 'para' && e.ch);
	const groups = new Map();
	let cur = null;
	for (const e of events) {
		if (e.kind === 'chapter') {
			if (!chaptered) continue;
			const n = parseInt(e.ch, 10);
			cur = groups.get(`kap-${n}`) ?? {
				slug: `kap-${n}`,
				anchor: `K${e.ch}`,
				num: `${n}`,
				title: chapters.get(e.ch) ?? '',
				labelSv: `${n} kap.`,
				labelEn: `Chapter ${n}`,
				provisions: []
			};
			groups.set(cur.slug, cur);
			continue;
		}
		if (e.kind === 'section') {
			if (chaptered) continue;
			const slug = slugify(e.title) || `avsnitt-${groups.size + 1}`;
			cur = groups.get(`avsnitt-${slug}`) ?? {
				slug: `avsnitt-${slug}`,
				anchor: e.title,
				num: `${groups.size + 1}`,
				title: e.title,
				labelSv: e.title,
				labelEn: e.title,
				provisions: []
			};
			groups.set(cur.slug, cur);
			continue;
		}
		if (e.kind === 'art') {
			if (!cur) {
				cur = {
					slug: 'inledande',
					anchor: '',
					num: '0',
					title: 'Inledande bestämmelser',
					labelSv: 'Inledande bestämmelser',
					labelEn: 'Introductory provisions',
					provisions: []
				};
				groups.set(cur.slug, cur);
			}
			const body = htmlToText(e.bodyHtml);
			const parts = body.split(/\n\n(?=(?:Artikel|Article)\s+\S)/);
			cur.provisions.push({ label: e.label, anchor: '', body: parts[0].trim() });
			for (const part of parts.slice(1)) {
				const lm = part.match(/^((?:Artikel|Article)\s+\S+)\s*([\s\S]*)$/);
				if (lm)
					cur.provisions.push({
						label: lm[1].replace(/\s+/g, ' ').trim(),
						anchor: '',
						body: lm[2].trim()
					});
			}
			continue;
		}
		if (!cur || (chaptered && e.ch !== cur.anchor?.slice(1))) {
			if (chaptered && e.ch) {
				const n = parseInt(e.ch, 10);
				cur = groups.get(`kap-${n}`) ?? null;
				if (!cur) {
					cur = {
						slug: `kap-${n}`,
						anchor: `K${e.ch}`,
						num: `${n}`,
						title: chapters.get(e.ch) ?? '',
						labelSv: `${n} kap.`,
						labelEn: `Chapter ${n}`,
						provisions: []
					};
					groups.set(cur.slug, cur);
				}
			} else if (!chaptered && !cur) {
				cur = {
					slug: 'inledande',
					anchor: '',
					num: '0',
					title: 'Inledande bestämmelser',
					labelSv: 'Inledande bestämmelser',
					labelEn: 'Introductory provisions',
					provisions: []
				};
				groups.set(cur.slug, cur);
			}
		}
		if (!cur) continue;
		const body = htmlToText(e.bodyHtml);
		const parts = body.split(/\n\n(?=\d+(?:\s+[a-z])?\s*§\s+[A-ZÅÄÖÜÉ])/);
		const main = parts[0];
		const dupIdx = cur.provisions.findIndex((p) => p.anchor === e.anchor);
		if (dupIdx >= 0) {
			const prev = cur.provisions[dupIdx];
			if (/^\/Träder i kraft/.test(prev.body) && !/^\/Träder i kraft/.test(main))
				cur.provisions[dupIdx] = { label: e.label, anchor: e.anchor, body: main };
		} else {
			cur.provisions.push({ label: e.label, anchor: e.anchor, body: main });
		}
		for (const part of parts.slice(1)) {
			const lm = part.match(/^(\d+(?:\s+[a-z])?)\s*§\s*([\s\S]*)$/);
			if (lm) cur.provisions.push({ label: `${lm[1].trim()} §`, anchor: '', body: lm[2].trim() });
		}
	}
	let out = [...groups.values()];
	if (annex) {
		const nonSv = /^(Part|Première|Deuxième|Troisième|Convention|Préambule|Preamble)\b/i;
		const nonSvProv = /^(Article|Convention|Preamble|Préambule|Première|Deuxième|Troisième)\b/i;
		out = out.filter((g) => !nonSv.test(g.title));
		for (const g of out) g.provisions = g.provisions.filter((p) => !nonSvProv.test(p.label));
	}
	return out.filter((c) => c.provisions.length);
}
function divEnd(html, from) {
	let depth = 1;
	const re = /<div\b|<\/div>/g;
	re.lastIndex = from;
	let m;
	while ((m = re.exec(html))) {
		depth += m[0] === '</div>' ? -1 : 1;
		if (!depth) return m.index;
	}
	return html.length;
}

function parseAv(html) {
	const start = html.indexOf('id="rules"');
	const doc = start >= 0 ? html.slice(start) : html;
	const events = [];
	for (const m of doc.matchAll(/<h3[^>]*data-menu="true"[^>]*>([\s\S]*?)<\/h3>/g))
		events.push({
			pos: m.index,
			kind: 'h3',
			title: htmlToText(m[1]).replace(/\s+/g, ' ').trim(),
			bodyFrom: m.index + m[0].length
		});
	for (const m of doc.matchAll(/<h4[^>]*data-menu="true"[^>]*>([\s\S]*?)<\/h4>/g))
		events.push({
			pos: m.index,
			kind: 'h4',
			title: htmlToText(m[1]).replace(/\s+/g, ' ').trim(),
			bodyFrom: m.index + m[0].length
		});
	for (const m of doc.matchAll(/<span[^>]*class="section-sign"[^>]*>([\s\S]*?)<\/span>/g))
		events.push({
			pos: m.index,
			kind: 'para',
			label: htmlToText(m[1]).replace(/\s+/g, ' ').trim(),
			bodyFrom: m.index + m[0].length
		});
	for (const m of doc.matchAll(/<div[^>]*class="general-recommendation"[^>]*>/g))
		events.push({
			pos: m.index,
			kind: 'rad',
			bodyFrom: m.index + m[0].length,
			bodyTo: divEnd(doc, m.index + m[0].length)
		});
	events.sort((a, b) => a.pos - b.pos);

	const groups = new Map();
	let cur = null;
	let pendingTitle = '';
	const fallback = () => {
		if (cur) return cur;
		cur = {
			slug: 'inledande',
			anchor: '',
			num: '0',
			title: 'Inledande bestämmelser',
			labelSv: 'Inledande bestämmelser',
			labelEn: 'Introductory provisions',
			provisions: []
		};
		groups.set(cur.slug, cur);
		return cur;
	};
	const addRad = (e) => {
		const p = fallback().provisions.at(-1);
		if (!p) return;
		const text = htmlToText(doc.slice(e.bodyFrom, e.bodyTo)).trim();
		if (!text) return;
		p.body += `\n\n> _Allmänna råd_\n\n${text
			.split('\n\n')
			.filter((para) => !/^Allmänna råd$/i.test(para))
			.map((para) => `> ${para}`)
			.join('\n\n')}`;
	};
	const hasParaBeforeHeading = (i) => {
		for (let j = i + 1; j < events.length; j++) {
			if (events[j].kind === 'h3' || events[j].kind === 'h4') return false;
			if (events[j].kind === 'para') return true;
		}
		return false;
	};
	const nextHeading = (i) =>
		events.slice(i + 1).find((e) => e.kind === 'h3' || e.kind === 'h4')?.pos ?? doc.length;
	for (let i = 0; i < events.length; i++) {
		const e = events[i];
		if (e.kind === 'h3') {
			const kap = e.title.match(/^(\d+)\s*kap\.?\s*(.*)$/i);
			const slug = kap ? `kap-${parseInt(kap[1], 10)}` : `avsnitt-${slugify(e.title) || 'bilaga'}`;
			cur = groups.get(slug) ?? {
				slug,
				anchor: '',
				num: kap ? `${parseInt(kap[1], 10)}` : `${groups.size + 1}`,
				title: kap ? kap[2].trim() : e.title,
				labelSv: kap ? `${parseInt(kap[1], 10)} kap.` : e.title,
				labelEn: kap ? `Chapter ${parseInt(kap[1], 10)}` : e.title,
				provisions: []
			};
			groups.set(cur.slug, cur);
			continue;
		}
		if (e.kind === 'h4') {
			if (hasParaBeforeHeading(i)) {
				pendingTitle = e.title;
			} else {
				const text = htmlToText(doc.slice(e.bodyFrom, nextHeading(i))).trim();
				if (text) fallback().provisions.push({ label: e.title, title: '', anchor: '', body: text });
			}
			continue;
		}
		if (e.kind === 'rad') {
			addRad(e);
			continue;
		}
		fallback().provisions.push({
			label: e.label,
			title: pendingTitle,
			anchor: '',
			body: htmlToText(doc.slice(e.bodyFrom, events[i + 1]?.pos ?? doc.length)).trim()
		});
		pendingTitle = '';
	}
	return [...groups.values()].filter((c) => c.provisions.length);
}

async function fetchFsText(law, pageUrl, pageHtml) {
	const fsFile = law.fs.replace(':', '-');
	const link = [...pageHtml.matchAll(/href="([^"]+\.pdf[^"]*)"/gi)]
		.map((m) => m[1])
		.find((h) => slugify(h).includes(slugify(fsFile)));
	if (!link) throw new Error(`no PDF link on ${pageUrl}`);
	const pdfUrl = new URL(link, pageUrl).href;
	const res = await fetch(pdfUrl, {
		headers: { 'user-agent': 'Mozilla/5.0 (regelverk.org law scanner)' }
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${pdfUrl}`);
	const dir = mkdtempSync(resolve(tmpdir(), 'regelverk-'));
	try {
		const pdf = resolve(dir, 'fs.pdf');
		writeFileSync(pdf, Buffer.from(await res.arrayBuffer()));
		return {
			text: execFileSync('pdftotext', ['-layout', pdf, '-'], { maxBuffer: 32 << 20 }).toString(),
			url: pdfUrl
		};
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function parsePdf(text) {
	const paras = [];
	let cur = '';
	const indent = (line) => line.length - line.trimStart().length;
	for (const line of text.split('\n')) {
		const t = line.trim();
		if (
			!t ||
			/^\d{4}:\d+$/.test(t) ||
			/^\d+$/.test(t) ||
			/^(ISSN|Utkom från trycket)\b/i.test(t) ||
			/^(ELSÄK-FS|MSBFS|SRVFS|BFS|AFS|KBMFS|LVFS|SAFS|SAK-FS|FFS|FKFS|HSLF-FS|SOSFS|NFS|LIFS|SKOLFS|RPSFS|IMYFS|STATENS|MYNDIGHETENS)\b/.test(
				t
			)
		) {
			if (!t && cur) {
				paras.push(cur);
				cur = '';
			}
			continue;
		}
		const isKap = /^\d{1,3}\s+kap\.?(\s|$)/.test(t) && !/§/.test(t);
		const isSec = /^\d{1,3}(?:\s*[a-z])?\s*§/.test(t);
		if (isKap || isSec) {
			if (cur) {
				paras.push(cur);
				cur = '';
			}
			paras.push(`${' '.repeat(indent(line))}${t}`);
			continue;
		}
		cur = cur ? `${cur}\n${t}` : `${' '.repeat(indent(line))}${t}`;
	}
	if (cur) paras.push(cur);

	const groups = new Map();
	let chapter = null;
	let prov = null;
	let pendingTitle = '';
	let inRad = false;
	const fallback = () => {
		if (chapter) return chapter;
		chapter = {
			slug: 'bestammelser',
			anchor: '',
			num: '1',
			title: 'Bestämmelser',
			labelSv: 'Bestämmelser',
			labelEn: 'Provisions',
			provisions: []
		};
		groups.set(chapter.slug, chapter);
		return chapter;
	};
	const radOpen = () => {
		if (prov && !inRad) prov.body += '\n\n> _Allmänna råd_';
		inRad = true;
	};
	for (let i = 0; i < paras.length; i++) {
		const p = paras[i];
		const deep = indent(p) >= 8;
		const plain = p.trim();
		const kap = plain.match(/^(\d{1,3})\s+kap\.?\s*(.*)$/);
		const sec = plain.match(/^(\d{1,3}(?:\s*[a-z])?)\s*§\s*([\s\S]*)$/);
		if (kap) {
			const n = parseInt(kap[1], 10);
			chapter = groups.get(`kap-${n}`) ?? {
				slug: `kap-${n}`,
				anchor: '',
				num: `${n}`,
				title: kap[2].trim(),
				labelSv: `${n} kap.`,
				labelEn: `Chapter ${n}`,
				provisions: []
			};
			groups.set(chapter.slug, chapter);
			prov = null;
			pendingTitle = '';
			inRad = false;
			continue;
		}
		if (sec && /^(?:[A-ZÅÄÖ(]|$)/.test(sec[2].trim())) {
			const label = `${sec[1].trim().replace(/\s+/g, ' ')} §`;
			const dup = fallback().provisions.find((x) => x.label === label);
			if (dup) {
				if (sec[2].trim()) dup.body += `\n\n${sec[2].trim()}`;
				prov = dup;
				inRad = false;
				pendingTitle = '';
				continue;
			}
			inRad = false;
			prov = { label, title: pendingTitle, anchor: '', body: sec[2].trim() };
			pendingTitle = '';
			fallback().provisions.push(prov);
			continue;
		}
		if (deep) {
			if (prov) {
				radOpen();
				prov.body += `\n\n${plain
					.split('\n')
					.map((l) => `> ${l}`)
					.join('\n')}`;
			}
			continue;
		}
		const nextIsSec = /^\d{1,3}(?:\s*[a-z])?\s*§/.test(paras[i + 1]?.trim() ?? '');
		if (!sec && plain.length <= 80 && nextIsSec) {
			pendingTitle = plain;
			continue;
		}
		if (prov) prov.body += `\n\n${plain}`;
	}
	return [...groups.values()].filter((c) => c.provisions.length);
}

const fsUrls = {
	av: (fs) =>
		`https://www.av.se/arbetsmiljoarbete-och-inspektioner/publikationer/foreskrifter/afs-${fs.replace(':', '')}/`,
	elsak: (fs) =>
		`https://www.elsakerhetsverket.se/om-oss/lag-och-ratt/foreskrifter/elsak-fs-${fs.replace(':', '-')}/`,
	msbfs: (fs) => `https://www.msb.se/sv/regler/gallande-regler/msbfs-${fs.replace(':', '')}/`
};

function autoGroups(chapters) {
	const groups = [];
	let cur = null;
	let count = 0;
	const close = () => {
		if (cur?.sections.length) groups.push(cur);
		cur = null;
		count = 0;
	};
	for (const c of chapters) {
		const n = c.provisions.length;
		if (n >= 10) {
			close();
			groups.push({ title: c.title, sections: [c.slug] });
			continue;
		}
		if (!cur) cur = { title: c.title, sections: [] };
		cur.sections.push(c.slug);
		count += n;
		if (count >= 6 && cur.sections.length >= 2) close();
	}
	close();
	return groups;
}

function applyGroups(chapters, groups) {
	const bySlug = new Map(chapters.map((c) => [c.slug, c]));
	const out = [];
	let n = 0;
	for (const g of groups) {
		n += 1;
		const merged = {
			slug: `kap-${n}`,
			anchor: '',
			num: `${n}`,
			title: g.title,
			labelSv: `${n} kap.`,
			labelEn: `Chapter ${n}`,
			provisions: []
		};
		for (const s of g.sections ?? []) {
			const c = bySlug.get(s) ?? bySlug.get(`avsnitt-${slugify(s)}`);
			if (!c) {
				console.warn(`  group section not found: ${s}`);
				continue;
			}
			for (const p of c.provisions) merged.provisions.push({ ...p, section: c.title });
			bySlug.delete(c.slug);
		}
		if (merged.provisions.length) out.push(merged);
	}
	return [...out, ...bySlug.values()];
}

function chunkMonolith(ch) {
	const out = [];
	for (let i = 0; i < ch.provisions.length; i += 8) {
		const slice = ch.provisions.slice(i, i + 8);
		const n = out.length + 1;
		out.push({
			slug: `kap-${n}`,
			anchor: '',
			num: `${n}`,
			title: `${slice[0].label} – ${slice.at(-1).label}`,
			labelSv: `${n} kap.`,
			labelEn: `Chapter ${n}`,
			provisions: slice
		});
	}
	return out;
}
const rawPath = (slug, locale) => resolve(ROOT, RAW_DIR, `${slug}.${locale}.txt`);

function writeRaw(slug, locale, url, chapters) {
	const lines = [`# ${slug} [${locale}] scraped ${TODAY}`, `# source: ${url}`];
	for (const c of chapters) {
		lines.push(
			'',
			`# ${c.slug} | ${locale === 'en' ? c.labelEn : c.labelSv} | ${c.title} | ${c.anchor ?? ''}`
		);
		for (const p of c.provisions)
			lines.push(
				'',
				`## ${locale === 'en' ? (p.labelEn ?? p.label) : p.label} | ${p.title ?? ''} | ${p.anchor ?? ''}`,
				p.body
			);
	}
	const file = rawPath(slug, locale);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, lines.join('\n') + '\n');
}

function readRaw(slug, locale) {
	const file = rawPath(slug, locale);
	if (!existsSync(file)) return null;
	const text = readFileSync(file, 'utf-8');
	const marks = [...text.matchAll(/^(#|##) ([^\n]*)$/gm)];
	const chapters = [];
	let cur = null;
	for (let i = 0; i < marks.length; i++) {
		const [full, level, fields] = marks[i];
		const parts = fields.split(' | ').map((s) => s.trim());
		if (level === '#') {
			if (fields.startsWith(' ')) continue;
			if (fields.startsWith(slug) || fields.startsWith('source:')) continue;
			cur = {
				slug: parts[0],
				labelSv: parts[1] ?? '',
				labelEn: parts[1] ?? '',
				title: parts[2] ?? '',
				anchor: parts[3] ?? '',
				provisions: []
			};
			chapters.push(cur);
		} else if (cur) {
			const end = marks[i + 1]?.index ?? text.length;
			cur.provisions.push({
				label: parts[0],
				title: parts[1] === 'undefined' ? '' : (parts[1] ?? ''),
				anchor: parts[2] ?? '',
				body: text.slice(marks[i].index + full.length, end).trim()
			});
		}
	}
	const parsed = chapters.filter((c) => c.provisions.length);
	return parsed.length ? parsed : null;
}
const MANAGED_KEYS = new Set([
	'source',
	'ref',
	'kind',
	'designation',
	'jurisdiction',
	'status',
	'issuer',
	'legalStatus',
	'licenseClass',
	'url',
	'sourceChecked',
	'published',
	'applies-from',
	'type',
	'name',
	'sites',
	'implementerar',
	'implements',
	'related',
	'translation'
]);
const DEFAULT_KEYS = new Set(['title', 'description']);

const interpHeading = (locale) => (locale === 'en' ? 'Interpretation' : 'Tolkning');
const lawHeading = (locale) => (locale === 'en' ? 'Legal text' : 'Lagtext');
const interpStub = (locale) =>
	locale === 'en' ? '_No interpretation added yet._' : '_Ingen tolkning tillagd ännu._';

const fm = (obj) =>
	'---\n' +
	stringify(Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)), {
		defaultStringType: 'QUOTE_SINGLE'
	}).trim() +
	'\n---\n';

function mergeFrontmatter(existingYaml, generated) {
	const existing = existingYaml ? (parseYaml(existingYaml) ?? {}) : {};
	const merged = { ...generated };
	for (const [k, v] of Object.entries(existing)) {
		if (MANAGED_KEYS.has(k) || DEFAULT_KEYS.has(k)) continue;
		merged[k] = v;
	}
	for (const k of DEFAULT_KEYS) if (k in existing) merged[k] = existing[k];
	return fm(merged);
}

function upsertSvx(
	path,
	generatedMeta,
	generatedBlock,
	newBody,
	{ keepBodyIfNoMarkers = false } = {}
) {
	if (!existsSync(path)) {
		write(path, fm(generatedMeta) + '\n' + newBody);
		return 'created';
	}
	const old = readFileSync(path, 'utf-8');
	const oldFm = old.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
	let body = old.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
	const head = mergeFrontmatter(oldFm, generatedMeta);
	if (body.includes(MARK_START) && body.includes(MARK_END)) {
		body = body.replace(
			new RegExp(
				`${MARK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MARK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
			),
			() => generatedBlock.trimEnd()
		);
	} else if (!keepBodyIfNoMarkers) {
		body = generatedBlock + '\n' + body.trim() + '\n';
	}
	write(path, head + '\n' + body.trim() + '\n');
	return 'updated';
}

const write = (path, content) => {
	if (DRY) return;
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
};
const eurlexUrl = (celex, locale) =>
	`https://eur-lex.europa.eu/legal-content/${locale.toUpperCase()}/TXT/HTML/?uri=CELEX:${celex}`;
const SPARQL = 'https://publications.europa.eu/webapi/rdf/sparql';
const EU_LANG = { sv: 'SWE', en: 'ENG' };

async function cellarXhtmlUrl(celex, locale) {
	const q = `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#> PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?m WHERE {
  ?w cdm:work_id_document "celex:${celex}"^^xsd:string .
  ?e cdm:expression_belongs_to_work ?w .
  ?e cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/${EU_LANG[locale]}> .
  ?m cdm:manifestation_manifests_expression ?e .
  ?m cdm:manifestation_type ?t .
  FILTER(str(?t) = "xhtml" || str(?t) = "html")
} LIMIT 1`;
	const res = await fetch(`${SPARQL}?query=${encodeURIComponent(q)}`, {
		headers: { accept: 'text/csv', 'user-agent': 'Mozilla/5.0 (regelverk.org law scanner)' }
	});
	if (res.status !== 200) throw new Error(`SPARQL HTTP ${res.status}`);
	const url = (await res.text())
		.split('\n')
		.slice(1)
		.map((l) => l.replace(/^"|"$/g, '').trim())
		.find((l) => l.includes('/cellar/'));
	return url ?? null;
}

async function fetchEuDoc(celex, locale) {
	const eurlex = eurlexUrl(celex, locale);
	const html = await fetchDoc(eurlex);
	if (html != null) return { html, url: eurlex };
	const cellar = await cellarXhtmlUrl(celex, locale);
	if (!cellar) throw new Error(`no Cellar xhtml for ${celex} (${locale})`);
	const res = await fetchDoc(cellar, 14, {
		accept: 'application/xhtml+xml, text/html;q=0.9'
	});
	if (res == null) throw new Error(`Cellar WAF for ${celex} (${locale})`);
	return { html: res, url: cellar };
}
const sfsSlug = (law) =>
	law['sfs-slug'] ??
	law.title.sv
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/\((\d{4}):(\d+)\)/, '$1$2')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
const sfsUrl = (law) =>
	`https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/${sfsSlug(law)}_sfs-${law.sfs.replace(':', '-')}/`;

async function scanLaw(law) {
	const locales = law.locales ?? ['sv'];
	const isEu = Boolean(law.celex);
	const fsSource = law.source;
	const results = {};

	for (const locale of locales) {
		let url = isEu
			? eurlexUrl(law.celex, locale)
			: fsSource
				? fsUrls[fsSource](law.fs)
				: sfsUrl(law);
		let chapters;
		if (OFFLINE) {
			chapters = readRaw(law.slug, locale);
			if (chapters) console.log(`  ${locale}: ${chapters.length} chapters (cached raw)`);
		} else {
			try {
				let html;
				if (isEu) ({ html, url } = await fetchEuDoc(law.celex, locale));
				else html = await fetchDoc(url);
				if (html == null) throw new Error('WAF challenge');
				if (isEu) {
					chapters = parseEurlex(html, locale);
					if (!chapters.length) chapters = parseCellarLegacy(html, locale);
				} else if (fsSource === 'av') chapters = parseAv(html);
				else if (fsSource) {
					const pdf = await fetchFsText(law, url, html);
					url = pdf.url;
					chapters = parsePdf(pdf.text);
				} else chapters = parseRiksdagen(html, law.annex === 'sv');
				if (chapters.length) writeRaw(law.slug, locale, url, chapters);
				console.log(
					`  ${locale}: ${chapters.length} chapters, ${chapters.reduce((n, c) => n + c.provisions.length, 0)} provisions`
				);
			} catch (e) {
				console.warn(`  ${locale}: fetch failed (${e.message}); trying cached raw`);
				chapters = readRaw(law.slug, locale);
			}
		}
		if (chapters?.length && Array.isArray(law.groups)) chapters = applyGroups(chapters, law.groups);
		else if (chapters?.length && !isEu && chapters.every((c) => !c.slug.startsWith('kap-')))
			chapters = applyGroups(chapters, autoGroups(chapters));
		if (chapters?.length === 1 && !isEu && chapters[0].provisions.length > 12)
			chapters = chunkMonolith(chapters[0]);
		if (!chapters?.length && Array.isArray(law.provisions)) {
			chapters = law.provisions.map((p) => ({
				slug: typeof p === 'string' ? p : p.slug,
				labelSv: typeof p === 'string' ? p : p.ref,
				labelEn: typeof p === 'string' ? p : p.ref,
				title: typeof p === 'object' ? (p.title ?? '') : '',
				anchor: '',
				provisions: []
			}));
			console.log(`  ${locale}: using ${chapters.length} manifest stub(s)`);
		}
		if (!chapters?.length) {
			console.warn(`  ${locale}: no chapters – skipped`);
			continue;
		}
		results[locale] = { url, chapters };
	}
	return results;
}
const l10n = (law, f, locale) =>
	typeof law[f] === 'object' ? (law[f][locale] ?? law[f].sv) : law[f];

const shortName = (law, locale) =>
	l10n(law, 'name', locale).match(/\(([^)]+)\)/)?.[1] ?? l10n(law, 'name', locale);

function lawMeta(law, locale) {
	return {
		name: l10n(law, 'name', locale),
		title: l10n(law, 'title', locale),
		type: law.type,
		description: l10n(law, 'description', locale),
		designation: law.designation,
		jurisdiction: law.jurisdiction,
		issuer: law.issuer,
		status: law.status ?? 'in-force',
		reviewStatus: 'auto',
		legalStatus: 'binding',
		lastReviewed: TODAY,
		sourceChecked: TODAY,
		licenseClass: 'official-text',
		translation: (law.locales ?? ['sv']).includes('en') ? 'sv-en' : 'sv',
		...(law.published ? { published: law.published } : {}),
		...(law['applies-from'] ? { 'applies-from': law['applies-from'] } : {}),
		...(law.implements ? { implementerar: law.implements } : {}),
		...(law.related ? { related: law.related } : {}),
		...(law.sites ? { sites: law.sites } : {})
	};
}

function chapterMeta(law, c, locale, url) {
	const label = locale === 'en' ? c.labelEn : c.labelSv;
	const title =
		c.title && c.title !== label ? `${label} – ${c.title.replace(/^\d+\s*kap\.\s*/i, '')}` : label;
	return {
		source: law.slug,
		ref: label,
		title,
		kind: 'chapter',
		description: `${l10n(law, 'name', locale)}, ${label}.`,
		designation: `${shortName(law, locale)} ${label}`,
		jurisdiction: law.jurisdiction,
		issuer: law.issuer,
		status: law.status ?? 'in-force',
		reviewStatus: 'auto',
		legalStatus: 'binding',
		sourceChecked: TODAY,
		licenseClass: 'official-text',
		translation: (law.locales ?? ['sv']).includes('en') ? 'sv-en' : 'sv',
		url: c.anchor ? `${url}#${c.anchor}` : url,
		...(law.sites ? { sites: law.sites } : {})
	};
}

const slugifyText = (s) =>
	s
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');

const provHeading = (p, locale) => {
	const pl = locale === 'en' ? (p.labelEn ?? p.label) : p.label;
	return p.title ? `${pl} – ${p.title}` : pl;
};

const EU_SLUGS = new Map();

const ART_INDEX = new Map();

const NAME_INDEX = [];
const SLUG_CELEX = new Map();
const foldName = (s) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '');
const NAMED_CELEX = {
	euffordraget: '12012E',
	eufordraget: '12012M',
	stadgan: '12012P'
};
const SFS_NAMES = {
	brottsbalken: '1962:700',
	miljobalken: '1998:808',
	rattegangsbalken: '1942:740',
	utsokningsbalken: '1981:774',
	socialforsakringsbalken: '2010:110',
	foraldrabalken: '1949:381',
	jordabalken: '1970:994',
	offentlighetsochsekretesslagen: '2009:400',
	regeringsformen: '1974:152',
	tryckfrihetsforordningen: '1949:105',
	yttrandefrihetsgrundlagen: '1991:1469',
	kommunallagen: '2017:725',
	skadestandslagen: '1972:207',
	forvaltningslagen: '2017:900',
	skollagen: '2010:800',
	mottagandelagen: '2026:999',
	lagenomoffentligupphandling: '2016:1145',
	lagenomupphandlinginomforsorjningssektorerna: '2016:1146',
	lagenomupphandlingavkoncessioner: '2016:1147',
	lagenomupphandlingpaforsvarsochsakerhetsomradet: '2011:1029',
	lagenomvalfrihetssystem: '2008:962'
};
const GENERIC = new Set(
	[
		'lag',
		'lagen',
		'lagarna',
		'förordning',
		'förordningen',
		'förordningarna',
		'direktiv',
		'direktivet',
		'direktiven',
		'balk',
		'balken',
		'fördraget',
		'akt',
		'akten',
		'konventionen',
		'stadgan',
		'grundlagen',
		'bilagan',
		'paragrafen',
		'regulation',
		'directive',
		'treaty',
		'act',
		'convention',
		'annex'
	].map((s) => foldName(s))
);
const SLUG_SFS = new Map();
function namedAct(qualifier) {
	const q = foldName(qualifier.replace(/^eu[':]?s\b/i, ''));
	if (!q || GENERIC.has(q) || q.length < 5) return null;
	let best = null;
	for (const { key, slug } of NAME_INDEX)
		if ((key.includes(q) || q.includes(key)) && (!best || key.length > best.key.length))
			best = { key, slug };
	if (best) return { slug: best.slug };
	const c = NAMED_CELEX[q];
	return c ? { celex: c } : null;
}
function artIndex(slug) {
	if (ART_INDEX.has(slug)) return ART_INDEX.get(slug);
	const dir = resolve(ROOT, OUT_DIR, slug);
	let map = null;
	if (existsSync(dir)) {
		map = new Map();
		for (const f of readdirSync(dir)) {
			if (!f.endsWith('.svx') || f.slice(0, -4).includes('.')) continue;
			const src = readFileSync(resolve(dir, f), 'utf-8');
			for (const hm of src.matchAll(/^#{3,4}\s+(?:artikel|article)\s+(\d+\s*[a-z]?)\b[^\n]*/gim)) {
				const num = hm[1].replace(/\s+/g, '').toLowerCase();
				if (!map.has(num))
					map.set(num, {
						slug: f.slice(0, -4),
						frag: slugifyText(hm[0].replace(/^#+\s+/, ''))
					});
			}
		}
	}
	ART_INDEX.set(slug, map);
	return map;
}

const PROV_INDEX = new Map();
function provIndex(slug) {
	if (PROV_INDEX.has(slug)) return PROV_INDEX.get(slug);
	const dir = resolve(ROOT, OUT_DIR, slug);
	const map = new Map();
	if (existsSync(dir)) {
		for (const f of readdirSync(dir)) {
			if (!f.endsWith('.svx') || f.slice(0, -4).includes('.')) continue;
			const kap = f.match(/^kap-(\d+)\.svx$/)?.[1] ?? null;
			const src = readFileSync(resolve(dir, f), 'utf-8');
			for (const hm of src.matchAll(/^#{3,4}\s+(\d+\s*[a-z]?)\s*§/gim)) {
				const num = hm[1].replace(/\s+/g, '').toLowerCase();
				const frag = slugifyText(hm[0].replace(/^#+\s+/, ''));
				for (const key of kap ? [`${kap}:${num}`, `:${num}`] : [`:${num}`])
					if (!map.has(key)) map.set(key, { slug: f.slice(0, -4), frag });
			}
		}
	}
	PROV_INDEX.set(slug, map);
	return map;
}

function linkifyRefs(body, law, chapters, selfSlug, selfFrag, locale) {
	const byChapter = new Map();
	const first = new Map();
	for (const c of chapters) {
		for (const p of c.provisions) {
			const pl = locale === 'en' ? (p.labelEn ?? p.label) : p.label;
			const num = pl
				.match(/\d+(?:\s?[a-z](?![a-z]))?/i)?.[0]
				?.replace(/\s+/g, '')
				.toLowerCase();
			if (!num) continue;
			const frag = slugifyText(provHeading(p, locale));
			if (!byChapter.has(c.slug)) byChapter.set(c.slug, new Map());
			byChapter.get(c.slug).set(num, frag);
			if (!first.has(num)) first.set(num, { slug: c.slug, frag });
		}
	}
	const link = (text, slug, frag) =>
		`[${text}](${slug === selfSlug ? `#${frag}` : `/lagstiftning/${law.slug}/${slug}#${frag}`})`;
	const sfs = (y, n) => `https://rkrattsbaser.gov.se/sfst?bet=${y}%3A${n}`;
	const norm = (num) => num.replace(/\s+/g, '').toLowerCase();
	const find = (key) => {
		const frag = byChapter.get(selfSlug)?.get(key);
		return frag ? { slug: selfSlug, frag } : first.get(key);
	};

	const hasArticles = chapters.some((c) =>
		c.provisions.some((p) => /^(?:artikel|article)\b/i.test(p.label))
	);
	const S = String.raw`[^\S\n]`;
	const LAW = String.raw`[\p{L}]*(?:lag(?:en|ar|arna)?|förordning(?:en|ar|arna)?)`;
	const LAWNUM = LAW + S + String.raw`*\(\d{4}:\d+\)`;
	const LAWNAME =
		LAW +
		S +
		String.raw`+(?:om|angående)` +
		S +
		String.raw`+[\p{L}-]+(?:` +
		S +
		String.raw`+[\p{L}-]+){0,5}`;
	const LAWREF =
		S +
		String.raw`+(?:i` +
		S +
		String.raw`+)?(?:` +
		LAWNUM +
		String.raw`|` +
		LAWNAME +
		String.raw`)`;
	const LETTER =
		String.raw`(?:` +
		S +
		String.raw`?[a-z](?=` +
		S +
		String.raw`*§{1,2}|` +
		S +
		String.raw`*(?:och|eller)` +
		S +
		String.raw`*\d|[-–—.,:;)]|` +
		S +
		String.raw`+(?:i|av|enligt|under|in|of)\b|$))`;
	const SUBLETTER = String.raw`(?:` + S + String.raw`?(?![iI]\b)[a-z](?!\p{L}))`;
	const NUM = String.raw`\d+` + LETTER + String.raw`?`;
	const ENUM =
		NUM +
		String.raw`(?:` +
		S +
		String.raw`*(?:,|–|—|-|och|eller|\+)` +
		S +
		String.raw`*` +
		NUM +
		String.raw`)*`;
	const SELF =
		String.raw`(?:detta|denna|det här|den här)` +
		S +
		String.raw`+(?:kapitel|kapitlet|avsnitt|avsnittet|lag(?:en)?|paragraf(?:en)?|förordning(?:en)?|direktiv(?:et|en)?|artikel(?:n)?)s?|` +
		String.raw`this` +
		S +
		String.raw`+(?:chapter|section|article|directive|regulation|act)|` +
		String.raw`the` +
		S +
		String.raw`+present` +
		S +
		String.raw`+(?:directive|regulation|article)`;
	const EUKIND = String.raw`[\p{L}-]*(?:förordning(?:en|ar|arna|s)?|direktiv(?:et|en|s)?|beslut(?:et|en|s)?|rekommendation(?:en|er|erna)?|regulations?|directives?|decisions?|recommendations?)`;
	const EUP =
		String.raw`\((?:EU|EG|EC|EUG)\)` + S + String.raw`*(?:nr|no)?` + S + String.raw`*\d+\/\d+`;
	const EUREF =
		String.raw`\b((?:Europaparlamentets` +
		S +
		String.raw`+och` +
		S +
		String.raw`+rådets|kommissionens|rådets)` +
		S +
		String.raw`+)?(` +
		EUKIND +
		String.raw`)` +
		S +
		String.raw`*(` +
		EUP +
		String.raw`(?:` +
		S +
		String.raw`*(?:\(\d+\)` +
		S +
		String.raw`*)?(?:,|och|eller|and|or)` +
		S +
		String.raw`*` +
		EUP +
		String.raw`)*)`;
	const EUPAIR = String.raw`\d+\/\d+\/(?:EU|EG|EC|EUG)`;
	const EUREF2 =
		String.raw`\b(` +
		EUKIND +
		String.raw`)\s*(?:nr|no)?` +
		S +
		String.raw`*(` +
		EUPAIR +
		String.raw`(?:` +
		S +
		String.raw`*(?:\(\d+\)` +
		S +
		String.raw`*)?(?:,|och|eller|and|or)` +
		S +
		String.raw`*` +
		EUPAIR +
		String.raw`)*)`;
	const EXTQ = new RegExp(
		String.raw`^[^\S\n]+(?:i|av|enligt|under|in|of|to)` +
			S +
			String.raw`+(?:[\p{L}-]+` +
			S +
			String.raw`+){0,4}?(` +
			EUKIND +
			String.raw`)` +
			S +
			String.raw`*(?:\((?:EU|EG|EC|EUG)\)` +
			S +
			String.raw`*(?:nr|no)?` +
			S +
			String.raw`*)?(\d+)\/(\d+)(?:\/(?:EU|EG|EC|EUG))?`,
		'iu'
	);
	const NAMED = new RegExp(
		String.raw`^[^\S\n]+(?:i|av|enligt|under|in|of|to)` +
			S +
			String.raw`+([\p{L}\p{N}:'-]+(?:` +
			S +
			String.raw`+[\p{L}\p{N}:'-]+){0,6}?(?:(?:lag|förordning|fördrag|direktiv|balk|konvention|akt|regulation|directive|treaty|act)[a-z]*|[A-ZÅÄÖ][A-ZÅÄÖ0-9]{1,7}))\b`,
		'iu'
	);

	const linkEnum = (m, enumText, kapSlug) => {
		const enumAt = kapSlug ? m.indexOf(enumText, m.search(/kap/i)) : 0;
		const prefix = m.slice(0, enumAt);
		const suffix = m.slice(enumAt + enumText.length);
		const nums = [...enumText.matchAll(new RegExp(NUM.source ?? NUM, 'g'))];
		let out = '';
		let last = 0;
		nums.forEach((nm, i) => {
			out += enumText.slice(last, nm.index);
			const key = norm(nm[0]);
			const t = kapSlug ? { slug: kapSlug, frag: byChapter.get(kapSlug)?.get(key) } : find(key);
			const frag = t?.frag;
			const slug = t?.slug;
			const text = (i === 0 ? prefix : '') + nm[0] + (i === nums.length - 1 ? suffix : '');
			out += frag && slug ? link(text, slug, frag) : text;
			last = nm.index + nm[0].length;
		});
		return out;
	};

	const roman = (s) => {
		const v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
		return [...s].reduce((n, c, i, a) => n + (v[c] < (v[a[i + 1]] ?? 0) ? -v[c] : v[c]), 0);
	};

	const linkChapEnum = (m, enumText) => {
		const suffix = m.slice(m.indexOf(enumText) + enumText.length);
		const nums = [...enumText.matchAll(/\d+/g)];
		let out = '';
		let last = 0;
		nums.forEach((nm, i) => {
			out += enumText.slice(last, nm.index);
			const slug = `kap-${parseInt(nm[0], 10)}`;
			const text = nm[0] + (i === nums.length - 1 ? suffix : '');
			out += byChapter.has(slug) ? `[${text}](/lagstiftning/${law.slug}/${slug})` : text;
			last = nm.index + nm[0].length;
		});
		return out;
	};

	const DOCMARK =
		/(?:lag(?:en|ar|arna)?|balk(?:en|arna)?|förordning(?:en|ar|arna)?|fördrag(?:et|en)?|direktiv(?:et|en)?|rekommendation(?:en|er|erna)?|konvention(?:en|er|erna)?|bilaga(?:n|or|orna)?|regeringsform(?:en)?|grundlag(?:en|ar|arna)?|akt(?:en|er|erna)?|acts?|regulations?|directives?|conventions?|annex(?:es)?|charter)\b/i;
	const SAMEDOC = /(?:detta|denna|det här|den här|samma|det|den|this|present)\b/i;
	const otherDoc = (after) => {
		const prep = after.match(
			/^[^\S\n]*(?:i|av|enligt|under|till|jämfört)[^\S\n]+(?:[\p{L}-]+[^\S\n]+){0,4}[\p{L}-]+/u
		)?.[0];
		const direct =
			prep ??
			after.match(
				/^[^\S\n]*(?:[\p{L}-]+[^\S\n]+(?:stycket|mom\.?|moment(?:et)?|punkt|punkten|ledet)[^\S\n]+)?[\p{L}-]+(?:[^\S\n]+(?:och|eller|av|samt)[^\S\n]+[\p{L}-]+)*/u
			)?.[0] ??
			'';
		const rest = after.slice(direct.length);
		if (
			/^(?:Lag|Förordning|Balk|Direktiv)\s*$/.test(direct.trim()) &&
			/^[^\S\n]*\(\d{4}:\d+\)/.test(rest)
		)
			return false;
		return DOCMARK.test(direct) && !SAMEDOC.test(direct);
	};

	const KINDTAIL = String.raw`(?:lagen?|lagarna|förordning(?:en|ar|arna)?|direktiv(?:et|en)?|balk(?:en|arna)?|akt(?:en|er|erna)?|stadga(?:n)?|konvention(?:en|er|erna)?|regeringsform(?:en)?|grundlag(?:en|arna)?|direktiv(?:en)?)\b`;
	const QAFTER = new RegExp(
		String.raw`^[^\S\n]*(?:i[^\S\n]+)?(` +
			String.raw`[\p{L}\p{N}:'-]*` +
			KINDTAIL +
			String.raw`(?:[^\S\n]+(?:om|angående)[^\S\n]+[\p{L}\p{N}:'-]+(?:[^\S\n]+[\p{L}\p{N}:'-]+){0,4})?` +
			String.raw`|[\p{L}\p{N}:'-]+(?:[^\S\n]+(?:och|eller|samt)[^\S\n]+[\p{L}\p{N}:'-]+)*[\p{L}\p{N}:'-]*` +
			KINDTAIL +
			String.raw`)`,
		'iu'
	);
	const namedStatuteUrl = (qname, kapNum, parNum) => {
		const na = namedAct(qname);
		const slug = na?.slug ?? null;
		if (slug && existsSync(resolve(ROOT, OUT_DIR, `${slug}.svx`))) {
			const num = parNum?.replace(/\s+/g, '').toLowerCase();
			if (num) {
				const hit =
					(kapNum && provIndex(slug)?.get(`${parseInt(kapNum, 10)}:${num}`)) ??
					provIndex(slug)?.get(`:${num}`);
				if (hit) return `/lagstiftning/${slug}/${hit.slug}#${hit.frag}`;
			}
			if (kapNum && existsSync(resolve(ROOT, OUT_DIR, slug, `kap-${parseInt(kapNum, 10)}.svx`)))
				return `/lagstiftning/${slug}/kap-${parseInt(kapNum, 10)}`;
			return `/lagstiftning/${slug}`;
		}
		const celex = na?.celex ?? (slug ? SLUG_CELEX.get(slug) : null);
		if (celex)
			return `https://eur-lex.europa.eu/legal-content/${locale === 'en' ? 'EN' : 'SV'}/TXT/?uri=CELEX:${celex}`;
		const sfsNum = (slug && SLUG_SFS.get(slug)) ?? SFS_NAMES[foldName(qname)];
		if (sfsNum) {
			const [y, n] = sfsNum.split(':');
			return sfs(y, n);
		}
		return null;
	};

	const selfLink = (t) =>
		`[${t}](${
			/kapitel|avsnitt|chapter|section/i.test(t)
				? `/lagstiftning/${law.slug}/${selfSlug}`
				: /artikel|article/i.test(t)
					? `#${selfFrag}`
					: `/lagstiftning/${law.slug}`
		})`;

	const eurlex = (celex) =>
		EU_SLUGS.has(celex) && existsSync(resolve(ROOT, OUT_DIR, `${EU_SLUGS.get(celex)}.svx`))
			? `/lagstiftning/${EU_SLUGS.get(celex)}`
			: `https://eur-lex.europa.eu/legal-content/${locale === 'en' ? 'EN' : 'SV'}/TXT/?uri=CELEX:${celex}`;
	let lastEu = null;
	let lastExt = null;
	const DENLAW =
		/^[^\S\n]*(?:(?:(?:första|andra|tredje|fjärde|femte|sjätte|sjunde|åttonde|nionde|tionde|elfte|tolfte|sista)[^\S\n]+)?(?:stycket|mom\.?|moment(?:et)?|punkten|ledet|punkterna|styckena)[^\S\n]+)*(?:den|det|denna|detta|samma|the|this|said)[^\S\n]+(?:lagen?|förordning\w*|balken?|direktiv\w*|akten|konventionen)\b/iu;
	const eutype = (kind) =>
		/dir|directive/i.test(kind)
			? 'L'
			: /beslut|decision/i.test(kind)
				? 'D'
				: /rekommend|recommend/i.test(kind)
					? 'H'
					: 'R';
	const euyear = (y) => (y.length === 2 ? `${+y > 50 ? '19' : '20'}${y}` : y);
	const celex = (kind, a, b) => {
		const [year, seq] = /^(?:19|20)\d\d$/.test(a) ? [a, b] : [b, a];
		return `3${euyear(year)}${eutype(kind)}${seq.padStart(4, '0')}`;
	};
	const linkEuPairs = (m, kind, pairsText, yearFirst) => {
		const pairRe = yearFirst
			? /\d+\/\d+\/(?:EU|EG|EC|EUG)/gi
			: /\((?:EU|EG|EC|EUG)\)\s*(?:nr|no)?\s*\d+\/\d+/gi;
		const at = m.indexOf(pairsText);
		const prefix = m.slice(0, at);
		const pairs = [...pairsText.matchAll(pairRe)];
		const numRe = /(\d+)\/(\d+)/;
		let out = '';
		let last = 0;
		pairs.forEach((pm, i) => {
			out += pairsText.slice(last, pm.index);
			const nm = pm[0].match(numRe);
			const cx = yearFirst
				? `3${euyear(nm[1])}${eutype(kind)}${nm[2].padStart(4, '0')}`
				: celex(kind, nm[1], nm[2]);
			lastEu = cx;
			out += `[${(i === 0 ? prefix : '') + pm[0]}](${eurlex(cx)})`;
			last = pm.index + pm[0].length;
		});
		return out + pairsText.slice(last);
	};

	const re = new RegExp(
		String.raw`\b(` +
			SELF +
			String.raw`)\b|` +
			EUREF +
			String.raw`|` +
			EUREF2 +
			String.raw`|` +
			LAW +
			S +
			String.raw`*\((\d{4}):(\d+)\)((?:` +
			S +
			String.raw`+\d+` +
			S +
			String.raw`*kap\.?)|(?:` +
			S +
			String.raw`+` +
			ENUM +
			S +
			String.raw`*§{1,2}))*` +
			String.raw`|\b(\d+)` +
			S +
			String.raw`*kap\.?` +
			S +
			String.raw`*(` +
			ENUM +
			String.raw`)` +
			S +
			String.raw`*§{1,2}(` +
			LAWREF +
			String.raw`)?` +
			String.raw`|\b(` +
			ENUM +
			String.raw`)` +
			S +
			String.raw`*§{1,2}` +
			S +
			String.raw`+i` +
			S +
			String.raw`+(\d+)` +
			S +
			String.raw`*kap\.?(` +
			LAWREF +
			String.raw`)?` +
			String.raw`|\b(` +
			ENUM +
			String.raw`)` +
			S +
			String.raw`*§{1,2}(` +
			LAWREF +
			String.raw`)?` +
			String.raw`|\b(` +
			ENUM +
			String.raw`)` +
			S +
			String.raw`*kap\.?(?!` +
			S +
			String.raw`*§)` +
			String.raw`|\b(?:kapitel|chapter)` +
			S +
			String.raw`+([IVXLCDM]+)\b` +
			String.raw`|\b(?:artiklarna|artiklar|artikel|articles|article)` +
			S +
			String.raw`+(` +
			NUM +
			String.raw`)(?:\.\d+` +
			SUBLETTER +
			String.raw`?)*(?:` +
			S +
			String.raw`*(?:[-–—,]|och|eller|and|or)` +
			S +
			String.raw`*\d+[a-z]?(?:\.\d+` +
			SUBLETTER +
			String.raw`?)*)*\b`,
		'giu'
	);
	return body.replace(
		re,
		(
			m,
			self,
			_inst,
			euk,
			eup1,
			euk2,
			eup2,
			ly,
			ln,
			_x,
			kapE,
			enumE,
			lrE,
			enum2,
			kapI,
			lrI,
			enumP,
			lrP,
			chaps,
			romch,
			...rest
		) => {
			const str = rest.at(-1);
			const offset = rest.at(-2);
			const art = rest[0];
			if (self) return selfLink(self);
			if (euk) return linkEuPairs(m, euk, eup1, false);
			if (euk2) return linkEuPairs(m, euk2, eup2, true);
			if (ln) {
				lastExt = sfs(ly, ln);
				return `[${m}](${lastExt})`;
			}
			const sfsM = (lrE ?? lrI ?? lrP)?.match(/\((\d{4}):(\d+)\)/);
			if (sfsM) {
				lastExt = sfs(sfsM[1], sfsM[2]);
				return `[${m.trim()}](${lastExt})`;
			}
			const numsInM = [...m.matchAll(/\d+/g)].map((x) => x[0]);
			const kapNumM = /\d+\s*kap/i.test(m) ? numsInM[0] : null;
			const parNumM = kapNumM ? numsInM[1] : numsInM[0];
			const lr = lrE ?? lrI ?? lrP;
			if (lr) {
				const qn = lr.replace(/^[^\S\n]*(?:i[^\S\n]+)?/, '').trim();
				const u = namedStatuteUrl(qn, kapNumM, parNumM);
				if (u) lastExt = u;
				return u ? `[${m}](${u})` : m;
			}
			const after = str.slice(offset + m.length, offset + m.length + 80);
			if (art) {
				const q = after.match(EXTQ);
				const cx = q ? celex(q[1], q[2], q[3]) : null;
				const nq = cx ? null : after.match(NAMED);
				const nact = nq ? namedAct(nq[1]) : null;
				const nslug = nact?.slug ?? null;
				const ncx = nact?.celex ?? null;
				const selfQ =
					/^[^\S\n]+(?:i|av|enligt|under|in|of|to)[^\S\n]+(?:detta|denna|this|the[^\S\n]+present)[^\S\n]+[\p{L}-]*(?:kapitel|avsnitt|lag|paragraf|förordning|direktiv|balk|fördrag|akt|artikel|punkt|chapter|section|regulation|directive|article|act|treaty)\w*/iu.test(
						after
					);
				const defQ =
					/^[^\S\n]+(?:i|av|enligt|under|in|of|to)[^\S\n]+(?:(?:den|det|the)[^\S\n]+)?[\p{L}-]*(?:lagen|förordningen|förordningarna|direktivet|direktiven|balken|fördraget|akten)\b/iu.test(
						after
					);
				if (!cx && !nslug && !ncx && !selfQ && !defQ && otherDoc(after)) return m;
				if (cx) lastEu = cx;
				else if (ncx) lastEu = ncx;
				else if (nslug) lastEu = SLUG_CELEX.get(nslug) ?? lastEu;
				const artUrl = (c, s, nn) => {
					const slug = s ?? EU_SLUGS.get(c);
					const local = slug && existsSync(resolve(ROOT, OUT_DIR, `${slug}.svx`));
					const hit = local && nn ? artIndex(slug)?.get(nn) : null;
					if (hit) return `/lagstiftning/${slug}/${hit.slug}#${hit.frag}`;
					if (local) return `/lagstiftning/${slug}`;
					const cc = c ?? (slug ? SLUG_CELEX.get(slug) : null);
					return cc ? eurlex(cc) : null;
				};
				const urlFor = (num) => {
					const base = num
						.match(/\d+\s*[a-z]?/)?.[0]
						?.replace(/\s+/g, '')
						.toLowerCase();
					if (cx || ncx) return artUrl(cx ?? ncx, null, base);
					if (nslug) return artUrl(null, nslug, base);
					if (defQ && lastEu) return artUrl(lastEu, null, base);
					const t = hasArticles && base ? find(base) : null;
					if (t)
						return t.slug === selfSlug
							? `#${t.frag}`
							: `/lagstiftning/${law.slug}/${t.slug}#${t.frag}`;
					return lastEu ? artUrl(lastEu, null, base) : null;
				};
				let out = '';
				let last = 0;
				let any = false;
				for (const nm of m.matchAll(/\d+(?:\.\d+)*(?:\s?[a-z](?![\p{L}]))?/gu)) {
					const u = urlFor(nm[0]);
					out += m.slice(last, nm.index);
					out += u ? `[${nm[0]}](${u})` : nm[0];
					any ||= Boolean(u);
					last = nm.index + nm[0].length;
				}
				out += m.slice(last);
				return any ? out : m;
			}
			const ahead = after.match(
				/^[^\S\n]*(?:,|och|eller|samt)[^\S\n]*(?:\d+[^\S\n]*kap\.?[^\S\n]*)?\d+[^\S\n]*§{0,2}[^\S\n]*(?:\p{L}+[^\S\n]+(?:stycket|mom\.?|moment(?:et)?|punkten|ledet)[^\S\n]*)*/iu
			);
			const qm = after.match(QAFTER) ?? (ahead ? after.slice(ahead[0].length).match(QAFTER) : null);
			if (qm) {
				const u = namedStatuteUrl(qm[1], kapNumM, parNumM);
				if (u) {
					lastExt = u;
					return `[${m}](${u})`;
				}
			}
			if (!art && lastExt && DENLAW.test(after)) return `[${m}](${lastExt})`;
			if (otherDoc(after)) return m;
			const unlinked = (r) => !r.includes('](');
			if (kapE) {
				const r = linkEnum(m, enumE, `kap-${parseInt(kapE, 10)}`);
				return unlinked(r) && lastExt ? `[${m}](${lastExt})` : r;
			}
			if (kapI) {
				const r = linkEnum(m, enum2, `kap-${parseInt(kapI, 10)}`);
				return unlinked(r) && lastExt ? `[${m}](${lastExt})` : r;
			}
			if (enumP) return linkEnum(m, enumP, null);
			if (chaps) {
				const r = linkChapEnum(m, chaps);
				return unlinked(r) && lastExt ? `[${m}](${lastExt})` : r;
			}
			if (romch) {
				const slug = `kap-${roman(romch)}`;
				if (byChapter.has(slug)) return `[${m}](/lagstiftning/${law.slug}/${slug})`;
				return lastExt ? `[${m}](${lastExt})` : m;
			}
			return m;
		}
	);
}

function formatLists(body) {
	const paras = body.split('\n\n');
	const out = [];
	for (let i = 0; i < paras.length; i++) {
		const t = paras[i].trim();
		const prev = out.at(-1)?.trim() ?? '';
		if (
			(/^(?:\(\d{4}:\d+\)|§)/.test(t) ||
				(/^(?:\((?:EU|EG|EC|EUG)\)\s*)?(?:(?:nr|no)\s*)?\d+\/\d+/i.test(t) &&
					/(?:\((?:EU|EG|EC|EUG)\)|nr|no|[\p{L}-]*(?:förordning|direktiv|beslut|rekommendation)|regulations?|directives?|decisions?|recommendations?)\.?$/iu.test(
						prev
					)) ||
				(/^\d/.test(t) &&
					/(?:^|\s)(?:artiklarna|artiklar|artikel|articles|article|paragraf(?:en)?|kapitel|kap\.?|§)\s*$/iu.test(
						prev
					))) &&
			out.length
		) {
			out[out.length - 1] += ` ${t}`;
		} else if (/^(\d+[.)]|\(\d+\)|[a-zåäö]+\)|\([a-z]+\)|[—–-])$/.test(t) && i + 1 < paras.length) {
			out.push(`${t} ${paras[++i].trim()}`);
		} else out.push(paras[i]);
	}
	return out.map((p) => p.replace(/^(\d+)([.)])\s/, '$1\\$2 ')).join('\n\n');
}

function formatEndmatter(body, locale) {
	body = body.replace(
		/(^|\n\n)(Utfärdad i |Done at )/,
		`$1#### ${locale === 'en' ? 'Signature' : 'Underskrift'}\n\n$2`
	);
	const paras = body.split('\n\n');
	const start = paras.findIndex((p) => /^\(\d*\)/.test(p.trim()));
	if (start < 0) return body;
	return `${paras.slice(0, start).join('\n\n')}\n\n#### ${locale === 'en' ? 'Footnotes' : 'Fotnoter'}\n\n${paras
		.slice(start)
		.join('\n\n')}`;
}

function markStatusLines(body) {
	return body
		.split('\n\n')
		.map((p) => {
			let t = p.trim();
			if (!/upphävts|upphör att gälla|träder i kraft|ikraftträd/i.test(t)) return p;
			t = t
				.replace(/^\/+|\/+$/g, '')
				.replace(/\b[UI]:(\d{4}-\d{2}-\d{2})/g, '$1')
				.trim();
			return `> _${t}_`;
		})
		.join('\n\n');
}

function chapterBlock(law, c, chapters, locale) {
	const parts = [];
	let lastSection = null;
	for (const p of c.provisions) {
		if (p.section && p.section !== lastSection) {
			parts.push(`#### ${p.section}`);
			lastSection = p.section;
		}
		const heading = provHeading(p, locale);
		const body = formatEndmatter(
			linkifyRefs(
				formatLists(p.body),
				law,
				chapters,
				c.slug,
				slugifyText(provHeading(p, locale)),
				locale
			),
			locale
		);
		parts.push(`### ${heading}\n\n${locale === 'sv' ? markStatusLines(body) : body}`);
	}
	return `${MARK_START}\n## ${lawHeading(locale)}\n\n${parts.join('\n\n')}\n${MARK_END}`;
}

async function main() {
	const laws = parseYaml(readFileSync(resolve(ROOT, MANIFEST), 'utf-8')).laws ?? [];
	const acronyms =
		parseYaml(readFileSync(resolve(ROOT, 'data/registry/acronyms.yaml'), 'utf-8')).acronyms ?? {};
	const knownSlugs = new Set(laws.map((l) => l.slug));
	for (const [acr, e] of Object.entries(acronyms)) {
		if (e?.law && knownSlugs.has(e.law)) {
			const key = foldName(acr);
			if (key.length >= 3) NAME_INDEX.push({ key, slug: e.law });
		}
	}
	for (const l of laws) {
		if (l.celex) {
			EU_SLUGS.set(l.celex, l.slug);
			SLUG_CELEX.set(l.slug, l.celex);
		}
		if (l.sfs) SLUG_SFS.set(l.slug, l.sfs);
		for (const n of [l.name?.sv, l.name?.en]) {
			if (!n) continue;
			const main = n.replace(/\([^)]*\)/g, '');
			const abbr = n.match(/\(([^)]+)\)/)?.[1];
			for (const k of [main, abbr, l.slug].filter(Boolean)) {
				const key = foldName(k);
				if (key.length >= 4) NAME_INDEX.push({ key, slug: l.slug });
			}
		}
	}
	const wanted = ONLY ? laws.filter((l) => l.slug === ONLY) : laws;
	if (!wanted.length) throw new Error(ONLY ? `no such law: ${ONLY}` : 'manifest is empty');

	for (const law of wanted) {
		console.log(`scan: ${law.slug}`);
		const scanned = await scanLaw(law);
		if (!Object.keys(scanned).length) continue;

		const dir = resolve(ROOT, OUT_DIR, law.slug);
		const keep = new Set();
		for (const [locale, { url, chapters }] of Object.entries(scanned)) {
			const suffix = locale === 'sv' ? '.svx' : `.${locale}.svx`;

			const stripUnit = (l) => l.replace(/§|\bartikel\b|\barticle\b/gi, '').trim();
			const items = chapters.map((c) => {
				const label = locale === 'en' ? c.labelEn : c.labelSv;
				const title =
					c.title && c.title !== label
						? `${label} – ${c.title.replace(/^\d+\s*kap\.\s*/i, '')}`
						: label;
				const first = c.provisions[0]?.label ?? '';
				const last = c.provisions.at(-1)?.label ?? '';
				const unit = /artikel|article/i.test(first)
					? locale === 'en'
						? 'Articles'
						: 'Artiklarna'
					: '§§';
				const range =
					first && last && first !== last
						? ` · ${unit} ${stripUnit(first)}–${stripUnit(last)}`
						: '';
				return `- [${title}](/lagstiftning/${law.slug}/${c.slug})${range}`;
			});
			const parentIntro = `## ${locale === 'en' ? 'Contents' : 'Innehåll'}\n\n${items.join('\n')}`;
			const parentBlock = `${MARK_START}\n${parentIntro}\n${MARK_END}`;
			const r = upsertSvx(
				resolve(ROOT, OUT_DIR, `${law.slug}${suffix}`),
				{ ...lawMeta(law, locale), url },
				parentBlock,
				parentBlock + '\n',
				{ keepBodyIfNoMarkers: true }
			);
			console.log(`  ${law.slug}${suffix}: ${r}`);

			for (const c of chapters) {
				const meta = chapterMeta(law, c, locale, url);
				const block = chapterBlock(law, c, chapters, locale);
				const interp = `\n\n## ${interpHeading(locale)}\n\n${interpStub(locale)}\n`;
				const file = `${c.slug}${suffix}`;
				keep.add(file);
				upsertSvx(resolve(dir, file), meta, block, block + interp);
			}
			console.log(`  ${law.slug}/ ×${chapters.length} (${locale})`);
		}

		if (existsSync(dir) && !DRY) {
			for (const f of readdirSync(dir)) {
				if (!f.endsWith('.svx') || keep.has(f)) continue;
				const p = resolve(dir, f);
				if (readFileSync(p, 'utf-8').includes(MARK_START)) {
					unlinkSync(p);
					console.log(`  ${f}: removed stale`);
				}
			}
		}
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
