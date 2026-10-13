<script lang="ts">
	import SearchBar from '#lib/components/searchBar.svelte';
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { SITE_SCOPES, SITES, siteFavicon, siteHost, type SiteScope } from '#lib/sites.js';
	import { ENTITIES } from '#lib/entities.js';
	import SiteMark from '#lib/components/siteMark.svelte';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import { SITE_LONG, SITE_BLURB, ENTITY_LABEL, ENTITY_ICON } from '#lib/meta.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as m from '#lib/paraglide/messages.js';
	import RiArrowRightSLine from 'remixicon-svelte/icons/arrow-right-s-line';
	import { fitText } from '#lib/fitText.js';

	let { scope }: { scope: SiteScope } = $props();

	const site = $derived(SITES[scope]);
	const sectorScopes = SITE_SCOPES.filter((s) => s !== 'regelverk');

	const TYPING_PHRASES: Record<SiteScope, string[]> = {
		regelverk: ['ATEX...', 'NIS2...', 'ELSÄK-FS...', 'AFS 2023...', 'ISO 27001...', 'BBR...'],
		ot: ['IEC 62443...', 'ATEX...', 'SCADA...', 'SIL 2...', 'IEC 61511...', 'NERC CIP...'],
		it: ['NIS2...', 'ISO 27001...', 'GDPR...', 'CIS v8...', 'SOC 2...', 'CRA...'],
		fysisk: ['SSF 200...', 'EN 50131...', 'Larmklass 3...', 'SKL...', 'EN 60839...', 'Låsklass...'],
		brandskydd: ['BBR...', 'SBF 127...', 'EN 13501...', 'SPR 10...', 'ISO 7240...', 'BFV...'],
		el: ['ELSÄK-FS...', 'SS-EN 50110...', 'Starkström...', 'IEC 60364...', 'SS 436 40 00...'],
		arbetsmiljo: ['AFS 2023...', 'Arbetsmiljölagen...', 'ISO 45001...', 'AFS 2020...', 'OSA...']
	};
</script>

{#snippet wordmark()}
	{#if site.subdomain}<span class={site.colorClass}>{site.subdomain}</span
		>.regelverk.org{:else}regelverk.org{/if}
{/snippet}

<svelte:head>
	<title>{siteHost(scope)}</title>
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<meta name="description" content={SITE_BLURB[scope]()} />
	<link rel="canonical" href="https://{siteHost(scope)}" />
	<OgMeta
		title={siteHost(scope)}
		description={SITE_BLURB[scope]()}
		url="https://{siteHost(scope)}"
	/>
	{#if !dev}
		{#each SITE_SCOPES.filter((s) => s !== scope) as s (s)}
			<link rel="dns-prefetch" href="https://{siteHost(s)}" />
			<link rel="preconnect" href="https://{siteHost(s)}" />
		{/each}
		{@html `<script type="speculationrules">${JSON.stringify({
			prefetch: [
				{
					source: 'list',
					urls: SITE_SCOPES.filter((s) => s !== scope).map((s) => `https://${siteHost(s)}/`),
					eagerness: 'moderate'
				}
			]
		})}</script>`}
	{/if}
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<main class="flex flex-1 flex-col items-center px-4">
		<header
			class="@container flex min-h-[35svh] w-full flex-col items-center justify-end gap-4 pb-3 sm:min-h-[50svh] [@media(max-height:40rem)]:min-h-0! [@media(max-height:40rem)]:pt-8"
		>
			<h1
				use:fitText
				class="text-center font-serif text-[min(3rem,6.5cqw)] font-medium whitespace-nowrap select-none"
			>
				{#if dev}
					<a
						href={resolve('/[[site=site]]', scope === 'regelverk' ? {} : { site: scope })}
						aria-label={siteHost(scope)}>{@render wordmark()}</a
					>
				{:else}
					<a href={`https://${siteHost(scope)}`} rel="external" aria-label={siteHost(scope)}
						>{@render wordmark()}</a
					>
				{/if}
			</h1>

			<SearchBar inputId="global-search-input" typingPhrases={TYPING_PHRASES[scope]} />
		</header>

		<div class="flex w-full max-w-2xl flex-col gap-4 pb-6">
			<nav aria-labelledby="explore-heading" class="flex flex-col gap-2">
				<h2 id="explore-heading" class="text-xs font-medium text-primary/70">{m.ui_explore()}</h2>
				<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each sectorScopes as s (s)}
						<li>
							{#if dev}
								<a
									href={resolve('/[[site=site]]', s === scope ? {} : { site: s })}
									class="block"
									aria-current={s === scope ? 'page' : undefined}
								>
									<Card.Root
										class="flex-row items-center gap-2.5 px-3 py-2 transition-colors hover:border-primary/40 {s ===
										scope
											? 'border-primary/60 bg-primary/5'
											: ''}"
									>
										<SiteMark scope={s} class="size-4 shrink-0 {SITES[s].colorClass}" />
										<span class="flex flex-col">
											<span class="text-xs font-medium">{SITE_LONG[s]()}</span>
											<span class="text-[11px] leading-tight text-primary/60"
												>{SITE_BLURB[s]()}</span
											>
										</span>
									</Card.Root>
								</a>
							{:else}
								<a
									href={`https://${siteHost(s === scope ? 'regelverk' : s)}`}
									rel="external"
									class="block"
									aria-current={s === scope ? 'page' : undefined}
								>
									<Card.Root
										class="flex-row items-center gap-2.5 px-3 py-2 transition-colors hover:border-primary/40 {s ===
										scope
											? 'border-primary/60 bg-primary/5'
											: ''}"
									>
										<SiteMark scope={s} class="size-4 shrink-0 {SITES[s].colorClass}" />
										<span class="flex flex-col">
											<span class="text-xs font-medium">{SITE_LONG[s]()}</span>
											<span class="text-[11px] leading-tight text-primary/60"
												>{SITE_BLURB[s]()}</span
											>
										</span>
									</Card.Root>
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</nav>

			<nav aria-labelledby="browse-heading" class="flex flex-col gap-2">
				<h2 id="browse-heading" class="text-xs font-medium text-primary/70">{m.ui_browse_db()}</h2>
				<ul class="grid grid-cols-2 gap-x-6">
					{#each ENTITIES as e (e)}
						{@const EIcon = ENTITY_ICON[e]}
						<li>
							{#if dev}
								<a
									href={resolve(
										'/[[site=site]]/[entity=entity]',
										scope === 'regelverk' ? { entity: e } : { site: scope, entity: e }
									)}
									class="flex items-center gap-2 py-1 text-xs underline-offset-4 hover:underline"
								>
									<EIcon class="size-3.5 text-primary/60" aria-hidden="true" />
									<span>{ENTITY_LABEL[e]()}</span>
									<RiArrowRightSLine class="ml-auto size-3.5 text-primary/40" aria-hidden="true" />
								</a>
							{:else}
								<a
									href={`https://${siteHost(scope)}/${e}`}
									rel="external"
									class="flex items-center gap-2 py-1 text-xs underline-offset-4 hover:underline"
								>
									<EIcon class="size-3.5 text-primary/60" aria-hidden="true" />
									<span>{ENTITY_LABEL[e]()}</span>
									<RiArrowRightSLine class="ml-auto size-3.5 text-primary/40" aria-hidden="true" />
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</nav>
		</div>
	</main>

	<SiteFooter {scope} />
</div>
