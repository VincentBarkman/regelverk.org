<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { localizeHref, getLocale } from '#lib/paraglide/runtime.js';
	import { siteTitle, ENTITY_LABEL, ENTITY_COLOR } from '#lib/meta.js';
	import {
		SITE_COLOR,
		siteHost,
		siteFavicon,
		siteAppleIcon,
		siteOgImage,
		type SiteScope
	} from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';
	import { getNav, type NavGroup } from '#lib/navStore.js';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import RecordNav from '#lib/components/recordNav.svelte';
	import NavSheet from '#lib/components/navSheet.svelte';
	import * as m from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const scope = $derived(data.scope as SiteScope);
	const host = $derived(siteHost(scope));

	const listHref = (entity: Entity, id: string) =>
		localizeHref(
			dev
				? resolve(
						'/[[site=site]]/[entity=entity]/[...id]',
						scope === 'regelverk' ? { entity, id } : { site: scope, entity, id }
					)
				: `https://${host}/${entity}/${id.split('/').map(encodeURIComponent).join('/')}`
		);

	const pageHref = (slug: string) =>
		localizeHref(
			dev
				? resolve('/wiki/[...slug]', { slug: `${scope}/pages/${slug}` })
				: `https://${host}/wiki/${scope}/pages/${slug}`
		);

	const graphHref = $derived(
		localizeHref(
			dev
				? resolve('/[[site=site]]/graf', scope === 'regelverk' ? {} : { site: scope })
				: `https://${host}/graf`
		)
	);

	const statsHref = $derived(
		localizeHref(
			dev
				? resolve('/[[site=site]]/statistik', scope === 'regelverk' ? {} : { site: scope })
				: `https://${host}/statistik`
		)
	);

	const title = $derived(`${m.nav_stats()} · ${siteTitle(scope)}`);

	let nav = $state<NavGroup[]>([]);
	$effect(() => {
		nav = [];
		void getNav(scope).then((g) => (nav = g));
	});

	const staleTotal = $derived(
		data.staleness.fresh + data.staleness.due + data.staleness.overdue + data.staleness.undated
	);
	const stalenessRows = $derived([
		{ label: () => m.stats_fresh(), count: data.staleness.fresh, color: '#10b981' },
		{ label: () => m.stats_due(), count: data.staleness.due, color: '#f59e0b' },
		{ label: () => m.stats_overdue(), count: data.staleness.overdue, color: '#ef4444' },
		{ label: () => m.stats_undated(), count: data.staleness.undated, color: '#a8a29e' }
	]);
	const localeRows = $derived([
		{ label: () => 'Svenska', count: data.locales.sv },
		{ label: () => 'English', count: data.locales.en }
	]);

	const fmtDate = (value: string) => {
		const d = new Date(value);
		return Number.isNaN(d.getTime())
			? value
			: new Intl.DateTimeFormat(getLocale() === 'sv' ? 'sv-SE' : 'en-GB', {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				}).format(d);
	};
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={m.stats_lede()} />
	<link rel="icon" href={siteFavicon(scope)} />
	<meta name="theme-color" content={SITE_COLOR[scope]} />
	<link rel="apple-touch-icon" href={siteAppleIcon(scope)} />
	<link rel="canonical" href="https://{host}/statistik" />
	<link rel="alternate" hreflang="sv" href="https://{host}/statistik" />
	<link rel="alternate" hreflang="en" href="https://{host}/en/statistik" />
	<link rel="alternate" hreflang="x-default" href="https://{host}/statistik" />
	<OgMeta
		{title}
		description={m.stats_lede()}
		url="https://{host}/statistik"
		image="https://{host}{siteOgImage(scope)}"
	/>
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} />
	<main
		id="main-content"
		tabindex="-1"
		class="relative mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-14"
	>
		<NavSheet
			nav={{
				groups: nav,
				currentId: 'statistik',
				hrefFor: listHref,
				pageHref,
				graphHref,
				statsHref
			}}
		/>
		<RecordNav
			groups={nav}
			currentId="statistik"
			hrefFor={listHref}
			{pageHref}
			{graphHref}
			{statsHref}
		/>

		<h1 class="mb-1 font-serif text-3xl font-medium text-primary">{m.stats_title()}</h1>
		<p class="mb-6 max-w-xl text-sm text-primary/70">{m.stats_lede()}</p>

		<div class="grid gap-4 sm:grid-cols-3">
			<section class="rounded-lg border border-primary/10 bg-white/70 p-4">
				<h2 class="text-xs font-medium tracking-wide text-primary/60 uppercase">
					{m.stats_records()}
				</h2>
				<p class="mt-1 font-serif text-3xl font-medium text-primary">{data.total}</p>
				<ul class="mt-3 space-y-1 text-xs text-primary/70">
					{#each localeRows as row (row.label())}
						<li class="flex justify-between">
							<span>{row.label()}</span><span class="tabular-nums">{row.count}</span>
						</li>
					{/each}
				</ul>
			</section>

			<section class="rounded-lg border border-primary/10 bg-white/70 p-4">
				<h2 class="text-xs font-medium tracking-wide text-primary/60 uppercase">
					{m.stats_staleness()}
				</h2>
				<ul class="mt-3 space-y-2">
					{#each stalenessRows as row (row.label())}
						<li>
							<div class="flex justify-between text-xs text-primary/80">
								<span>{row.label()}</span><span class="tabular-nums">{row.count}</span>
							</div>
							<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/8">
								<div
									class="h-full rounded-full"
									style="width: {(row.count / Math.max(1, staleTotal)) *
										100}%; background: {row.color}"
								></div>
							</div>
						</li>
					{/each}
				</ul>
			</section>

			<section class="rounded-lg border border-primary/10 bg-white/70 p-4 sm:col-span-1">
				<h2 class="text-xs font-medium tracking-wide text-primary/60 uppercase">
					{m.stats_recent()}
				</h2>
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<ul class="mt-2 space-y-1.5">
					{#each data.recent.slice(0, 5) as r (r.id)}
						<li class="min-w-0 text-xs">
							<a
								href={listHref(r.entity, r.id)}
								class="block truncate text-primary/80 underline decoration-primary/25 underline-offset-2 hover:text-primary hover:decoration-primary"
								>{r.title}</a
							>
							<span class="text-[11px] text-primary/50">{fmtDate(r.date)}</span>
						</li>
					{/each}
				</ul>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</section>
		</div>

		<section class="mt-6 rounded-lg border border-primary/10 bg-white/70 p-4">
			<h2 class="text-xs font-medium tracking-wide text-primary/60 uppercase">
				{m.stats_per_entity()}
			</h2>
			<div class="mt-3 flex h-2.5 overflow-hidden rounded-full bg-primary/8">
				{#each data.entities as row (row.entity)}
					<div
						class="h-full"
						style="width: {(row.count / Math.max(1, data.total)) * 100}%; background: {ENTITY_COLOR[
							row.entity
						]}"
					></div>
				{/each}
			</div>
			<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
				{#each data.entities as row (row.entity)}
					<li class="flex items-center gap-1.5 text-xs text-primary/80">
						<span
							class="size-2 shrink-0 rounded-full"
							style="background: {ENTITY_COLOR[row.entity]}"
						></span>
						{ENTITY_LABEL[row.entity]()}
						<span class="text-primary/50 tabular-nums">{row.count}</span>
					</li>
				{/each}
			</ul>
		</section>
	</main>

	<SiteFooter {scope} wide />
</div>
