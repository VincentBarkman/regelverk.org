<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { siteFavicon, siteHost, type SiteScope } from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';
	import { ENTITY_LABEL, SITE_BLURB, logoDarkClass } from '#lib/meta.js';
	import type { DataRecordRef } from '#lib/data.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import RecordNav from '#lib/components/recordNav.svelte';
	import NavSheet from '#lib/components/navSheet.svelte';
	import BreadCrumbs from '#lib/components/breadCrumbs.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import SearchBar from '#lib/components/searchBar.svelte';
	import * as m from '#lib/paraglide/messages.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import RiSearchLine from 'remixicon-svelte/icons/search-line';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scope = $derived(data.scope as SiteScope);
	const entity = $derived(data.entity as Entity);
	const host = $derived(siteHost(scope));

	const LEDE: Record<Entity, () => string> = {
		lagstiftning: () => m.db_lede_lagstiftning(),
		standarder: () => m.db_lede_standarder(),
		ramverk: () => m.db_lede_ramverk(),
		myndigheter: () => m.db_lede_myndigheter(),
		system: () => m.db_lede_system(),
		krav: () => m.db_lede_krav(),
		implementera: () => m.db_lede_implementera(),
		sakerhet: () => m.db_lede_sakerhet(),
		branscher: () => m.db_lede_branscher(),
		'lar-dig': () => m.db_lede_lar_dig()
	};

	const FILTER_FIELDS = [
		{ key: 'type', label: () => m.meta_type() },
		{ key: 'jurisdiction', label: () => m.meta_jurisdiction() },
		{ key: 'legalStatus', label: () => m.meta_legal_status() },
		{ key: 'status', label: () => m.meta_status() },
		{ key: 'reviewStatus', label: () => m.meta_review_status() }
	] as const;

	const fieldValue = (r: DataRecordRef, key: string): string | undefined => {
		const v = key === 'type' ? (r.meta?.type ?? r.meta?.kind) : r.meta?.[key];
		return typeof v === 'string' && v ? v : undefined;
	};

	const listHref = (ent: Entity, id: string) =>
		dev
			? resolve(
					'/[[site=site]]/[entity=entity]/[...id]',
					scope === 'regelverk' ? { entity: ent, id } : { site: scope, entity: ent, id }
				)
			: `https://${host}/${ent}/${id.split('/').map(encodeURIComponent).join('/')}`;

	const recordHref = (id: string) => listHref(entity, id);

	const pageHref = (slug: string) =>
		dev
			? resolve('/wiki/[...slug]', { slug: `${scope}/pages/${slug}` })
			: `https://${host}/wiki/${scope}/pages/${slug}`;

	const homeHref = () =>
		dev
			? resolve('/[[site=site]]', scope === 'regelverk' ? {} : { site: scope })
			: `https://${host}`;

	const crumbs = $derived([
		{ label: m.nav_home(), href: homeHref() },
		{ label: ENTITY_LABEL[entity]() }
	]);

	let query = $state('');
	let filters = $state<Record<string, string>>({});

	const options = $derived(
		FILTER_FIELDS.map((f) => ({
			...f,
			values: [
				...new Set(
					data.records.map((r) => fieldValue(r, f.key)).filter((v): v is string => Boolean(v))
				)
			].sort()
		})).filter((f) => f.values.length > 0)
	);

	const filtered = $derived(
		data.records.filter((r) => {
			const q = query.trim().toLowerCase();
			if (q) {
				const text = [r.id, r.title, fieldValue(r, 'designation'), fieldValue(r, 'description')]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				if (!text.includes(q)) return false;
			}
			return FILTER_FIELDS.every((f) => !filters[f.key] || fieldValue(r, f.key) === filters[f.key]);
		})
	);

	const metaLine = (r: DataRecordRef) =>
		[fieldValue(r, 'type'), fieldValue(r, 'legalStatus'), fieldValue(r, 'reviewStatus')]
			.filter(Boolean)
			.join(' · ');

	const fmtDate = (value: unknown) => {
		if (typeof value !== 'string' || !value) return undefined;
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
	<title>{ENTITY_LABEL[entity]()} · {host}</title>
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<meta name="description" content={SITE_BLURB[scope]()} />
	<link rel="canonical" href="https://{host}/{entity}" />
	<OgMeta
		title="{ENTITY_LABEL[entity]()} · {host}"
		description={LEDE[entity]()}
		url="https://{host}/{entity}"
	/>
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} active={entity} />
	<main class="relative mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-14 xl:max-w-3xl">
		<NavSheet
			nav={{ groups: data.nav, currentId: '', activeEntity: entity, hrefFor: listHref, pageHref }}
		/>
		<RecordNav groups={data.nav} currentId="" activeEntity={entity} hrefFor={listHref} {pageHref} />

		<BreadCrumbs items={crumbs} />

		<h1 class="mt-3 font-serif text-3xl font-medium text-primary">
			{ENTITY_LABEL[entity]()}
		</h1>
		<p class="mt-1 text-sm text-primary/70">{LEDE[entity]()}</p>

		<div class="mt-5">
			<SearchBar
				inputId="entity-filter-input"
				width="w-full"
				label={m.db_filter_list()}
				staticPlaceholder={m.db_filter_list()}
				typingPhrases={[
					m.db_filter_list(),
					...data.records.slice(0, 5).map((r) => r.title ?? r.id)
				]}
				bind:value={query}
				showSuggestions={false}
				onsubmit={() => document.getElementById('entity-filter-input')?.blur()}
			/>
		</div>

		{#if options.length}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each options as f (f.key)}
					{@const fText = filters[f.key] || `${f.label()} · ${m.db_filter_all()}`}
					<Select.Root
						type="single"
						value={filters[f.key] || 'all'}
						onValueChange={(v: string) => (filters[f.key] = v === 'all' ? '' : v)}
					>
						<Select.Trigger
							size="sm"
							aria-label={filters[f.key] ? `${f.label()}: ${fText}` : fText}
							class="h-8 border-primary/15 bg-white/70 text-xs text-primary/80"
						>
							{fText}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="{f.label()} · {m.db_filter_all()}"
								>{f.label()} · {m.db_filter_all()}</Select.Item
							>
							{#each f.values as v (v)}
								<Select.Item value={v} label={v}>{v}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/each}
			</div>
		{/if}

		<p class="mt-4 text-xs text-primary/60">{m.db_hits({ count: filtered.length })}</p>

		{#if filtered.length}
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<ul class="mt-2 flex flex-col border-t border-primary/10">
				{#each filtered as r (r.id)}
					{@const designation = fieldValue(r, 'designation')}
					{@const description = fieldValue(r, 'description')}
					{@const reviewed = fmtDate(r.meta?.lastReviewed)}
					{@const line = metaLine(r)}
					<li class="border-b border-primary/10 py-4">
						{#if line}
							<p class="text-[11px] text-primary/60">{line}</p>
						{/if}
						<p class="mt-0.5">
							{#if entity === 'myndigheter' && typeof r.meta?.logo === 'string'}
								<img
									src={r.meta.logo}
									alt=""
									class="mr-1.5 inline-block h-4 w-auto align-[-2px] {logoDarkClass(r.meta.logo)}"
								/>
							{/if}
							<a
								href={recordHref(r.id)}
								rel={dev ? undefined : 'external'}
								class="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-[text-decoration-color] hover:decoration-primary"
								>{r.title ?? r.id}</a
							>
							{#if designation}
								<span class="ml-2 text-xs text-primary/60 uppercase">{designation}</span>
							{/if}
						</p>
						{#if description}
							<p class="mt-1 text-sm text-primary/80">{description}</p>
						{/if}
						{#if reviewed}
							<p class="mt-1.5 text-xs text-primary/60">{m.meta_last_reviewed()}: {reviewed}</p>
						{/if}
					</li>
				{/each}
			</ul>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{:else if data.records.length}
			<Empty.Root class="mt-4 border border-dashed border-primary/20">
				<Empty.Header>
					<Empty.Media variant="icon">
						<RiSearchLine />
					</Empty.Media>
					<Empty.Title>{m.db_empty_filtered()}</Empty.Title>
					<Empty.Description>{m.db_empty_filtered_hint()}</Empty.Description>
				</Empty.Header>
				<Empty.Content>
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							query = '';
							filters = {};
						}}>{m.db_clear_filters()}</Button
					>
				</Empty.Content>
			</Empty.Root>
		{:else}
			<p class="mt-4 text-sm text-primary/70">{m.db_empty()}</p>
		{/if}
	</main>

	<SiteFooter {scope} wide />
</div>
