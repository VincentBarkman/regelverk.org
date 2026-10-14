import { SITE_SCOPES } from '#lib/sites.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { render } from 'svelte/server';
import type { Component } from 'svelte';

type Picture = { sources: Record<string, string>; img: { src: string; w: number; h: number } };

const ARTICLES = import.meta.glob('/data/**/*.{md,svx}', {
	import: 'default',
	eager: true
}) as Record<string, Component>;

const SCANNED = import.meta.glob('/src/lib/assets/scanned/**/*.{png,jpg,jpeg,gif,webp,avif}', {
	eager: true,
	query: { enhanced: true }
}) as Record<string, { default: Picture }>;

function articleComponent(entity: string, id: string): Component | undefined {
	const exts = ['svx', 'md'];
	const suffixes = getLocale() === 'en' ? ['.en', ''] : [''];
	for (const scope of SITE_SCOPES) {
		for (const suffix of suffixes) {
			for (const ext of exts) {
				const article = ARTICLES[`/data/${scope}/${entity}/${id}${suffix}.${ext}`];
				if (article) return article;
			}
		}
	}
	return undefined;
}

// the scanner emits "allmänna råd" (agency guidance) as a blockquote whose
// first paragraph is the italic heading; tag it so it styles as a callout.
// stale svx may hold each råd paragraph as its own blockquote — absorb those
// siblings into the callout too (but not status lines, also <em>-led quotes)
function markRadBlocks(html: string): string {
	if (!html.includes('Allmänna råd')) return html;
	return html.replace(
		/<blockquote><p><em>Allmänna råd<\/em><\/p>([\s\S]*?)<\/blockquote>((?:\s*<blockquote>(?!<p><em>)[\s\S]*?<\/blockquote>)*)/g,
		(m, inner, rest) =>
			`<blockquote class="allmanna-rad"><p class="allmanna-rad-tag">Allmänna råd</p>${inner}${rest.replace(
				/<\/?blockquote>/g,
				''
			)}</blockquote>`
	);
}

// the scanner emits <img src="/scanned/..."> markers into raw legal texts; swap
// them for build-time optimized <picture> markup (avif/webp + dimensions).
function enhanceScannedImages(html: string): string {
	if (!html.includes('/scanned/')) return html;
	return html.replace(/<img\b[^>]*?\bsrc="\/scanned\/([^"?]+)"[^>]*>/g, (tag, p) => {
		const pic = SCANNED[`/src/lib/assets/scanned/${p}`]?.default;
		if (!pic) return tag;
		const alt = tag.match(/\balt="([^"]*)"/)?.[1] ?? '';
		const w = tag.match(/\bwidth="(\d+)"/)?.[1] ?? pic.img.w;
		const h = tag.match(/\bheight="(\d+)"/)?.[1] ?? pic.img.h;
		const sources = Object.entries(pic.sources)
			.map(([format, srcset]) => `<source srcset="${srcset}" type="image/${format}" />`)
			.join('');
		return `<picture>${sources}<img src="${pic.img.src}" width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async" /></picture>`;
	});
}

const rendered = new Map<string, string>();

export function articleHtmlFor(entity: string, id: string): string | undefined {
	const key = `${getLocale()}:${entity}:${id}`;
	const hit = rendered.get(key);
	if (hit !== undefined) return hit;
	const component = articleComponent(entity, id);
	if (!component) return undefined;
	const html = markRadBlocks(enhanceScannedImages(render(component).body));
	rendered.set(key, html);
	return html;
}
