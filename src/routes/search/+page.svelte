<script lang="ts">
	import { resolve } from '$app/paths';
	import { SITE_BLURB } from '#lib/meta.js';
	import * as m from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.search_label()} · regelverk.org</title>
	<meta name="description" content={SITE_BLURB.regelverk()} />
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<h1>{data.query ? m.search_results_for({ query: data.query }) : m.search_label()}</h1>

	<nav>
		<a href={resolve('/[[site=site]]', {})}>{m.db_back_home()}</a>
	</nav>

	{#if data.results.length}
		<ul>
			{#each data.results as r (`${r.scope}/${r.entity}/${r.id}`)}
				<li>
					<a href={resolve('/wiki/[slug]', { slug: `${r.scope}/${r.entity}/${r.id}` })}>
						{r.id}
					</a>
					· {r.scope} / {r.entity}
				</li>
			{/each}
		</ul>
	{:else}
		<p>{m.db_empty()}</p>
	{/if}
</main>
