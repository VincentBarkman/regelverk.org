import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { mdsvex } from 'mdsvex';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { isExternalHref } from './src/lib/links.js';
import { slugifyHeading } from './src/lib/headings.js';

type HastNode = {
	type?: string;
	tagName?: string;
	value?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
};

const hastText = (node: HastNode): string =>
	node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(hastText).join('');

const cls = (props: Record<string, unknown> | undefined): string[] => {
	const v = props?.className;
	return Array.isArray(v) ? v : typeof v === 'string' ? v.split(' ').filter(Boolean) : [];
};

const rehypeExternalLinks = () => (tree: HastNode) => {
	const walk = (node: HastNode) => {
		if (node.type === 'element' && node.tagName === 'a' && node.properties) {
			if (isExternalHref(String(node.properties.href ?? ''))) {
				node.properties.target = '_blank';
				node.properties.rel = 'noopener noreferrer';
			}
		}
		node.children?.forEach(walk);
	};
	walk(tree);
};

const rehypeHeadings = () => (tree: HastNode) => {
	let n = 0;
	const walk = (node: HastNode) => {
		if (
			node.type === 'element' &&
			(node.tagName === 'h2' || node.tagName === 'h3') &&
			node.children
		) {
			const isH2 = node.tagName === 'h2';
			if (isH2) n += 1;
			const text = hastText(node).replace(/#$/, '').trim();
			const id = slugifyHeading(text);
			node.properties ??= {};
			node.properties.id = id;
			node.properties.className = [...cls(node.properties), 'group', 'cursor-pointer'];
			if (isH2)
				node.children.unshift({
					type: 'element',
					tagName: 'span',
					properties: { className: ['secno', 'mr-1.5', 'text-primary/40'] },
					children: [{ type: 'text', value: `${n}.` }]
				});
			node.children.push({
				type: 'element',
				tagName: 'a',
				properties: {
					href: `#${id}`,
					'aria-label': text,
					className: [
						'anchor',
						'ml-2',
						'text-primary/40',
						'no-underline',
						'hover:text-primary',
						'opacity-0',
						'group-hover:opacity-100',
						'focus-visible:opacity-100',
						'transition-opacity'
					]
				},
				children: [{ type: 'text', value: '#' }]
			});
		}
		node.children?.forEach(walk);
	};
	walk(tree);
};

// "punkt N" / "point N" refers to the N. paragraph of the article it appears
// in — give those paragraphs scoped ids and link the references to them.
const rehypePointRefs = () => (tree: HastNode) => {
	const pointsByArticle = new Map<string, Set<string>>();

	const scan = (node: HastNode, article: string | null) => {
		if (node.type === 'element') {
			if (node.tagName === 'h2' || node.tagName === 'h3')
				article = String(node.properties?.id ?? '') || null;
			if (article && node.tagName === 'p') {
				const m = hastText(node).match(/^(\d+)[.)]\s/);
				if (m) {
					if (!pointsByArticle.has(article)) pointsByArticle.set(article, new Set());
					pointsByArticle.get(article)!.add(m[1]);
					node.properties ??= {};
					node.properties.id ??= `${article}-p${m[1]}`;
				}
			}
		}
		node.children?.forEach((c) => scan(c, article));
	};
	scan(tree, null);

	const HEAD = /\b(punkt(?:erna|en)?|point)\s+(\d+)/g;
	const ENUM = /^(\s*(?:,|och|and|–|-)\s*)(\d+)/;
	const ANNEX = /^\s+(?:i\s+(?:tabellen|bilagan)|in\s+the\s+(?:table|annex))/;

	const link = (value: string, article: string, num: string): HastNode => ({
		type: 'element',
		tagName: 'a',
		properties: { href: `#${article}-p${num}` },
		children: [{ type: 'text', value }]
	});

	const transform = (t: string, article: string, points: Set<string>): HastNode[] => {
		const out: HastNode[] = [];
		let last = 0;
		for (const m of t.matchAll(HEAD)) {
			const idx = m.index;
			let rest = t.slice(idx + m[0].length);
			const tail: { sep: string; num: string }[] = [];
			for (;;) {
				const e = rest.match(ENUM);
				if (!e) break;
				tail.push({ sep: e[1], num: e[2] });
				rest = rest.slice(e[0].length);
			}
			if (ANNEX.test(rest)) continue;
			if (!points.has(m[2])) continue;
			if (idx > last) out.push({ type: 'text', value: t.slice(last, idx) });
			out.push(link(m[0], article, m[2]));
			let cursor = idx + m[0].length;
			for (const e of tail) {
				out.push({ type: 'text', value: e.sep });
				out.push(points.has(e.num) ? link(e.num, article, e.num) : { type: 'text', value: e.num });
				cursor += e.sep.length + e.num.length;
			}
			last = cursor;
		}
		if (last < t.length) out.push({ type: 'text', value: t.slice(last) });
		return out;
	};

	const walk = (node: HastNode, article: string | null) => {
		if (node.type !== 'element' || !node.children) return;
		if (node.tagName === 'h2' || node.tagName === 'h3')
			article = String(node.properties?.id ?? '') || null;
		if (node.tagName === 'a') return;
		const pts = article ? pointsByArticle.get(article) : undefined;
		if (pts) {
			node.children = node.children.flatMap((c) =>
				c.type === 'text' ? transform(c.value ?? '', article!, pts) : [c]
			);
		}
		node.children.forEach((c) => walk(c, article));
	};
	walk(tree, null);
};

export default defineConfig({
	plugins: [
		enhancedImages(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				// mdsvex still emits <script context="module"> for frontmatter
				warningFilter: (warning) =>
					!(warning.code === 'script_context_deprecated' && warning.filename?.endsWith('.svx'))
			},
			adapter: adapter(),
			preprocess: [
				mdsvex({
					extensions: ['.svx', '.md'],
					rehypePlugins: [rehypeExternalLinks, rehypeHeadings, rehypePointRefs]
				})
			],
			extensions: ['.svelte', '.svx', '.md']
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['cookie', 'baseLocale']
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
