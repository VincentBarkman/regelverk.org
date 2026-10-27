import { resolveScope } from '#lib/scope.js';
import { listRecords } from '#lib/data.js';
import { ENTITIES, type Entity } from '#lib/entities.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export interface TimelineEvent {
	entity: Entity;
	id: string;
	title: string;
	date: string;
	kind: 'published' | 'applies';
}

export const load: PageServerLoad = ({ params, url }) => {
	const scope = resolveScope(params.site, url.hostname);
	const events: TimelineEvent[] = [];
	for (const entity of ENTITIES) {
		for (const r of listRecords(scope, entity)) {
			const meta = r.meta ?? {};
			const published = typeof meta.published === 'string' ? meta.published : '';
			const applies = typeof meta['applies-from'] === 'string' ? meta['applies-from'] : '';
			if (published)
				events.push({
					entity,
					id: r.id,
					title: r.title ?? r.id,
					date: published,
					kind: 'published'
				});
			if (applies && applies !== published)
				events.push({ entity, id: r.id, title: r.title ?? r.id, date: applies, kind: 'applies' });
		}
	}
	events.sort((a, b) => b.date.localeCompare(a.date));
	return { scope, events };
};

export const entries: EntryGenerator = () => [{}];
