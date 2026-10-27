<script lang="ts">
	import { dev, browser } from '$app/env';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizeHref } from '#lib/paraglide/runtime.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import RiSearchLine from 'remixicon-svelte/icons/search-line';
	import RiHome4Line from 'remixicon-svelte/icons/home-4-line';
	import RiNodeTree from 'remixicon-svelte/icons/node-tree';
	import RiBarChart2Line from 'remixicon-svelte/icons/bar-chart-2-line';
	import RiTimeLine from 'remixicon-svelte/icons/time-line';
	import RiBookmarkLine from 'remixicon-svelte/icons/bookmark-line';
	import RiArrowRightSLine from 'remixicon-svelte/icons/arrow-right-s-line';
	import { entityIcon, entityLabel } from '#lib/meta.js';
	import { SITES, siteHost, type SiteScope } from '#lib/sites.js';
	import * as m from '#lib/paraglide/messages.js';

	let { scope }: { scope: SiteScope } = $props();

	type ArticleSearchResult = {
		id: string;
		slug: string;
		title: string;
		description: string;
		entity: string;
		scope: SiteScope;
	};

	let open = $state(false);
	let query = $state('');
	let results = $state<ArticleSearchResult[]>([]);
	let searching = $state(false);

	const host = $derived(siteHost(scope));
	const scopedHref = (path: string) =>
		localizeHref(
			dev ? `${scope === 'regelverk' ? '' : `/${scope}`}${path}` : `https://${host}${path}`
		);

	const actions = $derived([
		{
			icon: RiSearchLine,
			label: m.palette_open_search(),
			href: scopedHref('/search')
		},
		{
			icon: RiNodeTree,
			label: m.ui_relationship_graph(),
			href: scopedHref('/graf')
		},
		{
			icon: RiBarChart2Line,
			label: m.nav_stats(),
			href: scopedHref('/statistik')
		},
		{
			icon: RiTimeLine,
			label: m.nav_timeline(),
			href: scopedHref('/tidslinje')
		},
		{
			icon: RiBookmarkLine,
			label: m.bookmarks_title(),
			href: scopedHref('/#bokmarken')
		},
		{
			icon: RiHome4Line,
			label: m.palette_go_home(),
			href: scopedHref('/')
		}
	]);

	function run(href: string) {
		open = false;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(href);
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			open = !open;
		}
	}

	let lastQuery = '';
	let debounceHandle: ReturnType<typeof setTimeout> | null = null;

	async function fetchResults(q: string) {
		try {
			const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(q)}`);
			if (!res.ok) throw new Error(String(res.status));
			const data = (await res.json()) as { results?: ArticleSearchResult[] };
			results = data.results ?? [];
		} catch {
			results = [];
		} finally {
			searching = false;
		}
	}

	$effect(() => {
		if (!browser || !open) return;
		const q = query.trim();
		if (q === lastQuery) return;
		lastQuery = q;
		if (debounceHandle) clearTimeout(debounceHandle);
		if (q.length < 2) {
			results = [];
			searching = false;
			return;
		}
		searching = true;
		debounceHandle = setTimeout(() => fetchResults(q), 160);
	});

	$effect(() => {
		if (!open) {
			query = '';
			results = [];
			lastQuery = '';
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<Command.Dialog
	bind:open
	shouldFilter={false}
	title={m.palette_title()}
	description={m.palette_description()}
>
	<Command.Input bind:value={query} placeholder={m.search_placeholder()} />
	<Command.List class="max-h-80">
		{#if query.trim().length >= 2}
			{#if searching}
				<Command.Empty>{m.search_searching()}</Command.Empty>
			{:else if results.length === 0}
				<Command.Empty>{m.search_no_results()}</Command.Empty>
			{/if}
			{#if results.length}
				<Command.Group heading={m.palette_records()}>
					{#each results.slice(0, 7) as item (item.id)}
						{@const Icon = entityIcon(item.entity)}
						<Command.Item
							value={item.slug}
							onSelect={() => run(localizeHref(resolve('/wiki/[...slug]', { slug: item.slug })))}
						>
							<Icon class="size-4 text-primary/60" aria-hidden="true" />
							<span class="flex min-w-0 flex-1 flex-col">
								<span class="truncate text-sm">{item.title}</span>
								<span class="truncate text-[11px] text-primary/50"
									>{entityLabel(item.entity)} · {SITES[item.scope]?.label ?? item.scope}</span
								>
							</span>
						</Command.Item>
					{/each}
				</Command.Group>
			{/if}
			<Command.Item
				value="__search__"
				onSelect={() => run(localizeHref(`/search?search=${encodeURIComponent(query.trim())}`))}
			>
				<RiSearchLine class="size-4 text-primary/60" aria-hidden="true" />
				<span class="text-sm">{m.search_results_for({ query: query.trim() })}</span>
				<Command.Shortcut><RiArrowRightSLine class="size-3.5" /></Command.Shortcut>
			</Command.Item>
		{:else}
			<Command.Group heading={m.palette_actions()}>
				{#each actions as action (action.href)}
					<Command.Item value={action.label} onSelect={() => run(action.href)}>
						<action.icon class="size-4 text-primary/60" aria-hidden="true" />
						<span class="text-sm">{action.label}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>
