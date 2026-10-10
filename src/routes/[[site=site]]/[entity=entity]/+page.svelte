<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { SITES, siteHost, type SiteScope } from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';
	import { ENTITY_LABEL, SITE_BLURB } from '#lib/meta.js';
	import * as m from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scope = $derived(data.scope as SiteScope);
	const entity = $derived(data.entity as Entity);
</script>

<svelte:head>
	<title>{ENTITY_LABEL[entity]()} · {siteHost(scope)}</title>
	<meta name="description" content={SITE_BLURB[scope]()} />
	<link rel="canonical" href="https://{siteHost(scope)}/{entity}" />
</svelte:head>

<main>
	<nav>
		{#if dev}
			<a href={resolve('/[[site=site]]', scope === 'regelverk' ? {} : { site: scope })}
				>{m.db_back_home()}</a
			>
		{:else}
			<a href={`https://${siteHost(scope)}`} rel="external">{m.db_back_home()}</a>
		{/if}
	</nav>

	<h1>{ENTITY_LABEL[entity]()} · {SITES[scope].subdomain ?? 'regelverk.org'}</h1>

	{#if data.records.length}
		<ul>
			{#each data.records as r (r.id)}
				<li>
					{#if dev}
						<a
							href={resolve(
								'/[[site=site]]/[entity=entity]/[id]',
								scope === 'regelverk' ? { entity, id: r.id } : { site: scope, entity, id: r.id }
							)}>{r.id}</a
						>
					{:else}
						<a
							href={`https://${siteHost(scope)}/${entity}/${encodeURIComponent(r.id)}`}
							rel="external">{r.id}</a
						>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p>{m.db_empty()}</p>
		<p><code>data/{scope}/{entity}/</code></p>
	{/if}
</main>
