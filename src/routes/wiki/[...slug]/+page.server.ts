import { execSync } from 'node:child_process';
import { externalUrls, fetchExternalInfo } from '#lib/externalInfo.js';
import { getRecord, listPages, listRecords, nestRecords } from '#lib/data.js';
import { isEntity } from '#lib/entities.js';
import { isSiteScope } from '#lib/sites.js';
import { ENTITIES, type Entity } from '#lib/entities.js';
import { SITE_SCOPES } from '#lib/sites.js';
import type { EntryGenerator, PageServerLoad } from './$types';

const dateOf = (meta: Record<string, unknown> | null): string => {
	const v = meta?.lastReviewed ?? meta?.published;
	return typeof v === 'string' ? v : '';
};

function gitCommits(limit = 50): { hash: string; date: string; message: string }[] {
	try {
		const out = execSync(
			`git log --no-decorate --format=%h%x1f%ad%x1f%s --date=short -n ${limit}`,
			{
				encoding: 'utf-8'
			}
		);
		return out
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const [hash, date, ...rest] = line.split('\x1f');
				return { hash, date, message: rest.join('\x1f') };
			});
	} catch {
		return [];
	}
}

export const load: PageServerLoad = async ({ params }) => {
	const parts = params.slug.split('/');
	const ref =
		parts.length >= 3 && isSiteScope(parts[0]) && (isEntity(parts[1]) || parts[1] === 'pages')
			? { scope: parts[0], entity: parts[1] as Entity | 'pages', id: parts.slice(2).join('/') }
			: null;

	const all =
		ref?.entity === 'pages'
			? ENTITIES.flatMap((entity) => listRecords(ref.scope, entity).map((r) => ({ ...r, entity })))
			: [];

	const record = ref ? getRecord(ref.scope, ref.entity, ref.id) : null;

	return {
		slug: params.slug,
		ref,
		record,
		external: await fetchExternalInfo(externalUrls(record?.meta ?? null)),
		pages: ref ? listPages(ref.scope) : [],
		nav: ref
			? ENTITIES.map((entity) => ({
					entity,
					items: nestRecords(listRecords(ref.scope, entity))
				})).filter((g) => g.items.length)
			: [],
		updates:
			ref?.id === 'uppdateringar'
				? all
						.filter((r) => dateOf(r.meta))
						.sort((a, b) => dateOf(b.meta).localeCompare(dateOf(a.meta)))
						.slice(0, 20)
				: [],
		sources:
			ref?.id === 'kallor'
				? all
						.filter((r) => typeof r.meta?.source === 'string' || typeof r.meta?.url === 'string')
						.sort((a, b) =>
							(a.entity + (a.title ?? a.id)).localeCompare(b.entity + (b.title ?? b.id))
						)
				: [],
		commits: ref?.id === 'andringslogg' ? gitCommits() : []
	};
};

export const entries: EntryGenerator = () =>
	SITE_SCOPES.flatMap((scope) => [
		...ENTITIES.flatMap((entity) =>
			listRecords(scope, entity).map((r) => ({
				slug: `${r.scope}/${entity}/${r.id}`
			}))
		),
		...listPages(scope).map((p) => ({ slug: `${p.scope}/pages/${p.id}` }))
	]);
