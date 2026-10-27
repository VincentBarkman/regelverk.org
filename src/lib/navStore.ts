import { browser } from '$app/env';
import { getLocale, localizeHref } from '#lib/paraglide/runtime.js';
import type { Entity } from '#lib/entities.js';
import type { DataRecordRef } from '#lib/data.js';

export type NavGroup = { entity: Entity; items: DataRecordRef[] };

const cache = new Map<string, NavGroup[]>();
const inflight = new Map<string, Promise<NavGroup[]>>();

// Nav groups are fetched once per locale+scope and shared across pages,
// instead of being serialized into every page's hydration payload.
export function getNav(scope: string): Promise<NavGroup[]> {
	const key = `${getLocale()}:${scope}`;
	const hit = cache.get(key);
	if (hit) return Promise.resolve(hit);
	let p = inflight.get(key);
	if (!p) {
		if (!browser) return Promise.resolve([]);
		p = fetch(`${localizeHref('/api/nav')}?scope=${encodeURIComponent(scope)}`)
			.then(async (r) => {
				if (!r.ok) throw new Error(`nav ${r.status}`);
				const d = (await r.json()) as { groups: NavGroup[] };
				cache.set(key, d.groups);
				inflight.delete(key);
				return d.groups;
			})
			.catch(() => {
				inflight.delete(key);
				return [];
			});
		inflight.set(key, p);
	}
	return p;
}
