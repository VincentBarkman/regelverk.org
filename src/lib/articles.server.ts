import { SITE_SCOPES } from '#lib/sites.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { render } from 'svelte/server';
import type { Component } from 'svelte';

const ARTICLES = import.meta.glob('/data/**/*.{md,svx}', {
	import: 'default',
	eager: true
}) as Record<string, Component>;

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

const rendered = new Map<string, string>();

export function articleHtmlFor(entity: string, id: string): string | undefined {
	const key = `${getLocale()}:${entity}:${id}`;
	const hit = rendered.get(key);
	if (hit !== undefined) return hit;
	const component = articleComponent(entity, id);
	if (!component) return undefined;
	const html = render(component).body;
	rendered.set(key, html);
	return html;
}
