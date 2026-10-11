<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { siteFavicon, siteHost, isSiteScope, type SiteScope } from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';
	import { ENTITY_LABEL, ARTICLE_PROSE, SITE_LONG, SITE_BLURB } from '#lib/meta.js';
	import { articleFor, flatRecords } from '#lib/data.js';
	import { extractHeadings } from '#lib/headings.js';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import ArticleToc from '#lib/components/articleToc.svelte';
	import RecordMeta from '#lib/components/recordMeta.svelte';
	import RecordBottom from '#lib/components/recordBottom.svelte';
	import RecordNav from '#lib/components/recordNav.svelte';
	import NavSheet from '#lib/components/navSheet.svelte';
	import BreadCrumbs from '#lib/components/breadCrumbs.svelte';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import * as m from '#lib/paraglide/messages.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import RecordLink from '#lib/components/recordLink.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scope = $derived((data.ref?.scope ?? 'regelverk') as SiteScope);
	const host = $derived(siteHost(scope));
	const title = $derived(data.record?.title ?? data.ref?.id ?? data.slug);
	const description = $derived(
		typeof data.record?.meta?.description === 'string' ? data.record.meta.description : undefined
	);
	const Article = $derived(data.ref ? articleFor(data.ref.entity, data.ref.id) : undefined);
	const tocItems = $derived(extractHeadings(data.record?.body ?? ''));

	const listHref = (ent: Entity, id: string) =>
		dev
			? resolve(
					'/[[site=site]]/[entity=entity]/[...id]',
					scope === 'regelverk' ? { entity: ent, id } : { site: scope, entity: ent, id }
				)
			: `https://${host}/${ent}/${id.split('/').map(encodeURIComponent).join('/')}`;

	const homeHref = $derived(
		dev
			? resolve('/[[site=site]]', scope === 'regelverk' ? {} : { site: scope })
			: `https://${host}`
	);

	const entityHref = (ent: Entity) =>
		dev
			? resolve(
					'/[[site=site]]/[entity=entity]',
					scope === 'regelverk' ? { entity: ent } : { site: scope, entity: ent }
				)
			: `https://${host}/${ent}`;

	const pageHref = (slug: string) =>
		dev
			? resolve('/wiki/[...slug]', { slug: `${scope}/pages/${slug}` })
			: `https://${host}/wiki/${scope}/pages/${slug}`;

	const refKeys = (r: { id: string; meta: Record<string, unknown> | null }) =>
		[
			r.id,
			r.meta?.name,
			r.meta?.short,
			r.meta?.designation,
			...(Array.isArray(r.meta?.aliases) ? r.meta.aliases : [])
		].filter((k): k is string => typeof k === 'string' && !!k);

	const links = $derived.by(() => {
		const map: Record<string, string> = {};
		for (const g of data.nav)
			for (const i of flatRecords(g.items))
				for (const k of refKeys(i)) if (!(k in map)) map[k] = listHref(g.entity, i.id);
		return map;
	});

	const logos = $derived.by(() => {
		const map: Record<string, string> = {};
		for (const g of data.nav)
			for (const i of flatRecords(g.items))
				if (g.entity === 'myndigheter' && typeof i.meta?.logo === 'string')
					for (const k of refKeys(i)) if (!(k in map)) map[k] = i.meta.logo;
		return map;
	});

	type RefLink = {
		href: string;
		title: string;
		logo?: string;
		description?: string;
		tag?: string;
	};

	const refs = $derived.by(() => {
		const map: Record<string, RefLink> = {};
		for (const g of data.nav)
			for (const i of flatRecords(g.items))
				for (const k of refKeys(i))
					if (!(k in map))
						map[k] = {
							href: listHref(g.entity, i.id),
							title: i.title ?? i.id,
							logo:
								g.entity === 'myndigheter' && typeof i.meta?.logo === 'string'
									? i.meta.logo
									: undefined,
							description: typeof i.meta?.description === 'string' ? i.meta.description : undefined,
							tag: ENTITY_LABEL[g.entity]()
						};
		return map;
	});

	const sourceCard = (s: (typeof data.sources)[number]) => ({
		title: s.title ?? s.id,
		description: typeof s.meta?.description === 'string' ? s.meta.description : undefined,
		logo: s.entity === 'myndigheter' && typeof s.meta?.logo === 'string' ? s.meta.logo : undefined,
		tag: ENTITY_LABEL[s.entity as Entity]()
	});

	const recordMeta = $derived(data.record?.meta ?? {});

	const related = $derived(
		(Array.isArray(recordMeta.related) ? recordMeta.related : [])
			.map((v) => refs[String(v)])
			.filter(Boolean)
	);

	const siteHref = (s: SiteScope) =>
		dev
			? resolve('/[[site=site]]', s === 'regelverk' ? {} : { site: s })
			: `https://${siteHost(s)}`;

	const scopes = $derived(
		[
			scope,
			...(Array.isArray(recordMeta.sites) ? recordMeta.sites : []).filter(
				(s): s is SiteScope => isSiteScope(s) && s !== scope
			)
		].map((s) => ({
			href: siteHref(s),
			title: s === 'regelverk' ? m.site_long_regelverk() : SITE_LONG[s]()
		}))
	);

	const group = $derived(
		data.ref?.entity ? (data.nav.find((g) => g.entity === data.ref?.entity)?.items ?? []) : []
	);

	const parentRef = $derived(
		data.ref?.id.includes('/')
			? group.find((i) => i.id === data.ref?.id.split('/').slice(0, -1).join('/'))
			: undefined
	);

	const currentItem = $derived(
		parentRef?.children?.find((c) => c.id === data.ref?.id) ??
			group.find((i) => i.id === data.ref?.id)
	);

	const toRefLink = (i: (typeof group)[number], e: Entity): RefLink => ({
		href: listHref(e, i.id),
		title: i.title ?? i.id,
		logo: e === 'myndigheter' && typeof i.meta?.logo === 'string' ? i.meta.logo : undefined,
		description: typeof i.meta?.description === 'string' ? i.meta.description : undefined,
		tag: ENTITY_LABEL[e]()
	});

	const subs = $derived(
		data.ref?.entity && data.ref.entity !== 'pages'
			? (currentItem?.children ?? []).map((i) => toRefLink(i, data.ref!.entity as Entity))
			: []
	);

	const more = $derived.by(() => {
		const e = data.ref?.entity;
		if (!e) return [];
		if (e === 'pages')
			return data.pages
				.filter((i) => i.id !== data.ref?.id)
				.slice(0, 4)
				.map((i) => ({ href: pageHref(i.id), title: i.title ?? i.id }));
		return (parentRef ? (parentRef.children ?? []) : group)
			.filter((i) => i.id !== data.ref?.id)
			.slice(0, 4)
			.map((i) => toRefLink(i, e as Entity));
	});

	const moreLabel = $derived(
		data.ref?.entity && data.ref.entity !== 'pages'
			? m.ui_more_in({ entity: ENTITY_LABEL[data.ref.entity]() })
			: m.ui_more_pages()
	);
	const moreHref = $derived(
		data.ref?.entity && data.ref.entity !== 'pages' ? entityHref(data.ref.entity) : undefined
	);

	const dateOf = (meta: Record<string, unknown> | null): string => {
		const v = meta?.lastReviewed ?? meta?.published;
		return typeof v === 'string' ? v : '';
	};

	let articleEl = $state<HTMLElement>();
</script>

<svelte:head>
	<title>{title} · {host}</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	{#if data.ref}
		{#if data.ref.entity !== 'pages'}
			<meta name="description" content="{scope} / {ENTITY_LABEL[data.ref.entity]()}" />
		{/if}
		<link
			rel="canonical"
			href="https://{host}/{data.ref.entity}/{encodeURIComponent(data.ref.id)}"
		/>
	{/if}
	<OgMeta
		type="article"
		title="{title} · {host}"
		description={description ?? SITE_BLURB[scope]()}
		url={data.ref
			? `https://${host}/${data.ref.entity}/${encodeURIComponent(data.ref.id)}`
			: `https://${host}`}
	/>
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} active={data.ref?.entity as Entity | undefined} />
	<main class="relative mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-14 xl:max-w-3xl">
		{#if data.ref}
			<NavSheet nav={{ groups: data.nav, currentId: data.ref.id, hrefFor: listHref, pageHref }} />
			<RecordNav groups={data.nav} currentId={data.ref.id} hrefFor={listHref} {pageHref} />
		{/if}

		{#if data.record}
			<article bind:this={articleEl} class={ARTICLE_PROSE}>
				{#if data.ref}
					<BreadCrumbs
						items={[
							{ label: m.nav_home(), href: homeHref },
							...(data.ref.entity === 'pages'
								? []
								: [
										{
											label: ENTITY_LABEL[data.ref.entity](),
											href: entityHref(data.ref.entity)
										}
									]),
							...(parentRef
								? [
										{
											label: parentRef.title ?? parentRef.id,
											href: listHref(data.ref.entity as Entity, parentRef.id)
										}
									]
								: []),
							{ label: title }
						]}
					/>
				{/if}
				<h1>{title}</h1>
				{#if description}
					<p class="not-prose -mt-3 mb-6 text-[15px] leading-relaxed text-primary/60">
						{description}
					</p>
				{/if}
				<ArticleToc rail={false} items={tocItems} />
				{#if Article}
					<Article />
				{:else}
					<pre class="text-xs whitespace-pre-wrap">{data.record.body}</pre>
				{/if}

				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				{#if data.ref?.entity === 'pages' && data.ref.id === 'uppdateringar' && data.updates?.length}
					<ol class="not-prose mt-6 flex flex-col border-t border-primary/10">
						{#each data.updates as u (u.entity + u.id)}
							<li class="border-b border-primary/10 py-3">
								<p class="text-[11px] text-primary/50">
									{dateOf(u.meta)}
									<span class="mx-1.5 text-primary/30">·</span>{ENTITY_LABEL[u.entity as Entity]()}
								</p>
								<p class="mt-0.5">
									<a
										href={listHref(u.entity as Entity, u.id)}
										rel={dev ? undefined : 'external'}
										class="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
										>{u.title ?? u.id}</a
									>
								</p>
								{#if typeof u.meta?.description === 'string'}
									<p class="mt-1 text-sm text-primary/70">{u.meta.description}</p>
								{/if}
							</li>
						{/each}
					</ol>
				{:else if data.ref?.entity === 'pages' && data.ref.id === 'kallor' && data.sources?.length}
					{#snippet sourceValue(src: string)}
						{@const ref = refs[src]}
						{#if ref}
							<RecordLink
								href={ref.href}
								card={ref}
								class="underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
								>{ref.title}</RecordLink
							>
						{:else if src.startsWith('http')}
							<RecordLink
								href={src}
								card={{ title: src.replace(/^https?:\/\//, ''), description: src, external: true }}
								class="underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
								>{src.replace(/^https?:\/\//, '')}</RecordLink
							>
						{:else}
							{src}
						{/if}
					{/snippet}
					<div class="not-prose mt-6 hidden rounded-md border border-primary/15 sm:block">
						<Table.Root class="table-fixed">
							<Table.Header class="bg-primary/5">
								<Table.Row class="hover:bg-transparent">
									<Table.Head class="w-[45%]">{m.meta_source()}</Table.Head>
									<Table.Head>{m.meta_issuer()}</Table.Head>
									<Table.Head class="w-40">{m.meta_source_checked()}</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.sources as s (s.entity + s.id)}
									{@const src = String(s.meta?.source ?? s.meta?.url ?? '')}
									<Table.Row>
										<Table.Cell class="truncate">
											<RecordLink
												href={listHref(s.entity as Entity, s.id)}
												card={sourceCard(s)}
												class="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
												>{s.title ?? s.id}</RecordLink
											>
											<span class="ml-1.5 text-[11px] text-primary/45"
												>{ENTITY_LABEL[s.entity as Entity]()}</span
											>
										</Table.Cell>
										<Table.Cell class="truncate text-primary/70">
											{@render sourceValue(src)}
										</Table.Cell>
										<Table.Cell class="truncate text-primary/60">
											{typeof s.meta?.sourceChecked === 'string' ? s.meta.sourceChecked : '–'}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
					<ul class="not-prose mt-6 flex flex-col gap-2 sm:hidden">
						{#each data.sources as s (s.entity + s.id)}
							{@const src = String(s.meta?.source ?? s.meta?.url ?? '')}
							<li class="rounded-md border border-primary/15 px-3 py-2.5">
								<p class="truncate">
									<RecordLink
										href={listHref(s.entity as Entity, s.id)}
										card={sourceCard(s)}
										class="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
										>{s.title ?? s.id}</RecordLink
									>
								</p>
								<p class="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-primary/55">
									<span class="shrink-0">{ENTITY_LABEL[s.entity as Entity]()}</span>
									<span class="truncate text-right">{@render sourceValue(src)}</span>
								</p>
								<p class="mt-0.5 text-[11px] text-primary/45">
									{m.meta_source_checked()}: {typeof s.meta?.sourceChecked === 'string'
										? s.meta.sourceChecked
										: '–'}
								</p>
							</li>
						{/each}
					</ul>
				{:else if data.ref?.entity === 'pages' && data.ref.id === 'andringslogg' && data.commits?.length}
					<ol class="not-prose mt-6 flex flex-col">
						{#each data.commits as c (c.hash)}
							<li class="relative border-l border-primary/15 pb-6 pl-7 last:pb-0">
								<span
									class="absolute top-1.5 -left-1.25 size-2.5 rounded-full bg-primary/70 ring-4 ring-background"
								></span>
								<p class="flex flex-wrap items-baseline gap-x-2">
									<a
										href="https://github.com/VincentBarkman/regelverk.org/commit/{c.hash}"
										target="_blank"
										rel="noopener noreferrer"
										class="rounded bg-primary/8 px-1.5 py-px font-mono text-[11px] text-primary/70 hover:bg-primary/15"
										>{c.hash}</a
									>
									<span class="text-[11px] text-primary/45">{c.date}</span>
								</p>
								<p class="mt-1 text-sm text-primary/80">{c.message}</p>
							</li>
						{/each}
					</ol>
				{/if}
				<!-- eslint-enable svelte/no-navigation-without-resolve -->

				<RecordMeta
					meta={data.record.meta}
					{links}
					{logos}
					previews={refs}
					siteInfo={data.external ?? {}}
				/>
				<RecordBottom {related} {scopes} {subs} {more} {moreHref} {moreLabel} />
			</article>
		{:else}
			<h1 class="mb-4 font-serif text-3xl font-medium text-primary">{data.slug}</h1>
			<p class="text-sm text-primary/70">{m.wiki_empty()}</p>
		{/if}

		<ArticleToc article={articleEl} content={Article} items={tocItems} />
	</main>

	<SiteFooter {scope} wide />
</div>
