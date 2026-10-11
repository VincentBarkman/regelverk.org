<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { extractHeadings } from '#lib/headings.js';
	import { LEGAL_LABEL, ARTICLE_PROSE, type LegalSlug } from '#lib/meta.js';
	import { siteFavicon, siteHost } from '#lib/sites.js';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import ArticleToc from '#lib/components/articleToc.svelte';
	import LegalNav from '#lib/components/legalNav.svelte';
	import type { Component } from 'svelte';
	import type { PageProps } from './$types';

	const ARTICLES = import.meta.glob('/src/lib/legal/*.svx', {
		import: 'default',
		eager: true
	}) as Record<string, Component>;

	const LEGAL_RAW = import.meta.glob('/src/lib/legal/*.svx', {
		query: '?raw',
		import: 'default',
		eager: true
	}) as Record<string, string>;

	let { data }: PageProps = $props();

	const slug = $derived(data.slug as LegalSlug);
	const scope = $derived(data.scope);
	const host = $derived(siteHost(scope));
	const title = $derived(LEGAL_LABEL[slug]());
	const articlePath = $derived(
		`/src/lib/legal/${slug}.${getLocale()}.svx` in ARTICLES
			? `/src/lib/legal/${slug}.${getLocale()}.svx`
			: `/src/lib/legal/${slug}.sv.svx`
	);
	const Article = $derived(ARTICLES[articlePath]);
	const tocItems = $derived(extractHeadings(LEGAL_RAW[articlePath] ?? ''));

	let articleEl = $state<HTMLElement>();
</script>

<svelte:head>
	<title>{title} · {host}</title>
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<link rel="canonical" href="https://{host}/legal/{slug}" />
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} />
	<main class="relative mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-14">
		<LegalNav {scope} current={slug} />
		<article bind:this={articleEl} class={ARTICLE_PROSE}>
			<h1>{title}</h1>
			<Article />
		</article>

		<ArticleToc article={articleEl} content={Article} items={tocItems} />
	</main>

	<SiteFooter {scope} wide />
</div>
