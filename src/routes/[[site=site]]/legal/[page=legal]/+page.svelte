<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { LEGAL_LABEL, ARTICLE_PROSE, type LegalSlug } from '#lib/meta.js';
	import { SITES, siteFavicon, siteHost } from '#lib/sites.js';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import ArticleToc from '#lib/components/articleToc.svelte';
	import type { Component } from 'svelte';
	import type { PageProps } from './$types';

	const ARTICLES = import.meta.glob('/src/lib/legal/*.svx', {
		import: 'default',
		eager: true
	}) as Record<string, Component>;

	let { data }: PageProps = $props();

	const slug = $derived(data.slug as LegalSlug);
	const scope = $derived(data.scope);
	const site = $derived(SITES[scope]);
	const host = $derived(siteHost(scope));
	const title = $derived(LEGAL_LABEL[slug]());
	const Article = $derived(
		ARTICLES[`/src/lib/legal/${slug}.${getLocale()}.svx`] ??
			ARTICLES[`/src/lib/legal/${slug}.sv.svx`]
	);

	let articleEl = $state<HTMLElement>();
</script>

{#snippet wordmark()}
	{#if site.subdomain}<span class={site.colorClass}>{site.subdomain}</span>.regelverk.org{:else}regelverk.org{/if}
{/snippet}

<svelte:head>
	<title>{title} · {host}</title>
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<link rel="canonical" href="https://{host}/legal/{slug}" />
</svelte:head>

<div class="min-h-svh bg-amber-5 flex flex-col">
	<main class="flex-1 w-full max-w-2xl mx-auto px-4 pt-10 pb-10 relative">
		<header
			class="sticky top-0 z-10 -mx-4 px-4 pt-2 pb-3 mb-5 bg-amber-5/80 backdrop-blur-sm"
		>
			{#if dev}
				<a
					href={resolve('/[[site=site]]', scope === 'regelverk' ? {} : { site: scope })}
					aria-label={host}
					class="font-serif text-2xl font-medium">{@render wordmark()}</a
				>
			{:else}
				<a href="https://{host}" rel="external" aria-label={host} class="font-serif text-2xl font-medium"
					>{@render wordmark()}</a
				>
			{/if}
		</header>

		<article bind:this={articleEl} class={ARTICLE_PROSE}>
			<h1>{title}</h1>
			<Article />
		</article>

		<ArticleToc article={articleEl} content={Article} />
	</main>

	<SiteFooter {scope} />
</div>
