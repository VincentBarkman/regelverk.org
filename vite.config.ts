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
		if (node.type === 'element' && node.tagName === 'h2' && node.children) {
			n += 1;
			const text = hastText(node).replace(/#$/, '').trim();
			const id = slugifyHeading(text);
			node.properties ??= {};
			node.properties.id = id;
			node.properties.className = [...cls(node.properties), 'group', 'cursor-pointer'];
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
					rehypePlugins: [rehypeExternalLinks, rehypeHeadings]
				})
			],
			extensions: ['.svelte', '.svx', '.md']
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
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
