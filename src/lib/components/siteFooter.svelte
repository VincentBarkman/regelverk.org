<script lang="ts">
	import { getLocale, locales, setLocale } from '#lib/paraglide/runtime.js';
	import '#lib/locale.js';
	import { toggleMode } from 'mode-watcher';
	import RiSunLine from 'remixicon-svelte/icons/sun-line';
	import RiMoonLine from 'remixicon-svelte/icons/moon-line';
	import { LEGAL_LINKS } from '#lib/meta.js';
	import { legalHref, legalIndexHref } from '#lib/legalLinks.js';
	import type { SiteScope } from '#lib/sites.js';
	import * as m from '#lib/paraglide/messages.js';

	let { scope, wide = false }: { scope: SiteScope; wide?: boolean } = $props();

	let rowEl = $state<HTMLElement>();
	let localeEl = $state<HTMLElement>();
	let measureFullEl = $state<HTMLElement>();
	let measureCompactEl = $state<HTMLElement>();
	let compact = $state(false);

	$effect(() => {
		const footer = rowEl?.parentElement as HTMLElement | undefined;
		const row = rowEl;
		const locale = localeEl;
		const full = measureFullEl;
		const slim = measureCompactEl;
		if (!footer || !row || !locale || !full || !slim) return;
		const check = () => {
			const space = footer.clientWidth - locale.offsetWidth - 16;
			const base = row.scrollWidth - (compact ? slim : full).offsetWidth;
			compact = base + full.offsetWidth > space;
			document.documentElement.style.setProperty('--footer-h', `${footer.offsetHeight}px`);
		};
		check();
		const ro = new ResizeObserver(check);
		ro.observe(footer);
		return () => {
			ro.disconnect();
			document.documentElement.style.removeProperty('--footer-h');
		};
	});
</script>

<footer
	class="bg-amber-5/80 sticky bottom-0 mx-auto flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-2 pb-4 text-xs text-primary/60 backdrop-blur-sm {wide
		? 'max-w-4xl px-4 sm:px-6 xl:max-w-296 xl:px-0'
		: 'max-w-2xl px-4'}"
>
	<p bind:this={rowEl} class="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
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
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		{#if compact}
			<span class="select-none" aria-hidden="true">·</span>
			<a href={legalIndexHref(scope)} class="underline-offset-4 hover:underline">{m.ui_legal()}</a>
		{:else}
			{#each LEGAL_LINKS as p (p.slug)}
				<span class="select-none" aria-hidden="true">·</span>
				<a href={legalHref(scope, p.slug)} class="underline-offset-4 hover:underline">{p.label()}</a
				>
			{/each}
		{/if}
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</p>
	<p bind:this={localeEl} class="ml-auto flex min-w-0 items-center gap-1.5 whitespace-nowrap">
		<span class="truncate">
			{m.footer_made_by()}
			<a
				target="_blank"
				rel="noopener noreferrer"
				href="https://vincentbarkman.com"
				class="underline-offset-4 hover:underline">Vincent A. Barkman</a
			>
		</span>
		<span class="select-none" aria-hidden="true">·</span>
		<button
			onclick={toggleMode}
			aria-label={m.ui_toggle_theme()}
			class="relative inline-flex size-4 items-center justify-center text-primary/60 transition-colors hover:text-primary"
		>
			<RiSunLine class="size-3.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
			<RiMoonLine
				class="absolute size-3.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
			/>
		</button>
		<span class="select-none" aria-hidden="true">·</span>
		{#each locales as loc, i (loc)}
			{#if i > 0}<span class="select-none" aria-hidden="true">/</span>{/if}
			<button
				onclick={() => setLocale(loc)}
				lang={loc}
				aria-pressed={getLocale() === loc}
				class="uppercase underline-offset-4 hover:underline {getLocale() === loc
					? 'font-semibold text-primary'
					: ''}">{loc}</button
			>
		{/each}
	</p>

	<span
		bind:this={measureFullEl}
		aria-hidden="true"
		class="pointer-events-none absolute left-[-9999px] flex items-center gap-1.5 whitespace-nowrap"
	>
		{#each LEGAL_LINKS as p (p.slug)}<span>·</span><span>{p.label()}</span>{/each}
	</span>
	<span
		bind:this={measureCompactEl}
		aria-hidden="true"
		class="pointer-events-none absolute left-[-9999px] flex items-center gap-1.5 whitespace-nowrap"
	>
		<span>·</span><span>{m.ui_legal()}</span>
	</span>
</footer>
