<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { localizeHref, getLocale } from '#lib/paraglide/runtime.js';
	import { siteTitle, entityLabel } from '#lib/meta.js';
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

	const timelineHref = $derived(
		localizeHref(
			dev
				? resolve('/[[site=site]]/tidslinje', scope === 'regelverk' ? {} : { site: scope })
				: `https://${host}/tidslinje`
		)
	);

	const title = $derived(`${m.nav_timeline()} · ${siteTitle(scope)}`);

	let nav = $state<NavGroup[]>([]);
	$effect(() => {
		nav = [];
		void getNav(scope).then((g) => (nav = g));
	});

	const byYear = $derived.by(() => {
		const groups: Record<string, typeof data.events> = {};
		for (const e of data.events) {
			const year = e.date.slice(0, 4);
			(groups[year] ??= []).push(e);
		}
		return Object.entries(groups);
	});

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
	<meta name="description" content={m.timeline_lede()} />
	<link rel="icon" href={siteFavicon(scope)} />
	<meta name="theme-color" content={SITE_COLOR[scope]} />
	<link rel="apple-touch-icon" href={siteAppleIcon(scope)} />
	<link rel="canonical" href="https://{host}/tidslinje" />
	<link rel="alternate" hreflang="sv" href="https://{host}/tidslinje" />
	<link rel="alternate" hreflang="en" href="https://{host}/en/tidslinje" />
	<link rel="alternate" hreflang="x-default" href="https://{host}/tidslinje" />
	<OgMeta
		{title}
		description={m.timeline_lede()}
		url="https://{host}/tidslinje"
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
				currentId: 'tidslinje',
				hrefFor: listHref,
				pageHref,
				graphHref,
				statsHref,
				timelineHref
			}}
		/>
		<RecordNav
			groups={nav}
			currentId="tidslinje"
			hrefFor={listHref}
			{pageHref}
			{graphHref}
			{statsHref}
			{timelineHref}
		/>

		<h1 class="mb-1 font-serif text-3xl font-medium text-primary">{m.nav_timeline()}</h1>
		<p class="mb-6 max-w-xl text-sm text-primary/70">{m.timeline_lede()}</p>

		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<ol class="relative ml-2 border-l border-primary/15">
			{#each byYear as [year, events] (year)}
				<li class="mb-1 pt-5 pl-6">
					<h2 class="font-serif text-xl font-medium text-primary">{year}</h2>
				</li>
				{#each events as e (`${e.entity}/${e.id}/${e.kind}`)}
					<li class="relative py-2 pl-6">
						<span
							aria-hidden="true"
							class="absolute top-1/2 -left-[5px] size-2.5 -translate-y-1/2 rounded-full {e.kind ===
							'published'
								? 'bg-primary/50'
								: 'border border-primary/50 bg-white'}"
						></span>
						<div class="flex flex-wrap items-baseline gap-x-2">
							<span class="text-xs whitespace-nowrap text-primary/50 tabular-nums"
								>{fmtDate(e.date)}</span
							>
							<a
								href={listHref(e.entity, e.id)}
								class="text-sm font-medium text-primary underline decoration-primary/25 underline-offset-4 hover:decoration-primary"
								>{e.title}</a
							>
							<span class="text-[11px] text-primary/50"
								>{entityLabel(e.entity)} · {e.kind === 'published'
									? m.timeline_published()
									: m.timeline_applies()}</span
							>
						</div>
					</li>
				{/each}
			{/each}
		</ol>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</main>

	<SiteFooter {scope} wide />
</div>
