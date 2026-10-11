<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { ENTITY_LABEL, SITE_BLURB } from '#lib/meta.js';
	import { SITES, siteHost, isSiteScope, type SiteScope } from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';
	import type { SearchHit } from '#lib/data.js';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import RecordNav from '#lib/components/recordNav.svelte';
	import NavSheet from '#lib/components/navSheet.svelte';
	import SearchBar from '#lib/components/searchBar.svelte';
	import * as Select from '#lib/components/ui/select/index.js';
	import * as m from '#lib/paraglide/messages.js';
	import RiArrowRightSLine from 'remixicon-svelte/icons/arrow-right-s-line';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scope: SiteScope = 'regelverk';
	const host = siteHost(scope);

	const META_FILTERS = [
		{ key: 'type', label: () => m.meta_type() },
		{ key: 'jurisdiction', label: () => m.meta_jurisdiction() },
		{ key: 'legalStatus', label: () => m.meta_legal_status() },
		{ key: 'status', label: () => m.meta_status() },
		{ key: 'reviewStatus', label: () => m.meta_review_status() }
	] as const;

	const fieldValue = (r: SearchHit, key: string): string | undefined => {
		const v = key === 'type' ? (r.meta?.type ?? r.meta?.kind) : r.meta?.[key];
		return typeof v === 'string' && v ? v : undefined;
	};

	const listHref = (ent: Entity, id: string) =>
		dev
			? resolve('/[[site=site]]/[entity=entity]/[...id]', { entity: ent, id })
			: `https://${host}/${ent}/${id.split('/').map(encodeURIComponent).join('/')}`;

	const pageHref = (slug: string) =>
		dev
			? resolve('/wiki/[...slug]', { slug: `${scope}/pages/${slug}` })
			: `https://${host}/wiki/${scope}/pages/${slug}`;

	let filters = $state<Record<string, string>>({});

	const scopes = $derived(
		[...new Set(data.results.map((r) => r.scope))].filter(isSiteScope).sort()
	);

	const entities = $derived([...new Set(data.results.map((r) => r.entity))].sort() as Entity[]);

	const options = $derived(
		META_FILTERS.map((f) => ({
			...f,
			values: [
				...new Set(
					data.results.map((r) => fieldValue(r, f.key)).filter((v): v is string => Boolean(v))
				)
			].sort()
		})).filter((f) => f.values.length > 0)
	);

	const filtered = $derived(
		data.results.filter(
			(r) =>
				(!filters.scope || r.scope === filters.scope) &&
				(!filters.entity || r.entity === filters.entity) &&
				META_FILTERS.every((f) => !filters[f.key] || fieldValue(r, f.key) === filters[f.key])
		)
	);
</script>

<svelte:head>
	<title>{m.search_label()} · regelverk.org</title>
	<meta name="description" content={SITE_BLURB.regelverk()} />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} />
	<main class="relative mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-14 xl:max-w-3xl">
		<NavSheet
			nav={{ groups: data.nav, currentId: '', hrefFor: listHref, pageHref }}
		/>
		<RecordNav groups={data.nav} currentId="" hrefFor={listHref} {pageHref} />

		<h1 class="mb-4 font-serif text-3xl font-medium text-primary">
			{m.search_label()}
		</h1>

		<div class="max-w-md">
			<SearchBar inputId="search-page-input" initialValue={data.query} width="w-full" />
		</div>

		{#if data.query}
			<p class="mt-5 text-xs text-primary/60">
				{m.search_results_for({ query: data.query })} · {m.db_hits({ count: filtered.length })}
			</p>
		{/if}

		{#if data.results.length && (scopes.length > 1 || entities.length > 1 || options.length)}
			<div class="mt-3 flex flex-wrap gap-2">
				{#if scopes.length > 1}
					<Select.Root
						type="single"
						value={filters.scope || 'all'}
						onValueChange={(v: string) => (filters.scope = v === 'all' ? '' : v)}
					>
						<Select.Trigger
							size="sm"
							aria-label={m.db_filter_area()}
							class="h-8 border-primary/15 bg-white/70 text-xs text-primary/80"
						>
							{filters.scope
								? SITES[filters.scope as SiteScope].label
								: `${m.db_filter_area()} · ${m.db_filter_all()}`}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="{m.db_filter_area()} · {m.db_filter_all()}"
								>{m.db_filter_area()} · {m.db_filter_all()}</Select.Item
							>
							{#each scopes as s (s)}
								<Select.Item value={s} label={SITES[s].label}>{SITES[s].label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
				{#if entities.length > 1}
					<Select.Root
						type="single"
						value={filters.entity || 'all'}
						onValueChange={(v: string) => (filters.entity = v === 'all' ? '' : v)}
					>
						<Select.Trigger
							size="sm"
							aria-label={m.db_filter_category()}
							class="h-8 border-primary/15 bg-white/70 text-xs text-primary/80"
						>
							{filters.entity
								? ENTITY_LABEL[filters.entity as Entity]()
								: `${m.db_filter_category()} · ${m.db_filter_all()}`}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="{m.db_filter_category()} · {m.db_filter_all()}"
								>{m.db_filter_category()} · {m.db_filter_all()}</Select.Item
							>
							{#each entities as e (e)}
								<Select.Item value={e} label={ENTITY_LABEL[e]()}>{ENTITY_LABEL[e]()}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
				{#each options as f (f.key)}
					<Select.Root
						type="single"
						value={filters[f.key] || 'all'}
						onValueChange={(v: string) => (filters[f.key] = v === 'all' ? '' : v)}
					>
						<Select.Trigger
							size="sm"
							aria-label={f.label()}
							class="h-8 border-primary/15 bg-white/70 text-xs text-primary/80"
						>
							{filters[f.key] || `${f.label()} · ${m.db_filter_all()}`}
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

		{#if filtered.length}
			<ul class="mt-2 flex flex-col border-t border-primary/10">
				{#each filtered as r (`${r.scope}/${r.entity}/${r.id}`)}
					<li class="border-b border-primary/10">
						<a
							href={resolve('/wiki/[...slug]', { slug: `${r.scope}/${r.entity}/${r.id}` })}
							class="group flex items-center gap-2 py-3 text-sm"
						>
							<span class="flex min-w-0 flex-col">
								<span
									class="truncate font-medium text-primary underline-offset-4 group-hover:underline"
								>
									{r.title ?? r.id}
								</span>
								{#if r.description}
									<span class="mt-0.5 truncate text-xs text-primary/60">{r.description}</span>
								{/if}
							</span>
							<span class="ml-auto shrink-0 text-xs text-primary/50">{r.scope} / {r.entity}</span>
							<RiArrowRightSLine class="size-4 shrink-0 text-primary/40" aria-hidden="true" />
						</a>
					</li>
				{/each}
			</ul>
		{:else if data.query}
			<p class="mt-6 text-sm text-primary/70">{m.search_no_results()}</p>
		{:else}
			<p class="mt-6 text-sm text-primary/70">{m.db_empty()}</p>
		{/if}
	</main>

	<SiteFooter {scope} wide />
</div>
