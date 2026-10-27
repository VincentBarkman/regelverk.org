<script lang="ts">
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import RecordNav from './recordNav.svelte';
	import LegalNav from './legalNav.svelte';
	import RiArrowRightSLine from 'remixicon-svelte/icons/arrow-right-s-line';
	import * as m from '#lib/paraglide/messages.js';
	import type { ComponentProps } from 'svelte';

	let {
		nav,
		legalNav
	}: {
		nav?: ComponentProps<typeof RecordNav>;
		legalNav?: ComponentProps<typeof LegalNav>;
	} = $props();
</script>

{#if nav || legalNav}
	<Sheet.Root>
		<Sheet.Trigger
			aria-label={m.ui_browse_db()}
			class="fixed bottom-[calc(var(--footer-h,3.5rem)_+_1rem)] left-4 z-40 inline-flex size-11 items-center justify-center rounded-full border border-primary/15 bg-background/90 text-primary/80 shadow-md backdrop-blur-sm transition-colors hover:border-primary/30 hover:text-primary xl:hidden print:hidden"
		>
			<RiArrowRightSLine class="size-5" aria-hidden="true" />
		</Sheet.Trigger>
		<Sheet.Content side="left" class="w-full! overflow-y-auto p-0 sm:max-w-sm">
			<Sheet.Header class="border-b border-primary/8 p-4">
				<Sheet.Title class="font-serif text-base font-medium">
					{nav ? m.ui_browse_db() : m.ui_legal()}
				</Sheet.Title>
			</Sheet.Header>
			{#if nav}
				<div class="p-3">
					<RecordNav {...nav} rail={false} />
				</div>
			{/if}
			{#if legalNav}
				<div class="p-3 {nav ? 'border-t border-primary/8' : ''}">
					<LegalNav {...legalNav} rail={false} />
				</div>
			{/if}
		</Sheet.Content>
	</Sheet.Root>
{/if}
