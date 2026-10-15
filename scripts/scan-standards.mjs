#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((arg) => arg !== '--');
const only = args.includes('--standard') ? args[args.indexOf('--standard') + 1] : null;
const offline = args.includes('--offline');
const dry = args.includes('--dry');
const today = new Date().toISOString().slice(0, 10);
const allowedHosts = new Set([
	'webstore.iec.ch',
	'www.isa.org',
	'www.sis.se',
	'www.stoldskyddsforeningen.se',
	'raw.githubusercontent.com',
	'csrc.nist.gov',
	'www.nist.gov',
	'github.com',
	'api.github.com',
	'objects.githubusercontent.com',
	'release-assets.githubusercontent.com',
	'www.pcisecuritystandards.org',
	'www.cisecurity.org',
	'www.etsi.org',
	'owaspsamm.org',
	'owasp.org',
	'attack.mitre.org'
]);
const allowedRedirects = new Set([
	'objects.githubusercontent.com',
	'release-assets.githubusercontent.com',
	'github.com',
	'raw.githubusercontent.com',
	'api.github.com'
]);
const openSources = {
	'nist-oscal': {
		kind: 'json',
		prefix: 'https://raw.githubusercontent.com/usnistgov/oscal-content/',
		license: 'CC0-1.0',
		attribution: (meta) =>
			'National Institute of Standards and Technology, OSCAL release ' +
			meta.version +
			'. Republished courtesy of the National Institute of Standards and Technology. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).'
	},
	'owasp-asvs': {
		kind: 'json',
		prefix: 'https://raw.githubusercontent.com/OWASP/ASVS/',
		license: 'CC-BY-SA-4.0',
		attribution: (meta) =>
			'© OWASP Foundation, Application Security Verification Standard ' +
			meta.version +
			'. The layout has been adapted; the English requirements have not been translated. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).'
	},
	'owasp-masvs': {
		kind: 'yaml',
		prefix: 'https://github.com/OWASP/masvs/releases/download/',
		license: 'CC-BY-SA-4.0',
		attribution: (meta) =>
			'© OWASP Foundation, Mobile Application Security Verification Standard ' +
			meta.version +
			'. The layout has been adapted; the English requirements have not been translated. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).'
	},
	'owasp-samm': {
		kind: 'samm',
		prefix: 'https://github.com/owaspsamm/core/releases/download/',
		license: 'CC-BY-SA-4.0',
		attribution: (meta) =>
			'© OWASP Foundation, Software Assurance Maturity Model ' +
			meta.version +
			'. The layout has been adapted; the English model text has not been translated. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).'
	},
	'owasp-api-top10': {
		kind: 'api-top10',
		prefix: 'https://api.github.com/repos/OWASP/API-Security/contents/',
		license: 'CC-BY-SA-4.0',
		attribution: (meta) =>
			'© OWASP Foundation, API Security Top 10 ' +
			meta.version +
			'. The layout has been adapted; the English text has not been translated. [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).'
	},
	'mitre-attack': {
		kind: 'mitre',
		prefix: 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/',
		license: 'MITRE-TOU',
		attribution: (meta) =>
			'© The MITRE Corporation, MITRE ATT&CK® ' +
			meta.version +
			'. This content is reproduced under the MITRE ATT&CK Terms of Use with attribution. [attack.mitre.org](https://attack.mitre.org/).'
	}
};

if (
	args.some(
		(arg, index) =>
			!['--standard', '--offline', '--dry'].includes(arg) &&
			!(args[index - 1] === '--standard' && /^[a-z0-9-]+$/.test(arg))
	) ||
	(args.includes('--standard') && !only)
) {
	throw new Error('Usage: node scripts/scan-standards.mjs [--standard slug] [--offline] [--dry]');
}

const decode = (value) =>
	value
		.replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(+code))
		.replace(
			/&(amp|quot|apos|nbsp|lt|gt|auml|ouml|aring|Auml|Ouml|Aring);/g,
			(_, entity) =>
				({
					amp: '&',
					quot: '"',
					apos: "'",
					nbsp: ' ',
					lt: '<',
					gt: '>',
					auml: 'ä',
					ouml: 'ö',
					aring: 'å',
					Auml: 'Ä',
					Ouml: 'Ö',
					Aring: 'Å'
				})[entity]
		);
const normalize = (value) =>
	decode(value)
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '');

function catalogMetadata(html, standard) {
	const content = decode(html);
	const reference = standard.match ?? standard.designation;
	if (!normalize(content).includes(normalize(reference)))
		throw new Error(`Source does not mention ${reference}`);
	if (
		standard.edition &&
		!new RegExp(`(?:utg\\.?|utgåva)\\s*${standard.edition}\\b`, 'i').test(content)
	)
		throw new Error(`Source does not mention edition ${standard.edition}`);
	const title = content.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1];
	const date =
		standard.publisher === 'IEC'
			? content.match(/Publication date<\/strong><\/td><td>\s*(\d{4}-\d{2}-\d{2})/i)?.[1]
			: standard.publisher === 'SSF'
				? content.match(/Daterad:\s*(\d{4}-\d{2}-\d{2})/i)?.[1]
				: undefined;
	const sourceStatus =
		standard.publisher === 'SIS'
			? content.match(/<strong>Status:<\/strong>\s*([^<]+)/i)?.[1].trim()
			: undefined;
	return {
		catalogTitle: title?.trim(),
		published: date,
		status: /^(Gällande|Valid)$/i.test(sourceStatus ?? '')
			? 'in-force'
			: /^(Upphävd|Withdrawn)$/i.test(sourceStatus ?? '')
				? 'inactive'
				: undefined,
		checked: today
	};
}

const safeText = (value) =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/{/g, '｛')
		.replace(/}/g, '｝');

const slugify = (value) =>
	String(value ?? '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
async function fetchChecked(url, { binary = false } = {}) {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(60000),
		headers: { 'user-agent': 'regelverk.org standards scanner' }
	});
	const host = new URL(response.url).hostname;
	if (!response.ok || !allowedRedirects.has(host))
		throw new Error(`HTTP ${response.status} at ${response.url}`);
	return binary ? Buffer.from(await response.arrayBuffer()) : response.text();
}

function parseSammTarball(buf, url) {
	const dir = mkdtempSync(resolve(tmpdir(), 'samm-'));
	try {
		const tar = resolve(dir, 'samm.tar.gz');
		writeFileSync(tar, buf);
		execFileSync('tar', ['-xzf', tar, '-C', dir]);
		const model = resolve(dir, 'model');
		if (!existsSync(model)) throw new Error('samm.tar.gz has no model/ directory');
		const loadDir = (name) =>
			readdirSync(resolve(model, name))
				.filter((f) => f.endsWith('.yml'))
				.map((f) => parseYaml(readFileSync(resolve(model, name, f), 'utf8')));
		const functions = loadDir('business_functions');
		const practices = loadDir('security_practices');
		const streams = loadDir('streams');
		const activities = loadDir('activities');
		const practiceLevels = loadDir('practice_levels');
		const maturityLevels = loadDir('maturity_levels');
		if (functions.length !== 5 || practices.length < 10 || !activities.length)
			throw new Error('Unexpected SAMM model size');
		const levelNum = new Map(maturityLevels.map((l) => [l.id, l.number]));
		const pLevelNum = new Map(practiceLevels.map((l) => [l.id, levelNum.get(l.maturityLevel)]));
		const byGuid = (list, key) => {
			const map = new Map();
			for (const item of list) {
				const k = item[key];
				if (!map.has(k)) map.set(k, []);
				map.get(k).push(item);
			}
			return map;
		};
		const streamsByPractice = byGuid(streams, 'practice');
		const actsByStream = byGuid(activities, 'stream');
		return {
			version: url.match(/v(\d+\.\d+\.\d+)/)?.[1] ?? '2',
			functions: functions
				.sort((a, b) => a.order - b.order)
				.map((fn) => ({
					name: fn.name,
					description: String(fn.description ?? '').trim(),
					practices: practices
						.filter((p) => p.function === fn.id)
						.sort((a, b) => a.order - b.order)
						.map((p) => ({
							name: p.name,
							shortName: p.shortName,
							description: String(p.longDescription ?? p.shortDescription ?? '').trim(),
							streams: (streamsByPractice.get(p.id) ?? [])
								.sort((a, b) => a.order - b.order)
								.map((s) => ({
									letter: s.letter,
									name: s.name,
									description: String(s.description ?? '').trim(),
									activities: (actsByStream.get(s.id) ?? [])
										.map((a) => ({
											level: pLevelNum.get(a.level) ?? 0,
											title: a.title,
											summary: String(a.shortDescription ?? '').trim()
										}))
										.sort((a, b) => a.level - b.level)
								}))
						}))
				}))
		};
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

async function fetchApiTop10(standard) {
	const listing = JSON.parse(await fetchChecked(standard.content.url));
	const files = listing
		.filter((f) => /^0xa[0-9a]-.+\.md$/.test(f.name))
		.sort((a, b) => a.name.localeCompare(b.name));
	if (files.length !== 10) throw new Error(`Expected 10 API risk files, got ${files.length}`);
	const out = [];
	for (const f of files) {
		const body = await fetchChecked(f.download_url);
		out.push({ name: f.name, body });
	}
	return { version: standard.content.url.match(/editions\/(\d{4})/)?.[1] ?? '', files: out };
}

async function fetchMitre(standard) {
	const index = JSON.parse(await fetchChecked(standard.content.url));
	const domain = standard.content.domain;
	const collection = index.collections
		?.map((c) => c.versions.filter((v) => v.url.includes(`/${domain}-`)).map((v) => v.version))
		.flat()
		.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
	if (!collection) throw new Error(`No ${domain} collection in ATT&CK index`);
	const base = standard.content.url.replace(/index\.json$/, '');
	const bundle = JSON.parse(await fetchChecked(`${base}${domain}/${domain}-${collection}.json`));
	const objects = bundle.objects ?? [];
	const matrix = objects.find((o) => o.type === 'x-mitre-matrix');
	const order = new Map((matrix?.tactic_refs ?? []).map((id, i) => [id, i]));
	const tactics = objects
		.filter((o) => o.type === 'x-mitre-tactic')
		.map((o) => ({
			ref: o.id,
			slug: o.x_mitre_shortname,
			name: o.name,
			description: String(o.description ?? '').trim()
		}))
		.sort((a, b) => (order.get(a.ref) ?? 99) - (order.get(b.ref) ?? 99));
	const techniques = objects
		.filter((o) => o.type === 'attack-pattern' && !o.revoked && !o.x_mitre_deprecated)
		.map((o) => ({
			id: o.external_references?.find((r) => r.source_name === 'mitre-attack')?.external_id,
			name: o.name,
			description: String(o.description ?? '').trim(),
			sub: Boolean(o.x_mitre_is_subtechnique),
			tactics: (o.kill_chain_phases ?? []).map((p) => p.phase_name)
		}))
		.filter((t) => t.id)
		.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
	if (tactics.length < 5 || techniques.length < 50)
		throw new Error(
			`Unexpected ${domain} bundle: ${tactics.length} tactics, ${techniques.length} techniques`
		);
	return { version: collection, tactics, techniques };
}

async function loadContent(standard) {
	const { format, url, license } = standard.content;
	const source = openSources[format];
	if (!source || license !== source.license || !url.startsWith(source.prefix))
		throw new Error(`Untrusted or unlicensed content source for ${standard.slug}`);
	switch (source.kind) {
		case 'json':
			return JSON.parse(await fetchChecked(url));
		case 'yaml':
			return parseYaml(await fetchChecked(url));
		case 'samm':
			return parseSammTarball(await fetchChecked(url, { binary: true }), url);
		case 'api-top10':
			return fetchApiTop10(standard);
		case 'mitre':
			return fetchMitre(standard);
		default:
			throw new Error(`Unsupported content kind ${source.kind}`);
	}
}
const displayId = (node) => {
	const label = node.props?.find((prop) => prop.name === 'label' && !prop.class)?.value;
	if (!label) return String(node.id ?? '').toUpperCase();
	const m = label.match(/^(.*?)\s*\(([\w.-]+)\)$/);
	if (m && m[1].trim().toLowerCase() === String(node.title ?? '').toLowerCase()) return m[2];
	return label;
};

const oscalStatements = (control) => {
	const params = new Map(control.params?.map((param) => [param.id, param]) ?? []);
	const expand = (text, depth = 0) =>
		String(text ?? '').replace(/\{\{\s*insert:\s*param,\s*([^\s}]+)\s*\}\}/g, (_, id) => {
			if (depth > 4) return '[organization-defined value]';
			const param = params.get(id);
			const choice = param?.select?.choice?.map((item) => expand(item, depth + 1)).join(' or ');
			const label =
				param?.label ?? param?.props?.find((prop) => prop.name === 'alt-label')?.value ?? 'value';
			if (choice) return `[${choice}]`;
			return `[${/^organization-defined/i.test(label) ? label : `organization-defined ${label}`}]`;
		});
	const format = (text) => safeText(expand(text));
	const render = (part, depth = 0) =>
		[
			part.prose
				? `${'  '.repeat(depth)}- ${part.id ? `<span id="${part.id}"></span> ` : ''}${part.props?.find((prop) => prop.name === 'label')?.value ?? ''} ${format(part.prose)}`.trimEnd()
				: '',
			...(part.parts ?? []).flatMap((child) => render(child, depth + 1))
		].filter(Boolean);
	const body = (control.parts ?? [])
		.filter((part) => part.name === 'statement')
		.flatMap((part) => [
			part.prose ? format(part.prose) : '',
			...(part.parts ?? []).flatMap((item) => render(item))
		])
		.filter(Boolean)
		.join('\n');
	const examples = (control.parts ?? [])
		.filter((part) => part.name === 'example')
		.flatMap((part) => render(part))
		.filter(Boolean);
	return examples.length ? `${body}\n\n_Examples:_\n\n${examples.join('\n')}` : body;
};

const oscalHeading = (node) => {
	const id = displayId(node);
	const title = String(node.title ?? '');
	return title && title.toLowerCase() !== id.toLowerCase() ? `${id} – ${safeText(title)}` : id;
};

function parseOscal(data) {
	const catalog = data.catalog;
	if (!catalog?.metadata?.version || !Array.isArray(catalog.groups) || catalog.groups.length < 2)
		throw new Error('Unexpected NIST OSCAL catalogue');
	return {
		version: catalog.metadata.version,
		groups: catalog.groups.map((family) => {
			if (!Array.isArray(family.controls)) throw new Error('Invalid NIST OSCAL family');
			const fid = displayId(family);
			const controls = family.controls.flatMap((control) => [
				`### <span id="${control.id}"></span>${oscalHeading(control)}\n\n${oscalStatements(control)}`,
				...(control.controls ?? []).map(
					(enhancement) =>
						`#### <span id="${enhancement.id}"></span>${oscalHeading(enhancement)}\n\n${oscalStatements(enhancement)}`
				)
			]);
			return {
				slug: slugify(fid),
				title: `${fid} – ${family.title}`,
				body: controls.join('\n\n'),
				count: controls.length
			};
		})
	};
}

function parseOpenContent(data, standard) {
	const format = standard.content.format;
	if (format === 'nist-oscal') return parseOscal(data);
	if (format === 'owasp-asvs') {
		if (data.Version !== '5.0.0' || data.Requirements?.length < 15)
			throw new Error('Unexpected OWASP ASVS version or chapter list');
		return {
			version: data.Version,
			groups: data.Requirements.map((chapter) => {
				if (!/^V\d+$/.test(chapter.Shortcode) || !Array.isArray(chapter.Items))
					throw new Error('Invalid OWASP ASVS chapter');
				const sections = chapter.Items.map((section) => {
					const requirements = section.Items.map((requirement) => {
						if (!/^V\d+\.\d+\.\d+$/.test(requirement.Shortcode))
							throw new Error('Invalid OWASP ASVS requirement');
						return `#### ${requirement.Shortcode} · L${safeText(requirement.L)}\n\n${safeText(requirement.Description)}`;
					});
					return `### ${section.Shortcode} – ${safeText(section.Name)}\n\n${requirements.join('\n\n')}`;
				});
				return {
					slug: chapter.Shortcode.toLowerCase(),
					title: `${chapter.Shortcode} – ${chapter.Name}`,
					body: sections.join('\n\n'),
					count: chapter.Items.reduce((n, section) => n + section.Items.length, 0)
				};
			})
		};
	}
	if (format === 'owasp-masvs') {
		if (!Array.isArray(data.groups) || data.groups.length < 5)
			throw new Error('Unexpected OWASP MASVS document');
		return {
			version: String(data.metadata?.version ?? '').replace(/^v/, ''),
			groups: data.groups.map((group) => {
				const controls = (group.controls ?? []).map(
					(control) =>
						`### ${control.id}\n\n${safeText(control.statement)}\n\n${safeText(control.description)}`
				);
				return {
					slug: slugify(String(group.id).replace(/^MASVS-/i, '')),
					title: `${group.id} – ${group.title}`,
					body: `${safeText(String(group.description ?? '').trim())}\n\n${controls.join('\n\n')}`,
					count: controls.length
				};
			})
		};
	}
	if (format === 'owasp-samm') {
		if (!Array.isArray(data.functions) || data.functions.length !== 5)
			throw new Error('Unexpected OWASP SAMM model');
		return {
			version: data.version,
			groups: data.functions.map((fn) => {
				const body = fn.practices
					.map((p) => {
						const streams = p.streams
							.map((s) => {
								const acts = s.activities
									.map(
										(a) => `- **Level ${a.level}:** ${a.title}${a.summary ? ` — ${a.summary}` : ''}`
									)
									.join('\n');
								return `#### Stream ${s.letter} – ${s.name}\n\n${s.description}\n\n${acts}`;
							})
							.join('\n\n');
						return `### ${p.name}${p.shortName ? ` (${p.shortName})` : ''}\n\n${p.description}\n\n${streams}`;
					})
					.join('\n\n');
				return {
					slug: slugify(fn.name),
					title: fn.name,
					body: `${fn.description}\n\n${body}`,
					count: fn.practices.reduce(
						(n, p) => n + p.streams.reduce((m, s) => m + s.activities.length, 0),
						0
					)
				};
			})
		};
	}
	if (format === 'owasp-api-top10') {
		if (!Array.isArray(data.files) || data.files.length !== 10)
			throw new Error('Unexpected API Security Top 10 payload');
		return {
			version: data.version,
			groups: data.files.map((file, i) => {
				const lines = file.body.split('\n');
				const title =
					lines
						.find((l) => l.startsWith('# '))
						?.slice(2)
						.trim() ?? file.name;
				const body = lines
					.filter((l) => !l.startsWith('# '))
					.join('\n')
					.replace(/^(#{1,5}) /gm, '#$1 ')
					// sibling-file references (./0xa5-….md) point at our apiN pages
					.replace(/\.\/0xa(\d+)-[\w-]+\.md/g, (_, n) => `api${+n}`)
					.trim();
				return {
					slug: `api${i + 1}`,
					title,
					body: safeText(body),
					count: 1
				};
			})
		};
	}
	if (format === 'mitre-attack') {
		if (!Array.isArray(data.tactics) || !Array.isArray(data.techniques))
			throw new Error('Unexpected ATT&CK payload');
		return {
			version: data.version,
			groups: data.tactics.map((tactic) => {
				const techs = data.techniques.filter((t) => !t.sub && t.tactics.includes(tactic.slug));
				const body = techs
					.map((t) => {
						const subs = data.techniques
							.filter((s) => s.sub && s.id.startsWith(`${t.id}.`))
							.map((s) => `#### ${s.id} – ${s.name}\n\n${safeText(s.description)}`)
							.join('\n\n');
						return `### ${t.id} – ${t.name}\n\n${safeText(t.description)}${subs ? `\n\n${subs}` : ''}`;
					})
					.join('\n\n');
				return {
					slug: tactic.slug,
					title: `${tactic.name}`,
					body: `${safeText(tactic.description)}\n\n${body}`,
					count: data.techniques.filter((t) => t.tactics.includes(tactic.slug)).length
				};
			})
		};
	}
	throw new Error(`Unsupported content format ${format}`);
}

async function scanOpen(standard) {
	const source = openSources[standard.content.format];
	if (!source) throw new Error(`Unsupported content format ${standard.content.format}`);
	const cache = resolve(root, 'data/registry/raw/standards', `${standard.slug}.json`);
	const stamp = resolve(root, 'data/registry/raw/standards', `${standard.slug}.yaml`);
	let data;
	let checked = today;
	if (offline) {
		if (!existsSync(cache) || !existsSync(stamp))
			throw new Error(`No cached content for ${standard.slug}`);
		data = JSON.parse(readFileSync(cache, 'utf8'));
		checked = parseYaml(readFileSync(stamp, 'utf8')).checked;
	} else {
		try {
			data = await loadContent(standard);
			const { version } = parseOpenContent(data, standard);
			if (existsSync(stamp)) {
				const prev = parseYaml(readFileSync(stamp, 'utf8'));
				if (prev.version && prev.version !== version)
					console.warn(`  ! ${standard.slug}: version changed ${prev.version} -> ${version}`);
			}
			if (!dry) {
				mkdirSync(dirname(cache), { recursive: true });
				writeFileSync(cache, JSON.stringify(data));
				writeFileSync(stamp, stringify({ checked: today, version }));
			}
		} catch (error) {
			if (!existsSync(cache) || !existsSync(stamp)) throw error;
			console.warn(`  ${standard.slug}: ${error.message}; using cached content`);
			data = JSON.parse(readFileSync(cache, 'utf8'));
			checked = parseYaml(readFileSync(stamp, 'utf8')).checked;
		}
	}
	const { groups, version } = parseOpenContent(data, standard);
	return { checked, status: 'active', version, groups };
}

async function scan(standard) {
	const url = new URL(standard.url);
	if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname))
		throw new Error(`Untrusted source URL for ${standard.slug}: ${standard.url}`);
	if (standard.content) return scanOpen(standard);
	const cache = resolve(root, 'data/registry/raw/standards', `${standard.slug}.yaml`);
	if (offline) {
		if (!existsSync(cache)) throw new Error(`No cached metadata for ${standard.slug}`);
		return parseYaml(readFileSync(cache, 'utf8'));
	}
	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(20000),
			headers: { 'user-agent': 'Mozilla/5.0 (regelverk.org standards metadata scanner)' }
		});
		if (!response.ok || !allowedHosts.has(new URL(response.url).hostname))
			throw new Error(`HTTP ${response.status} at ${response.url}`);
		const metadata = catalogMetadata(await response.text(), standard);
		if (existsSync(cache)) {
			const prev = parseYaml(readFileSync(cache, 'utf8'));
			for (const key of ['published', 'status'])
				if (prev[key] && metadata[key] && prev[key] !== metadata[key])
					console.warn(`  ! ${standard.slug}: ${key} changed ${prev[key]} -> ${metadata[key]}`);
		}
		if (!dry) {
			mkdirSync(dirname(cache), { recursive: true });
			writeFileSync(cache, stringify(metadata));
		}
		return metadata;
	} catch (error) {
		if (!existsSync(cache)) throw error;
		console.warn(`  ${standard.slug}: ${error.message}; using cached metadata`);
		return parseYaml(readFileSync(cache, 'utf8'));
	}
}

function generatedBody(standard, locale, description, groups = []) {
	const intro = (standard.overview?.[locale] ?? description).trim();
	const index = groups.length
		? `\n\n## ${locale === 'sv' ? 'Innehåll' : 'Contents'}\n\n${groups.map((group) => `- [${group.title}](/standarder/${standard.slug}/${group.slug}) · ${group.count} ${locale === 'sv' ? 'krav' : 'requirements'}`).join('\n')}`
		: '';
	const note = standard.content
		? `\n\n${locale === 'sv' ? 'Kontroll- och kravtexterna nedan återges på engelska från utgivarens öppna data; detta är ingen svensk översättning.' : 'The control and requirement statements below are reproduced in English from the publisher’s open data.'}`
		: '';
	const related = standard.relatedLaws?.length
		? `\n\n## ${locale === 'sv' ? 'Relaterade regelverk' : 'Related legal acts'}\n\n${standard.relatedLaws
				.map((slug) => {
					const dir = resolve(root, 'data/regelverk/lagstiftning', slug);
					const hasEn = existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.en.svx'));
					const pre = locale === 'en' && hasEn ? '/en' : '';
					return `- [${lawNames.get(slug)?.[locale] ?? slug}](${pre}/lagstiftning/${slug})`;
				})
				.join('\n')}`
		: '';
	return `${locale === 'sv' ? '## Om standarden' : '## About the standard'}\n\n${intro}${note}\n\n${locale === 'sv' ? 'Officiell källa' : 'Official source'}: [${standard.designation}](${standard.url}).${index}${related}`;
}

function savePage(standard, locale, metadata) {
	const groups = metadata.groups ?? [];
	const path = resolve(
		root,
		'data/regelverk/standarder',
		`${standard.slug}${locale === 'en' ? '.en' : ''}.svx`
	);
	const old = existsSync(path) ? readFileSync(path, 'utf8') : null;
	const match = old?.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (old && !match) throw new Error(`Missing frontmatter in ${path}`);
	const existing = match ? parseYaml(match[1]) : {};
	const meta = {
		...existing,
		title:
			existing.reviewStatus === 'auto'
				? standard.title[locale]
				: (existing.title ?? standard.title[locale]),
		description:
			existing.reviewStatus === 'auto'
				? standard.description[locale]
				: (existing.description ?? standard.description[locale]),
		designation: standard.designation,
		jurisdiction:
			existing.jurisdiction ??
			standard.jurisdiction ??
			(standard.publisher === 'SSF' || standard.publisher === 'SIS' ? 'Sverige' : 'Internationell'),
		status: metadata.status ?? existing.status ?? 'active',
		reviewStatus: existing.reviewStatus ?? 'auto',
		issuer: existing.issuer ?? standard.issuer ?? standard.publisher,
		legalStatus: 'non-binding',
		sourceChecked: metadata.checked,
		licenseClass: standard.content?.license ?? 'public-info',
		type: 'standard',
		sites: standard.sites,
		url: standard.url,
		...(standard.content && { translation: 'en' }),
		...(metadata.version && { version: metadata.version }),
		...(metadata.published && { published: metadata.published })
	};
	const previousBody = old?.slice(match[0].length);
	if (
		previousBody?.includes('<!-- scan-standards:start -->') !==
		previousBody?.includes('<!-- scan-standards:end -->')
	)
		throw new Error(`Incomplete scanner block in ${path}`);
	const block = `<!-- scan-standards:start -->\n${generatedBody(standard, locale, standard.description[locale], groups)}\n<!-- scan-standards:end -->`;
	const oldGenerated =
		existing.reviewStatus === 'auto' &&
		previousBody?.trim() === generatedBody(standard, locale, existing.description).trim();
	const body = previousBody?.includes('<!-- scan-standards:start -->')
		? previousBody.replace(
				/<!-- scan-standards:start -->[\s\S]*?<!-- scan-standards:end -->/,
				block
			)
		: !previousBody || oldGenerated
			? block
			: previousBody;
	const updated = `---\n${stringify(meta).trimEnd()}\n---\n\n${body.trim()}\n`;
	if (!dry && updated !== old) writeFileSync(path, updated);
	const result =
		old === updated
			? 'unchanged'
			: dry
				? old
					? 'would update'
					: 'would create'
				: old
					? 'updated'
					: 'created';
	console.log(`  ${locale}: ${result} ${path.slice(root.length + 1)}`);
}

function saveGroup(standard, locale, metadata, group) {
	const path = resolve(
		root,
		'data/regelverk/standarder',
		standard.slug,
		`${group.slug}${locale === 'en' ? '.en' : ''}.svx`
	);
	const old = existsSync(path) ? readFileSync(path, 'utf8') : null;
	const match = old?.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (
		old &&
		(!match ||
			!old.includes('<!-- scan-standards:start -->') ||
			!old.includes('<!-- scan-standards:end -->'))
	)
		throw new Error(`Cannot replace unmanaged standard page: ${path}`);
	const existing = match ? parseYaml(match[1]) : {};
	const meta = {
		...existing,
		title: group.title,
		description: `${standard.designation} – ${group.title}`,
		source: standard.slug,
		ref: group.slug.toUpperCase(),
		designation: standard.designation,
		jurisdiction: standard.jurisdiction,
		issuer: standard.publisher,
		status: 'active',
		reviewStatus: existing.reviewStatus ?? 'auto',
		legalStatus: 'non-binding',
		sourceChecked: metadata.checked,
		licenseClass: standard.content.license,
		translation: 'en',
		type: 'standard',
		sites: standard.sites,
		url: standard.url,
		version: metadata.version
	};
	const attribution = `${openSources[standard.content.format].attribution(metadata)} [Source](${standard.content.url}).`;
	const block = `<!-- scan-standards:start -->\n## ${locale === 'sv' ? 'Kravtext (engelskt original)' : 'Requirements (English original)'}\n\n${group.body}\n\n---\n\n${attribution}\n<!-- scan-standards:end -->`;
	const body = old
		? old
				.slice(match[0].length)
				.replace(/<!-- scan-standards:start -->[\s\S]*?<!-- scan-standards:end -->/, block)
		: block;
	const updated = `---\n${stringify(meta).trimEnd()}\n---\n\n${body.trim()}\n`;
	if (!dry && old !== updated) {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, updated);
	}
	const result =
		old === updated
			? 'unchanged'
			: dry
				? old
					? 'would update'
					: 'would create'
				: old
					? 'updated'
					: 'created';
	console.log(`  ${locale}: ${result} ${path.slice(root.length + 1)}`);
}

const standards = parseYaml(
	readFileSync(resolve(root, 'data/registry/standards.yaml'), 'utf8')
).standards;
const lawNames = new Map();
for (const law of parseYaml(readFileSync(resolve(root, 'data/registry/laws.yaml'), 'utf8')).laws ??
	[]) {
	if (law.name) lawNames.set(law.slug, { sv: law.name.sv, en: law.name.en ?? law.name.sv });
}
const selected = only ? standards.filter((standard) => standard.slug === only) : standards;
if (!selected.length) throw new Error(`Unknown standard: ${only}`);
let failures = 0;
for (const standard of selected) {
	try {
		console.log(`scan: ${standard.slug}`);
		const metadata = await scan(standard);
		for (const locale of ['sv', 'en']) {
			savePage(standard, locale, metadata);
			for (const group of metadata.groups ?? []) saveGroup(standard, locale, metadata, group);
		}
	} catch (error) {
		failures++;
		console.error(`  ${standard.slug}: ${error.message}`);
	}
}
if (failures) process.exitCode = 1;
