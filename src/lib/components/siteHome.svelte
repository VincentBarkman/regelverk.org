<script lang="ts">
	import SearchBar from '#lib/components/searchBar.svelte';
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { SITE_SCOPES, SITES, siteHost, type SiteScope } from '#lib/sites.js';
	import * as m from '#lib/paraglide/messages.js';

	let { scope }: { scope: SiteScope } = $props();

	const site = $derived(SITES[scope]);
</script>

{#snippet wordmark()}
	{#if site.subdomain}<span class={site.colorClass}>{site.subdomain}</span>.regelverk.org{:else}regelverk.org{/if}
{/snippet}

<div class="flex flex-col h-screen bg-amber-5">
	<div class="flex-1 flex flex-col justify-center items-center gap-4">
		<h1 class="font-serif text-5xl font-medium select-none">
			{#if dev}
				<a href={resolve('/[[site=site]]', {})}>{@render wordmark()}</a>
			{:else}
				<a href={`https://${siteHost(scope)}`} rel="external">{@render wordmark()}</a>
			{/if}
		</h1>
		<SearchBar inputId="global-search-input" />

		<nav
			class="flex flex-col items-center gap-1 text-xs text-primary/60"
			aria-label={m.nav_sites()}
		>
			<div class="flex flex-wrap justify-center gap-2">
				{#each SITE_SCOPES as s, i (s)}
					{@const label = s === 'regelverk' ? m.nav_home() : SITES[s].label}
					{#if s === scope}
						<span class="text-primary" aria-current="page">{label}</span>
					{:else if dev}
						<a
							href={resolve('/[[site=site]]', s === 'regelverk' ? {} : { site: s })}
							class="hover:underline"
						>
							{label}
						</a>
					{:else}
						<a href={`https://${siteHost(s)}`} rel="external" class="hover:underline">
							{label}
						</a>
					{/if}
					{#if i < SITE_SCOPES.length - 1}<p>•</p>{/if}
				{/each}
			</div>
			<a href={resolve('/[[site=site]]', {})} class="hover:underline">{m.nav_privacy()}</a>
		</nav>
	</div>

	<div class="pb-4">
		<p class="text-xs text-primary/60 text-center">
			{m.footer_license()} <a target="_blank" rel="noopener noreferrer" href="https://www.gnu.org/licenses/agpl-3.0.html" class="hover:underline">GNU Affero General Public License v3</a>
		</p>
	</div>
</div>
