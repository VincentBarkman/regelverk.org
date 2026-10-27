import { browser } from '$app/env';

export interface Bookmark {
	scope: string;
	entity: string;
	id: string;
	title: string;
}

const KEY = 'regelverk:bookmarks';
const MAX = 50;

let items = $state<Bookmark[]>([]);

if (browser) {
	try {
		const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		items = Array.isArray(raw)
			? raw.filter(
					(b): b is Bookmark =>
						!!b && typeof b === 'object' && 'id' in b && 'entity' in b && 'title' in b
				)
			: [];
	} catch {
		items = [];
	}
}

const persist = () => {
	try {
		localStorage.setItem(KEY, JSON.stringify(items));
	} catch {
		// storage full or unavailable (private mode) — keep in-memory only
	}
};

export function bookmarkList(): Bookmark[] {
	return items;
}

export function isBookmarked(entity: string, id: string): boolean {
	return items.some((b) => b.entity === entity && b.id === id);
}

export function toggleBookmark(b: Bookmark): void {
	const i = items.findIndex((x) => x.entity === b.entity && x.id === b.id);
	if (i >= 0) items.splice(i, 1);
	else items.unshift(b);
	if (items.length > MAX) items.length = MAX;
	persist();
}
