export interface TocItem {
	id: string;
	text: string;
}

export function slugifyHeading(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

function stripInlineMd(text: string): string {
	return text
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[*_`]/g, '')
		.replace(/#$/, '')
		.trim();
}

export function extractHeadings(src: string): TocItem[] {
	const body = src.replace(/^---[\s\S]*?^---\s*$/m, '');
	const items: TocItem[] = [];
	for (const match of body.matchAll(/^##[ \t]+(.+?)[ \t]*$/gm)) {
		const text = stripInlineMd(match[1]);
		if (!text) continue;
		items.push({ id: slugifyHeading(text), text });
	}
	return items;
}
