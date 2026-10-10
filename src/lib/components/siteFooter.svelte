<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { getLocale, locales, setLocale } from '#lib/paraglide/runtime.js';
	import { LEGAL_LABEL } from '#lib/meta.js';
	import { siteHost, type SiteScope } from '#lib/sites.js';

	let { scope }: { scope: SiteScope } = $props();

	const LEGAL_PAGES = ['privacy', 'terms', 'disclaimer'] as const;
</script>

<footer
	class="sticky bottom-0 w-full max-w-2xl mx-auto px-4 pt-2 pb-4 flex items-center justify-between gap-3 flex-wrap text-xs text-primary/60 bg-amber-5/80 backdrop-blur-sm"
>
	<p class="flex items-center gap-1.5 flex-wrap">
		<a
			target="_blank"
			rel="noopener noreferrer"
			href="https://www.gnu.org/licenses/agpl-3.0.html"
			class="underline-offset-4 hover:underline">AGPL-3.0</a
		>
		<span class="select-none" aria-hidden="true">·</span>
		<a
			target="_blank"
			rel="noopener noreferrer"
			href="https://github.com/VincentBarkman/regelverk.org"
			class="underline-offset-4 hover:underline">GitHub</a
		>
		{#each LEGAL_PAGES as page (page)}
			<span class="select-none" aria-hidden="true">·</span>
			{#if dev}
				<a
					href={resolve(
						'/[[site=site]]/legal/[page=legal]',
						scope === 'regelverk' ? { page } : { site: scope, page }
					)}
					class="underline-offset-4 hover:underline">{LEGAL_LABEL[page]()}</a
				>
			{:else}
				<a href={`https://${siteHost(scope)}/legal/${page}`} rel="external" class="underline-offset-4 hover:underline"
					>{LEGAL_LABEL[page]()}</a
				>
			{/if}
		{/each}
	</p>
	<p class="flex items-center gap-1.5">
		{#each locales as loc, i (loc)}
			{#if i > 0}<span class="select-none" aria-hidden="true">/</span>{/if}
			<button
				onclick={() => setLocale(loc)}
				lang={loc}
				aria-pressed={getLocale() === loc}
				class="uppercase underline-offset-4 hover:underline {getLocale() === loc ? 'font-semibold text-primary' : ''}"
				>{loc}</button
			>
		{/each}
	</p>
</footer>
