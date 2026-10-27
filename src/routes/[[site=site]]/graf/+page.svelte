<script lang="ts">
	import { dev, browser } from '$app/env';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizeHref } from '#lib/paraglide/runtime.js';
	import { siteTitle, ENTITY_COLOR, entityLabel } from '#lib/meta.js';
	import {
		SITE_COLOR,
		siteHost,
		siteFavicon,
		siteAppleIcon,
		siteOgImage,
		isSiteScope,
		type SiteScope
	} from '#lib/sites.js';
	import type { GraphNode } from '#lib/data.js';
	import { getNav, type NavGroup } from '#lib/navStore.js';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import RecordNav from '#lib/components/recordNav.svelte';
	import NavSheet from '#lib/components/navSheet.svelte';
	import SiteGraph from '#lib/components/siteGraph.svelte';
	import * as m from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import type { Entity } from '#lib/entities.js';

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

	const nodeHref = (node: GraphNode) =>
		localizeHref(
			dev
				? resolve(
						'/[[site=site]]/[entity=entity]/[...id]',
						isSiteScope(node.scope) && node.scope !== 'regelverk'
							? { site: node.scope, entity: node.entity as Entity, id: node.id }
							: { entity: node.entity as Entity, id: node.id }
					)
				: `https://${isSiteScope(node.scope) ? siteHost(node.scope) : host}/${node.entity}/${node.id
						.split('/')
						.map(encodeURIComponent)
						.join('/')}`
		);

	const title = $derived(`${m.ui_relationship_graph()} · ${siteTitle(scope)}`);

	// Entity filter chips — hiding an entity removes its nodes and any edges
	// touching them, then the layout re-runs on the visible subset.
	const entities = $derived([...new Set(data.nodes.map((n) => n.entity))]);
	let hidden = $state<string[]>([]);
	const visNodes = $derived(
		hidden.length ? data.nodes.filter((n) => !hidden.includes(n.entity)) : data.nodes
	);
	const visEdges = $derived.by(() => {
		if (!hidden.length) return data.edges;
		const remap: Record<number, number> = {};
		let ni = 0;
		data.nodes.forEach((n, i) => {
			if (!hidden.includes(n.entity)) remap[i] = ni++;
		});
		return data.edges
			.filter((e) => remap[e.a] !== undefined && remap[e.b] !== undefined)
			.map((e) => ({ a: remap[e.a], b: remap[e.b], kind: e.kind }));
	});
	// Read client-side only — url.searchParams is unavailable during prerender.
	const focusId = $derived(browser ? (page.url.searchParams.get('fokus') ?? undefined) : undefined);

	function toggleEntity(entity: string) {
		hidden = hidden.includes(entity) ? hidden.filter((e) => e !== entity) : [...hidden, entity];
	}

	let nav = $state<NavGroup[]>([]);
	$effect(() => {
		nav = [];
		void getNav(scope).then((g) => (nav = g));
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={m.graph_lede()} />
	<link rel="icon" href={siteFavicon(scope)} />
	<meta name="theme-color" content={SITE_COLOR[scope]} />
	<link rel="apple-touch-icon" href={siteAppleIcon(scope)} />
	<link rel="canonical" href="https://{host}/graf" />
	<link rel="alternate" hreflang="sv" href="https://{host}/graf" />
	<link rel="alternate" hreflang="en" href="https://{host}/en/graf" />
	<link rel="alternate" hreflang="x-default" href="https://{host}/graf" />
	<OgMeta
		{title}
		description={m.graph_lede()}
		url="https://{host}/graf"
		image="https://{host}{siteOgImage(scope)}"
	/>
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} />
	<main id="main-content" tabindex="-1" class="relative mx-auto w-full max-w-6xl flex-1 px-4 pt-6">
		<NavSheet
			nav={{
				groups: nav,
				currentId: 'graf',
				hrefFor: listHref,
				pageHref,
				graphHref,
				statsHref,
				timelineHref
			}}
		/>
		<RecordNav
			groups={nav}
			currentId="graf"
			hrefFor={listHref}
			{pageHref}
			{graphHref}
			{statsHref}
			{timelineHref}
		/>

		<h1 class="mb-1 font-serif text-3xl font-medium text-primary">
			{m.ui_relationship_graph()}
		</h1>
		<p class="mb-4 max-w-xl text-sm text-primary/70">{m.graph_lede()}</p>

		<div class="mb-3 flex flex-wrap gap-1.5">
			{#each entities as entity (entity)}
				<button
					type="button"
					onclick={() => toggleEntity(entity)}
					aria-pressed={!hidden.includes(entity)}
					class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors {hidden.includes(
						entity
					)
						? 'border-primary/10 bg-primary/5 text-primary/40 line-through'
						: 'border-primary/15 bg-white/60 text-primary/80 hover:border-primary/30'}"
				>
					<span
						class="inline-block size-2 rounded-full"
						style:background={ENTITY_COLOR[entity as Entity] ?? '#94a3b8'}
					></span>
					{entityLabel(entity)}
				</button>
			{/each}
		</div>

		<SiteGraph nodes={visNodes} edges={visEdges} hrefFor={nodeHref} {focusId} />
	</main>

	<SiteFooter {scope} wide />
</div>
