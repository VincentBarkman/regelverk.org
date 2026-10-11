import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

let commits = [];
try {
	const out = execSync(
		'git log --no-decorate --format=%h%x1f%ad%x1f%s --date=short -n 50',
		{ encoding: 'utf-8' }
	);
	commits = out
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [hash, date, ...rest] = line.split('\x1f');
			return { hash, date, message: rest.join('\x1f') };
		});
} catch {
	// No git history (e.g. build sandbox) – emit an empty list.
}

mkdirSync('src/lib/generated', { recursive: true });
writeFileSync(
	'src/lib/generated/commits.ts',
	`export const commits: { hash: string; date: string; message: string }[] = ${JSON.stringify(commits, null, '\t')};\n`
);
