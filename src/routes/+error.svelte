<script lang="ts">
	import { browser, dev } from '$app/env';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizeHref } from '#lib/paraglide/runtime.js';
	import { isSiteScope, siteHost, SITES } from '#lib/sites.js';
	import { entityLabel } from '#lib/meta.js';
	import type { Entity } from '#lib/entities.js';
	import SearchBar from '#lib/components/searchBar.svelte';
	import RecordLink from '#lib/components/recordLink.svelte';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as m from '#lib/paraglide/messages.js';

	const notFound = $derived(page.status === 404);
	const title = $derived(notFound ? m.err_not_found_title() : m.err_generic_title());
	const description = $derived(notFound ? m.err_not_found_desc() : m.err_generic_desc());

	type Suggestion = {
		href: string;
		title: string;
		card: { title: string; description?: string; tag?: string };
	};
	const MAX_SUGGESTIONS = 4;
	let suggestions = $state<Suggestion[]>([]);

	const hitHref = (h: { scope: string; entity: string; id: string }) =>
		localizeHref(
			dev
				? isSiteScope(h.scope) && h.scope !== 'regelverk'
					? resolve('/[[site=site]]/[entity=entity]/[...id]', {
							site: h.scope,
							entity: h.entity as Entity,
							id: h.id
						})
					: resolve('/[[site=site]]/[entity=entity]/[...id]', {
							entity: h.entity as Entity,
							id: h.id
						})
				: `https://${isSiteScope(h.scope) ? siteHost(h.scope) : siteHost('regelverk')}/${h.entity}/${h.id
						.split('/')
						.map(encodeURIComponent)
						.join('/')}`
		);

	$effect(() => {
		if (!browser || !notFound) {
			suggestions = [];
			return;
		}
		const segments = page.url.pathname.split('/').filter((s) => s && s !== 'en');
		const q = segments.slice(-2).join(' ').replace(/[-_]/g, ' ').trim();
		if (q.length < 2) {
			suggestions = [];
			return;
		}
		const url = page.url;
		fetch(`/api/wiki/search?q=${encodeURIComponent(q)}`)
			.then(async (r) => {
				if (!r.ok) return;
				const d = (await r.json()) as {
					results?: {
						scope: string;
						entity: string;
						id: string;
						title: string;
						description?: string;
					}[];
				};
				if (page.url !== url) return;
				suggestions = (d.results ?? []).slice(0, MAX_SUGGESTIONS).map((h) => ({
					href: hitHref(h),
					title: h.title,
					card: {
						title: h.title,
						description: h.description,
						tag: `${entityLabel(h.entity)} · ${SITES[h.scope as keyof typeof SITES]?.label ?? h.scope}`
					}
				}));
			})
			.catch(() => {});
	});
</script>

<svelte:head>
	<title>{page.status} · {title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="relative flex min-h-svh items-center justify-center px-4 pb-20">
	<Empty.Root class="border-0">
		<Empty.Header>
			<Empty.Title class="font-serif text-3xl font-medium">
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={localizeHref(resolve('/[[site=site]]', {}))}
					class="underline-offset-4 hover:underline">{page.status} – {title}</a
				>
			</Empty.Title>
			<Empty.Description>{description}</Empty.Description>
		</Empty.Header>
		<Empty.Content>
			<SearchBar
				inputId="error-search"
				width="w-full sm:w-80"
				enableTyper={false}
				staticPlaceholder={m.err_search_placeholder()}
			/>
			<Empty.Description>
				{m.err_need_help()}
				<a
					href="https://github.com/VincentBarkman/regelverk.org/issues/new"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary underline underline-offset-4 hover:decoration-primary/60"
					>{m.err_open_issue()}</a
				>
			</Empty.Description>
		</Empty.Content>
	</Empty.Root>
	{#if suggestions.length}
		<footer class="absolute inset-x-0 bottom-0 px-4 py-4">
			<div class="mx-auto flex max-w-4xl flex-col items-center gap-2">
				<span class="text-xs font-medium tracking-wide text-primary/60 uppercase">
					{m.search_did_you_mean()}
				</span>
				<ul
					class="flex max-w-full items-baseline justify-center gap-x-5 overflow-hidden whitespace-nowrap"
				>
					{#each suggestions as s (s.href)}
						<li class="shrink-0">
							<RecordLink
								href={s.href}
								card={s.card}
								cardSide="top"
								class="block max-w-48 truncate text-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
								>{s.title}</RecordLink
							>
						</li>
					{/each}
				</ul>
			</div>
		</footer>
	{/if}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</div>
