<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { siteFavicon, siteHost, isSiteScope, type SiteScope } from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';
	import { ENTITY_LABEL, ARTICLE_PROSE, SITE_LONG, SITE_BLURB } from '#lib/meta.js';
	import { flatRecords } from '#lib/data.js';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import ArticleToc from '#lib/components/articleToc.svelte';
	import RecordMeta from '#lib/components/recordMeta.svelte';
	import RecordBottom from '#lib/components/recordBottom.svelte';
	import RecordNav from '#lib/components/recordNav.svelte';
	import NavSheet from '#lib/components/navSheet.svelte';
	import BreadCrumbs from '#lib/components/breadCrumbs.svelte';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import LdJson from '#lib/components/ldJson.svelte';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import * as m from '#lib/paraglide/messages.js';
	import RefPreview from '#lib/components/refPreview.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scope = $derived(data.scope as SiteScope);
	const entity = $derived(data.entity as Entity);
	const host = $derived(siteHost(scope));
	const title = $derived(data.record?.title ?? data.id);
	const description = $derived(
		typeof data.record?.meta?.description === 'string' ? data.record.meta.description : undefined
	);

	const tocItems = $derived(data.toc ?? []);

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

	const entityHref = $derived(
		dev
			? resolve(
					'/[[site=site]]/[entity=entity]',
					scope === 'regelverk' ? { entity } : { site: scope, entity }
				)
			: `https://${host}/${entity}`
	);

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

	const toRefLink = (i: (typeof data.nav)[number]['items'][number]): RefLink => ({
		href: listHref(entity, i.id),
		title: i.title ?? i.id,
		logo: entity === 'myndigheter' && typeof i.meta?.logo === 'string' ? i.meta.logo : undefined,
		description: typeof i.meta?.description === 'string' ? i.meta.description : undefined,
		tag: ENTITY_LABEL[entity]()
	});

	const group = $derived(data.nav.find((g) => g.entity === entity)?.items ?? []);

	const parentRef = $derived(
		data.id.includes('/')
			? group.find((i) => i.id === data.id.split('/').slice(0, -1).join('/'))
			: undefined
	);

	const currentItem = $derived(
		parentRef?.children?.find((c) => c.id === data.id) ?? group.find((i) => i.id === data.id)
	);

	const subs = $derived((currentItem?.children ?? []).map(toRefLink));

	const idPath = $derived(data.id.split('/').map(encodeURIComponent).join('/'));
	const canonicalUrl = $derived(`https://${host}/${entity}/${idPath}`);
	const lang = $derived(getLocale() === 'en' ? 'en' : 'sv');

	const crumbs = $derived([
		{ label: m.nav_home(), href: homeHref, url: `https://${host}/` },
		{ label: ENTITY_LABEL[entity](), href: entityHref, url: `https://${host}/${entity}` },
		...(parentRef
			? [
					{
						label: parentRef.title ?? parentRef.id,
						href: listHref(entity, parentRef.id),
						url: `https://${host}/${entity}/${parentRef.id.split('/').map(encodeURIComponent).join('/')}`
					}
				]
			: []),
		{ label: title, href: canonicalUrl, url: canonicalUrl }
	]);

	const jsonLd = $derived.by(() => {
		const meta = recordMeta;
		const main =
			entity === 'lagstiftning'
				? {
						'@type': 'Legislation',
						name: title,
						url: canonicalUrl,
						inLanguage: lang,
						...(typeof meta.legislationType === 'string' || typeof meta.type === 'string'
							? {
									legislationType: String(meta.legislationType ?? meta.type)
								}
							: {}),
						...(typeof meta.jurisdiction === 'string'
							? { legislationJurisdiction: meta.jurisdiction }
							: {}),
						...(meta.designation || meta.sfs || meta.celex
							? {
									legislationIdentifier: String(meta.designation ?? meta.sfs ?? meta.celex)
								}
							: {}),
						...(parentRef
							? {
									isPartOf: {
										'@type': 'Legislation',
										name: parentRef.title ?? parentRef.id,
										url: `https://${host}/${entity}/${parentRef.id.split('/').map(encodeURIComponent).join('/')}`
									}
								}
							: {}),
						...(description ? { description } : {})
					}
				: {
						'@type': 'Article',
						headline: title,
						url: canonicalUrl,
						inLanguage: lang,
						...(description ? { description } : {}),
						isPartOf: { '@type': 'WebSite', name: host, url: `https://${host}` }
					};
		return {
			'@context': 'https://schema.org',
			'@graph': [
				main,
				{
					'@type': 'BreadcrumbList',
					itemListElement: crumbs.map((c, i) => ({
						'@type': 'ListItem',
						position: i + 1,
						name: c.label,
						item: c.url
					}))
				}
			]
		};
	});

	const more = $derived(
		(parentRef ? (parentRef.children ?? []) : group)
			.filter((i) => i.id !== data.id)
			.slice(0, 4)
			.map(toRefLink)
	);

	let articleEl = $state<HTMLElement>();

	let external = $state<Record<string, { title?: string; description?: string }>>({});
	$effect(() => {
		external = {};
		void Promise.resolve(data.external)
			.then((e) => {
				external = e ?? {};
			})
			.catch(() => {});
	});
</script>

<svelte:head>
	<title>{title} · {ENTITY_LABEL[entity]()} · {host}</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang={lang} href={canonicalUrl} />
	{#each (data.locales ?? []).filter((l) => l !== lang) as l (l)}
		<link
			rel="alternate"
			hreflang={l}
			href="https://{host}{l === 'en' ? '/en' : ''}/{entity}/{idPath}"
		/>
	{/each}
	{#if data.locales?.includes('en')}
		<link rel="alternate" hreflang="x-default" href={canonicalUrl} />
	{/if}
	<OgMeta
		type="article"
		title="{title} · {ENTITY_LABEL[entity]()} · {host}"
		description={description ?? SITE_BLURB[scope]()}
		url={canonicalUrl}
	/>
	<LdJson data={jsonLd} />
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} active={entity} />
	<main class="relative mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-14 xl:max-w-3xl">
		<NavSheet nav={{ groups: data.nav, currentId: data.id, hrefFor: listHref, pageHref }} />
		<RecordNav groups={data.nav} currentId={data.id} hrefFor={listHref} {pageHref} />

		{#if data.record}
			<RefPreview />
			<article bind:this={articleEl} class={ARTICLE_PROSE}>
				<BreadCrumbs items={crumbs} />
				<h1>{title}</h1>
				{#if description}
					<p class="not-prose -mt-3 mb-6 text-[15px] leading-relaxed text-primary/60">
						{description}
					</p>
				{/if}
				<ArticleToc rail={false} items={tocItems} />
				{#if data.articleHtml}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html data.articleHtml}
				{/if}
				<RecordMeta meta={data.record.meta} {links} {logos} previews={refs} siteInfo={external} />
				<RecordBottom
					{related}
					{scopes}
					{subs}
					{more}
					moreHref={entityHref}
					moreLabel={m.ui_more_in({ entity: ENTITY_LABEL[entity]() })}
				/>
			</article>
		{/if}

		<ArticleToc article={articleEl} content={data.articleHtml} items={tocItems} />
	</main>

	<SiteFooter {scope} wide />
</div>
