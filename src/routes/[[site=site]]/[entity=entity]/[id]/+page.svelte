<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { SITES, siteFavicon, siteHost, type SiteScope } from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';
	import { ENTITY_LABEL, ARTICLE_PROSE } from '#lib/meta.js';
	import { articleFor } from '#lib/data.js';
	import * as m from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scope = $derived(data.scope as SiteScope);
	const entity = $derived(data.entity as Entity);
</script>

<svelte:head>
	<title>{data.id} · {ENTITY_LABEL[entity]()} · {siteHost(scope)}</title>
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<link
		rel="canonical"
		href="https://{siteHost(scope)}/{entity}/{encodeURIComponent(data.id)}"
	/>
</svelte:head>

<main>
	<nav aria-label="Breadcrumb">
		{SITES[scope].subdomain ?? 'regelverk.org'} /
		{#if dev}
			<a
				href={resolve(
					'/[[site=site]]/[entity=entity]',
					scope === 'regelverk' ? { entity } : { site: scope, entity }
				)}>{entity}</a
			>
		{:else}
			<a href={`https://${siteHost(scope)}/${entity}`} rel="external">{entity}</a>
		{/if}
		/ {data.id}
	</nav>

	<h1>{data.id}</h1>

	{#if data.record}
		{@const Article = articleFor(entity, data.record.id)}
		<article class="{ARTICLE_PROSE} px-4">
			{#if Article}
				<Article />
			{:else}
				<pre>{data.record.body}</pre>
			{/if}
		</article>
	{:else}
		<p>{m.db_empty()}</p>
		<p><code>data/{scope}/{entity}/{data.id}.yaml</code></p>
	{/if}
</main>
