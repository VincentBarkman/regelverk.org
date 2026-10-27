<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { extractHeadings } from '#lib/headings.js';
	import { LEGAL_LABEL, ARTICLE_PROSE, type LegalSlug } from '#lib/meta.js';
	import { SITE_COLOR, siteFavicon, siteAppleIcon, siteOgImage } from '#lib/sites.js';
	import { parse as parseYaml } from 'yaml';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import ArticleToc from '#lib/components/articleToc.svelte';
	import NavSheet from '#lib/components/navSheet.svelte';
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
	const title = $derived(LEGAL_LABEL[slug]());
	const articlePath = $derived(
		`/src/lib/legal/${slug}.${getLocale()}.svx` in ARTICLES
			? `/src/lib/legal/${slug}.${getLocale()}.svx`
			: `/src/lib/legal/${slug}.sv.svx`
	);
	const Article = $derived(ARTICLES[articlePath]);
	const rawBody = $derived(LEGAL_RAW[articlePath] ?? '');
	const description = $derived.by(() => {
		const fm = rawBody.match(/^---\r?\n([\s\S]*?)\r?\n---/);
		if (!fm) return undefined;
		try {
			const d = (parseYaml(fm[1]) as Record<string, unknown>)?.description;
			return typeof d === 'string' ? d : undefined;
		} catch {
			return undefined;
		}
	});
	const tocItems = $derived(extractHeadings(rawBody));

	let articleEl = $state<HTMLElement>();
</script>

<svelte:head>
	<title>{title} · regelverk.org</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<meta name="theme-color" content={SITE_COLOR[scope]} />
	<link rel="apple-touch-icon" href={siteAppleIcon(scope)} />
	<link rel="canonical" href="https://regelverk.org/legal/{slug}" />
	<link rel="alternate" hreflang="sv" href="https://regelverk.org/legal/{slug}" />
	<link rel="alternate" hreflang="en" href="https://regelverk.org/en/legal/{slug}" />
	<link rel="alternate" hreflang="x-default" href="https://regelverk.org/legal/{slug}" />
	<OgMeta
		type="article"
		title="{title} · regelverk.org"
		description={description ?? title}
		url="https://regelverk.org/legal/{slug}"
		image="https://regelverk.org{siteOgImage(scope)}"
	/>
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} />
	<main
		id="main-content"
		tabindex="-1"
		class="relative mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-14 xl:max-w-3xl"
	>
		<NavSheet legalNav={{ scope, current: slug }} />
		<LegalNav {scope} current={slug} />
		<article bind:this={articleEl} class={ARTICLE_PROSE}>
			<h1>{title}</h1>
			{#if description}
				<p class="not-prose -mt-3 mb-6 text-[15px] leading-relaxed text-primary/60">
					{description}
				</p>
			{/if}
			<ArticleToc rail={false} items={tocItems} />
			<Article />
		</article>

		<ArticleToc article={articleEl} content={Article} items={tocItems} />
	</main>

	<SiteFooter {scope} wide />
</div>
