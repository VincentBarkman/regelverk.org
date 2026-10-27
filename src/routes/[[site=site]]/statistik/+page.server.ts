import { resolveScope } from '#lib/scope.js';
import { listRecords, recordLocales } from '#lib/data.js';
import { ENTITIES, type Entity } from '#lib/entities.js';
import type { EntryGenerator, PageServerLoad } from './$types';

const dateOf = (meta: Record<string, unknown> | null): string => {
	const v = meta?.lastReviewed ?? meta?.sourceChecked ?? meta?.published;
	return typeof v === 'string' ? v : '';
};

export const load: PageServerLoad = ({ params, url }) => {
	const scope = resolveScope(params.site, url.hostname);
	const now = Date.now();
	const year = 365.25 * 24 * 3600 * 1000;
	const entities: { entity: Entity; count: number }[] = [];
	const staleness = { fresh: 0, due: 0, overdue: 0, undated: 0 };
	const locales = { sv: 0, en: 0 };
	const recent: { entity: Entity; id: string; title: string; date: string }[] = [];
	let total = 0;

	for (const entity of ENTITIES) {
		const rs = listRecords(scope, entity);
		if (!rs.length) continue;
		entities.push({ entity, count: rs.length });
		total += rs.length;
		for (const r of rs) {
			const d = dateOf(r.meta);
			const t = d ? Date.parse(d) : NaN;
			if (Number.isNaN(t)) staleness.undated++;
			else if (now - t < year) staleness.fresh++;
			else if (now - t < 2 * year) staleness.due++;
			else staleness.overdue++;
			for (const l of recordLocales(r.scope, entity, r.id)) locales[l]++;
			if (d) recent.push({ entity, id: r.id, title: r.title ?? r.id, date: d });
		}
	}
	recent.sort((a, b) => b.date.localeCompare(a.date));
	return { scope, total, entities, staleness, locales, recent: recent.slice(0, 10) };
};

export const entries: EntryGenerator = () => [{}];
