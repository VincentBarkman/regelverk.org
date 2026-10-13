#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const start = '<!-- scan-laws:start -->';
const end = '<!-- scan-laws:end -->';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const outputArg = args.indexOf('--output');

if (
	args.some(
		(arg, index) =>
			!['--dry-run', '--output'].includes(arg) && !(outputArg !== -1 && index === outputArg + 1)
	)
) {
	throw new Error('Usage: node scripts/export-manual-pages.mjs [--dry-run] [--output path.zip]');
}
if (outputArg !== -1 && (!args[outputArg + 1] || args[outputArg + 1].startsWith('--'))) {
	throw new Error('--output needs a ZIP filename');
}

const output = resolve(outputArg === -1 ? join(root, 'manual-pages.zip') : args[outputArg + 1]);
if (!dryRun && existsSync(output)) throw new Error(`Output already exists: ${output}`);

function* pages(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* pages(path);
		else if (entry.isFile() && /\.(svx|md)$/.test(entry.name)) yield path;
	}
}

const selected = [];
for (const site of readdirSync(join(root, 'data'), { withFileTypes: true })) {
	if (!site.isDirectory() || site.name === 'registry') continue;
	for (const path of pages(join(root, 'data', site.name))) {
		const text = readFileSync(path, 'utf8');
		const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
		const meta = match ? parseYaml(match[1]) : null;
		if (meta?.reviewStatus === 'auto') continue;

		const hasStart = text.includes(start);
		const hasEnd = text.includes(end);
		if (hasStart !== hasEnd) throw new Error(`Incomplete scanner block: ${path}`);
		const name = relative(root, path).split(sep).join('/');
		if (!hasStart) {
			selected.push({ name, path });
			continue;
		}

		const parentLaw = /^data\/[^/]+\/lagstiftning\/[^/]+\.(svx|md)$/.test(name);
		if (!parentLaw) continue;
		const manual = text.replace(/<!-- scan-laws:start -->[\s\S]*?<!-- scan-laws:end -->/g, '');
		if (manual.slice(match?.[0].length ?? 0).trim()) selected.push({ name, content: manual });
	}
}
selected.sort((a, b) => a.name.localeCompare(b.name));

if (dryRun) {
	for (const { name } of selected) console.log(name);
	console.error(`${selected.length} non-scanned pages`);
} else {
	if (!selected.length) throw new Error('No non-scanned pages found');
	const staging = mkdtempSync(join(tmpdir(), 'regelverk-manual-pages-'));
	try {
		for (const { name, path, content } of selected) {
			const target = join(staging, name);
			mkdirSync(dirname(target), { recursive: true });
			if (content === undefined) copyFileSync(path, target);
			else writeFileSync(target, content);
		}
		const result = spawnSync('zip', ['-q', '-X', output, ...selected.map(({ name }) => name)], {
			cwd: staging,
			stdio: 'inherit'
		});
		if (result.error) throw result.error;
		if (result.status !== 0) throw new Error(`zip exited with status ${result.status}`);
	} finally {
		rmSync(staging, { recursive: true, force: true });
	}
	console.log(`Archived ${selected.length} non-scanned pages to ${output}`);
}
