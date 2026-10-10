<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { siteHost } from '#lib/sites.js';
	import { ENTITY_LABEL } from '#lib/meta.js';
	import { articleFor } from '#lib/data.js';
	import * as m from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.ref?.id ?? data.slug} · regelverk.org</title>
	{#if data.ref}
		<meta name="description" content="{data.ref.scope} / {ENTITY_LABEL[data.ref.entity]()}" />
		<link
			rel="canonical"
			href="https://{siteHost(data.ref.scope)}/{data.ref.entity}/{encodeURIComponent(data.ref.id)}"
		/>
	{/if}
</svelte:head>

<main>
	{#if data.ref}
		<nav aria-label="Breadcrumb">
			{data.ref.scope} / {data.ref.entity} ·
			{#if dev}
				<a
					href={resolve(
						'/[[site=site]]/[entity=entity]/[id]',
						data.ref.scope === 'regelverk'
							? { entity: data.ref.entity, id: data.ref.id }
							: { site: data.ref.scope, entity: data.ref.entity, id: data.ref.id }
					)}>{m.db_record()}</a
				>
			{:else}
				<a
					href={`https://${siteHost(data.ref.scope)}/${data.ref.entity}/${encodeURIComponent(data.ref.id)}`}
					rel="external">{m.db_record()}</a
				>
			{/if}
		</nav>
	{/if}

	<h1>{data.ref?.id ?? data.slug}</h1>

	{#if data.record && data.ref}
		{@const Article = articleFor(data.ref.entity, data.ref.id)}
		<article class="prose max-w-2xl px-4">
			{#if Article}
				<Article />
			{:else}
				<pre>{data.record.body}</pre>
			{/if}
		</article>
	{:else}
		<p>{m.wiki_empty()}</p>
	{/if}
</main>
