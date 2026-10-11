<script lang="ts">
	import { LEGAL_LINKS, type LegalSlug } from '#lib/meta.js';
	import { legalHref } from '#lib/legalLinks.js';
	import type { SiteScope } from '#lib/sites.js';
	import * as m from '#lib/paraglide/messages.js';

	let { scope, current }: { scope: SiteScope; current: LegalSlug } = $props();
</script>

<nav aria-label={m.ui_legal()} class="absolute top-0 right-full bottom-0 mr-8 hidden w-44 xl:block">
	<div class="sticky top-28 pt-1">
		<p class="mb-2 text-xs font-medium text-primary/70">{m.ui_legal()}</p>
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<ul class="flex flex-col gap-1.5 border-l border-primary/10 pl-3 text-xs">
			{#each LEGAL_LINKS as p (p.slug)}
				{@const Icon = p.icon}
				{@const isCurrent = p.slug === current}
				<li class="relative">
					{#if isCurrent}
						<span aria-hidden="true" class="absolute top-0.5 bottom-0.5 -left-3.25 w-px bg-primary"
						></span>
					{/if}
					<a
						href={legalHref(scope, p.slug)}
						aria-current={p.slug === current ? 'page' : undefined}
						title={p.label()}
						class="flex items-center gap-1.5 hover:text-primary {p.slug === current
							? 'font-medium text-primary'
							: 'text-primary/60'}"
						><Icon class="size-3.5 shrink-0" aria-hidden="true" /><span class="truncate"
							>{p.label()}</span
						></a
					>
				</li>
			{/each}
		</ul>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</nav>
