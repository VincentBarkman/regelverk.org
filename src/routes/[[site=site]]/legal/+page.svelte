<script lang="ts">
	import { legalHref } from '#lib/legalLinks.js';
	import { siteFavicon, siteHost } from '#lib/sites.js';
	import { LEGAL_LINKS } from '#lib/meta.js';
	import SiteFooter from '#lib/components/siteFooter.svelte';
	import PageHeader from '#lib/components/pageHeader.svelte';
	import OgMeta from '#lib/components/ogMeta.svelte';
	import BreadCrumbs from '#lib/components/breadCrumbs.svelte';
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import * as m from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scope = $derived(data.scope);
	const host = $derived(siteHost(scope));

	const homeHref = $derived(
		dev
			? resolve('/[[site=site]]', scope === 'regelverk' ? {} : { site: scope })
			: `https://${host}`
	);
</script>

<svelte:head>
	<title>{m.ui_legal()} · {host}</title>
	<link rel="icon" type="image/svg+xml" href={siteFavicon(scope)} />
	<link rel="canonical" href="https://{host}/legal" />
	<OgMeta title="{m.ui_legal()} · {host}" description={m.ui_legal()} url="https://{host}/legal" />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-amber-5 flex min-h-svh flex-col">
	<PageHeader {scope} />
	<main class="relative mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-14 xl:max-w-3xl">
		<BreadCrumbs items={[{ label: m.nav_home(), href: homeHref }, { label: m.ui_legal() }]} />
		<h1 class="mt-3 font-serif text-3xl font-medium text-primary">{m.ui_legal()}</h1>

		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<ul class="mt-5 flex flex-col gap-2">
			{#each LEGAL_LINKS as p (p.slug)}
				{@const Icon = p.icon}
				<li>
					<a
						href={legalHref(scope, p.slug)}
						class="flex items-center gap-2.5 rounded-md border border-primary/15 px-4 py-3 text-sm text-primary transition-colors hover:bg-primary/4"
					>
						<Icon class="size-4 shrink-0 text-primary/60" aria-hidden="true" />
						{p.label()}
					</a>
				</li>
			{/each}
		</ul>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</main>

	<SiteFooter {scope} wide />
</div>
