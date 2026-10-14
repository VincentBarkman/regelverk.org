<script lang="ts">
	import * as HoverCard from '#lib/components/ui/hover-card/index.js';
	import { logoDarkClass } from '#lib/meta.js';
	import RiExternalLinkLine from 'remixicon-svelte/icons/external-link-line';
	import type { Snippet } from 'svelte';

	type Card = {
		title: string;
		description?: string;
		logo?: string;
		tag?: string;
		external?: boolean;
	};

	let {
		href,
		class: klass = '',
		current = false,
		card,
		children
	}: {
		href: string;
		class?: string;
		current?: boolean;
		card?: Card;
		children: Snippet;
	} = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#if card}
	<HoverCard.Root openDelay={250} closeDelay={80}>
		<HoverCard.Trigger
			{href}
			class={klass}
			aria-current={current ? 'page' : undefined}
			title={card.title}
			target={card.external ? '_blank' : undefined}
			rel={card.external ? 'noopener noreferrer' : undefined}
		>
			{@render children()}
		</HoverCard.Trigger>
		<HoverCard.Content side="right" align="start" sideOffset={8} class="w-64">
			<div class="flex items-center gap-2">
				{#if card.logo}
					<img src={card.logo} alt="" class="h-4 w-auto shrink-0 {logoDarkClass(card.logo)}" />
				{:else if card.external}
					<RiExternalLinkLine class="size-3.5 shrink-0 text-primary/60" aria-hidden="true" />
				{/if}
				<span class="min-w-0 truncate text-xs font-medium text-primary">{card.title}</span>
				{#if card.external}
					<RiExternalLinkLine class="ml-auto size-3 shrink-0 text-primary/60" aria-hidden="true" />
				{/if}
			</div>
			{#if card.tag}
				<p class="mt-0.5 text-[11px] text-primary/60">{card.tag}</p>
			{/if}
			{#if card.description}
				<p class="mt-1.5 line-clamp-3 text-xs leading-relaxed text-primary/60">
					{card.description}
				</p>
			{/if}
		</HoverCard.Content>
	</HoverCard.Root>
{:else}
	<a {href} class={klass} aria-current={current ? 'page' : undefined}>{@render children()}</a>
{/if}
<!-- eslint-enable svelte/no-navigation-without-resolve -->
