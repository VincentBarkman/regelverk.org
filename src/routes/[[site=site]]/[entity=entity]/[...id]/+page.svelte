<script lang="ts">
	import { dev, browser } from '$app/env';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizeHref, setLocale } from '#lib/paraglide/runtime.js';
	import {
		SITE_COLOR,
		siteFavicon,
		siteAppleIcon,
		siteOgImage,
		siteHost,
		isSiteScope,
		type SiteScope
	} from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';
	import {
		ENTITY_LABEL,
		ARTICLE_PROSE,
		SITE_LONG,
		SITE_BLURB,
		siteTitle,
		entityLabel
	} from '#lib/meta.js';
	import { flatRecords, type DataRecordRef } from '#lib/data.js';
	import { recordOgPath } from '#lib/og.js';
	import { getNav, type NavGroup } from '#lib/navStore.js';
	import { diffLines } from '#lib/diff.js';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import ArticleToc from '#lib/components/articleToc.svelte';
	import RecordMeta from '#lib/components/recordMeta.svelte';
	import RecordBottom from '#lib/components/recordBottom.svelte';
	import RecordNav from '#lib/components/recordNav.svelte';
	import NavSheet from '#lib/components/navSheet.svelte';
	import BreadCrumbs from '#lib/components/breadCrumbs.svelte';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import ShareButton from '#lib/components/shareButton.svelte';
	import CiteButton from '#lib/components/citeButton.svelte';
	import BookmarkButton from '#lib/components/bookmarkButton.svelte';
	import RiTranslate2 from 'remixicon-svelte/icons/translate-2';

	import DiffView from '#lib/components/diffView.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import LdJson from '#lib/components/ldJson.svelte';
	import { getLocaleForUrl } from '#lib/paraglide/runtime.js';
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

	let nav = $state<NavGroup[]>([]);
	$effect(() => {
		nav = [];
		void getNav(data.scope).then((g) => (nav = g));
	});

	const listHref = (ent: Entity, id: string) =>
		localizeHref(
			dev
				? resolve(
						'/[[site=site]]/[entity=entity]/[...id]',
						scope === 'regelverk' ? { entity: ent, id } : { site: scope, entity: ent, id }
					)
				: `https://${host}/${ent}/${id.split('/').map(encodeURIComponent).join('/')}`
		);

	const homeHref = $derived(
		localizeHref(
			dev
				? resolve('/[[site=site]]', scope === 'regelverk' ? {} : { site: scope })
				: `https://${host}`
		)
	);

	const entityHref = $derived(
		localizeHref(
			dev
				? resolve(
						'/[[site=site]]/[entity=entity]',
						scope === 'regelverk' ? { entity } : { site: scope, entity }
					)
				: `https://${host}/${entity}`
		)
	);

	const pageHref = (slug: string) =>
		localizeHref(
			dev
				? resolve('/wiki/[...slug]', { slug: `${scope}/pages/${slug}` })
				: `https://${host}/wiki/${scope}/pages/${slug}`
		);

	const graphHref = $derived(
		`${localizeHref(
			dev
				? resolve('/[[site=site]]/graf', scope === 'regelverk' ? {} : { site: scope })
				: `https://${host}/graf`
		)}?fokus=${encodeURIComponent(data.id)}`
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
		for (const g of nav)
			for (const i of flatRecords(g.items))
				for (const k of refKeys(i)) if (!(k in map)) map[k] = listHref(g.entity, i.id);
		return map;
	});

	const logos = $derived.by(() => {
		const map: Record<string, string> = {};
		for (const g of nav)
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
		for (const g of nav)
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

	const toRefLink = (i: DataRecordRef): RefLink => ({
		href: listHref(entity, i.id),
		title: i.title ?? i.id,
		logo: entity === 'myndigheter' && typeof i.meta?.logo === 'string' ? i.meta.logo : undefined,
		description: typeof i.meta?.description === 'string' ? i.meta.description : undefined,
		tag: ENTITY_LABEL[entity]()
	});

	const group = $derived(nav.find((g) => g.entity === entity)?.items ?? []);

	const parentRef = $derived(
		data.id.includes('/')
			? group.find((i) => i.id === data.id.split('/').slice(0, -1).join('/'))
			: undefined
	);

	const currentItem = $derived(
		parentRef?.children?.find((c) => c.id === data.id) ?? group.find((i) => i.id === data.id)
	);

	const subs = $derived((currentItem?.children ?? []).map(toRefLink));

	const baseId = $derived(
		data.id.includes('/') ? data.id.split('/').slice(0, -1).join('/') : data.id
	);

	const versionLinks = $derived([
		// on a version page, offer comparing back to the parent record
		...(data.isVersion && data.id !== baseId
			? [
					{
						href: listHref(entity, baseId),
						title: parentRef?.title ?? baseId,
						version: undefined,
						published: undefined,
						status: undefined,
						diffHref: `?diff=${encodeURIComponent(baseId)}`
					}
				]
			: []),
		...(data.versions ?? []).map((v) => ({
			href: listHref(entity, v.id),
			title: v.title,
			version: v.version,
			published: v.published,
			status: v.status,
			diffHref: `?diff=${encodeURIComponent(v.id)}`
		}))
	]);

	const diffData = $derived.by(() => {
		const diffParam = browser ? page.url.searchParams.get('diff') : null;
		if (!diffParam || !data.rawBody) return null;
		const otherId =
			data.versionBodies?.[diffParam] || diffParam.includes('/')
				? diffParam
				: `${baseId}/${diffParam}`;
		const other = data.versionBodies?.[otherId];
		if (!other) return null;
		const lines = diffLines(data.rawBody, other.body);
		if (!lines) return null;
		return {
			a: { id: data.id, title },
			b: { id: otherId, title: other.title },
			lines
		};
	});

	const referencedByLinks = $derived(
		(data.referencedBy ?? []).map((r) => ({
			href: listHref(r.entity as Entity, r.id),
			title: r.title,
			description: refs[r.id]?.description,
			tag: entityLabel(r.entity)
		}))
	);

	const idPath = $derived(data.id.split('/').map(encodeURIComponent).join('/'));
	const canonicalHost = $derived(
		isSiteScope(data.record?.home) ? siteHost(data.record.home as SiteScope) : host
	);
	const canonicalUrl = $derived(localizeHref(`https://${canonicalHost}/${entity}/${idPath}`));
	const ogImage = $derived(
		`https://${canonicalHost}${recordOgPath(scope, entity, data.id) ?? siteOgImage(scope)}`
	);
	const lang = $derived(getLocaleForUrl(page.url.href) === 'en' ? 'en' : 'sv');

	const crumbs = $derived([
		{ label: m.nav_home(), href: homeHref, url: `https://${canonicalHost}/` },
		{
			label: ENTITY_LABEL[entity](),
			href: entityHref,
			url: `https://${canonicalHost}/${entity}`
		},
		...(parentRef
			? [
					{
						label: parentRef.title ?? parentRef.id,
						href: listHref(entity, parentRef.id),
						url: `https://${canonicalHost}/${entity}/${parentRef.id.split('/').map(encodeURIComponent).join('/')}`
					}
				]
			: []),
		{ label: title, href: canonicalUrl, url: canonicalUrl }
	]);

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
	<title>{title} · {ENTITY_LABEL[entity]()} · {siteTitle(scope)}</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<meta name="theme-color" content={SITE_COLOR[scope]} />
	<link rel="apple-touch-icon" href={siteAppleIcon(scope)} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang={lang} href={canonicalUrl} />
	{#each (data.locales ?? []).filter((l) => l !== lang) as l (l)}
		<link
			rel="alternate"
			hreflang={l}
			href="https://{canonicalHost}{l === 'en' ? '/en' : ''}/{entity}/{idPath}"
		/>
	{/each}
	{#if data.locales?.includes('sv')}
		<link rel="alternate" hreflang="x-default" href="https://{canonicalHost}/{entity}/{idPath}" />
	{/if}
	<OgMeta
		type="article"
		title="{title} · {ENTITY_LABEL[entity]()} · {siteTitle(scope)}"
		description={description ?? SITE_BLURB[scope]()}
		url={canonicalUrl}
		image={ogImage}
	/>
	<LdJson json={data.ldJson} />
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} active={entity} />
	<main
		id="main-content"
		tabindex="-1"
		class="relative mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-14 xl:max-w-3xl"
	>
		<NavSheet
			nav={{
				groups: nav,
				currentId: data.id,
				hrefFor: listHref,
				pageHref,
				graphHref,
				statsHref,
				timelineHref
			}}
		/>
		<RecordNav
			groups={nav}
			currentId={data.id}
			hrefFor={listHref}
			{pageHref}
			{graphHref}
			{statsHref}
			{timelineHref}
		/>

		{#if data.record}
			<RefPreview />
			<article bind:this={articleEl} class={ARTICLE_PROSE}>
				<div class="flex items-start justify-between gap-4">
					<BreadCrumbs items={crumbs} />
					<span class="flex shrink-0 items-center gap-1">
						<BookmarkButton {scope} {entity} id={data.id} {title} />
						<CiteButton {title} meta={data.record?.meta ?? null} url={canonicalUrl} />
						<ShareButton url={canonicalUrl} {title} />
					</span>
				</div>
				<h1>{title}</h1>
				{#if description}
					<p class="not-prose -mt-3 mb-6 text-[15px] leading-relaxed text-primary/60">
						{description}
					</p>
				{/if}
				{#if lang === 'en' && !(data.locales ?? []).includes('en')}
					<p
						class="not-prose mb-6 flex items-center gap-2 rounded-md border border-primary/15 bg-primary/4 px-3 py-2 text-xs text-primary/70"
					>
						<RiTranslate2 class="size-3.5 shrink-0" aria-hidden="true" />
						<span>{m.i18n_fallback_notice()}</span>
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<a
							href={localizeHref(page.url.pathname, { locale: 'sv' })}
							onclick={() => setLocale('sv', { reload: false })}
							class="font-medium underline underline-offset-2 hover:text-primary"
							>{m.i18n_fallback_sv_link()}</a
						>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</p>
				{/if}
				<ArticleToc rail={false} items={tocItems} />
				{#if diffData}
					<DiffView a={diffData.a} b={diffData.b} lines={diffData.lines} />
				{:else if data.articleHtml}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html data.articleHtml}
				{/if}
				<RecordMeta meta={data.record.meta} {links} {logos} previews={refs} siteInfo={external} />
				<RecordBottom
					{related}
					referencedBy={referencedByLinks}
					versions={versionLinks}
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
