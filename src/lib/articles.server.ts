import { SITE_SCOPE } from '$app/env/private';
import { SITE_SCOPES, siteHost, type SiteScope } from '#lib/sites.js';
import { isEntity } from '#lib/entities.js';
import { getRecord } from '#lib/data.server.js';
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

// svx content links root-relative ("/lagstiftning/x") regardless of which
// scope's deployment serves it; on a scope where the target isn't visible the
// link 404s. Rewrite those to absolute links on the scope that can serve them.
const SERVING = (SITE_SCOPE as SiteScope | undefined) ?? 'regelverk';
const linkHomes = new Map<string, string | null>();

function linkHome(serving: SiteScope, pathname: string): string | null {
	const key = `${getLocale()}:${serving}:${pathname}`;
	if (linkHomes.has(key)) return linkHomes.get(key)!;
	const bare = pathname.startsWith('/en/') ? pathname.slice(3) : pathname;
	const segs = bare.slice(1).split('/');
	const home =
		isEntity(segs[0]) && segs.length > 1
			? (() => {
					const id = segs.slice(1).join('/');
					if (getRecord(serving, segs[0], id)) return null;
					const s = SITE_SCOPES.find((s) => s !== serving && getRecord(s, segs[0], id));
					return s ? siteHost(s) : null;
				})()
			: null;
	linkHomes.set(key, home);
	return home;
}

function fixScopeLinks(html: string, serving: SiteScope): string {
	if (!html.includes('href="/')) return html;
	return html.replace(/href="(\/[^"#?]*)([^"]*)"/g, (m, path, rest) => {
		const home = linkHome(serving, path);
		return home ? `href="https://${home}${path}${rest}"` : m;
	});
}

export function articleHtmlFor(
	entity: string,
	id: string,
	serving: SiteScope = SERVING
): string | undefined {
	const key = `${getLocale()}:${serving}:${entity}:${id}`;
	const hit = rendered.get(key);
	if (hit !== undefined) return hit;
	const component = articleComponent(entity, id);
	if (!component) return undefined;
	const html = fixScopeLinks(markRadBlocks(enhanceScannedImages(render(component).body)), serving);
	rendered.set(key, html);
	return html;
}
