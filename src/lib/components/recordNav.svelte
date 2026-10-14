<script lang="ts">
	import { ENTITY_LABEL, ENTITY_ICON, PAGE_LINKS } from '#lib/meta.js';
	import type { Entity } from '#lib/entities.js';
	import type { DataRecordRef } from '#lib/data.js';
	import * as m from '#lib/paraglide/messages.js';
	import RecordLink from './recordLink.svelte';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import RiArrowRightSLine from 'remixicon-svelte/icons/arrow-right-s-line';

	let {
		groups,
		currentId,
		activeEntity,
		hrefFor,
		pageHref,
		rail = true
	}: {
		groups: { entity: Entity; items: DataRecordRef[] }[];
		currentId: string;
		activeEntity?: Entity;
		hrefFor: (entity: Entity, id: string) => string;
		pageHref?: (slug: string) => string;
		rail?: boolean;
	} = $props();

	const hasCurrent = (i: DataRecordRef): boolean =>
		i.id === currentId || (i.children?.some(hasCurrent) ?? false);

	const defaultOpen = (g: { entity: Entity; items: DataRecordRef[] }) =>
		g.entity === activeEntity || g.items.some(hasCurrent);

	const subOpen = (i: DataRecordRef) => openSubs[i.id] ?? hasCurrent(i);

	let openGroups = $state<Record<string, boolean>>({});
	let openSubs = $state<Record<string, boolean>>({});
</script>

{#if groups.length}
	<nav
		aria-label={m.ui_browse_db()}
		class={rail ? 'absolute top-0 right-full bottom-0 mr-8 hidden w-44 xl:block' : 'w-full'}
	>
		<div class={rail ? 'sticky top-28 flex max-h-[calc(100svh-8.5rem)] flex-col pt-1' : ''}>
			<p class={rail ? 'mb-2 text-xs font-medium text-primary/70' : 'sr-only'}>
				{m.ui_browse_db()}
			</p>
			{#snippet navBody()}
				<div class="flex flex-col gap-2">
					{#each groups as g (g.entity)}
						{@const Icon = ENTITY_ICON[g.entity]}
						<details
							open={openGroups[g.entity] ?? defaultOpen(g)}
							ontoggle={(e) => (openGroups[g.entity] = e.currentTarget.open)}
							class="group/det"
						>
							<summary
								class="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-primary/70 select-none hover:text-primary [&::-webkit-details-marker]:hidden"
							>
								<RiArrowRightSLine
									class="size-3 transition-transform group-open/det:rotate-90"
									aria-hidden="true"
								/>
								<Icon class="size-3.5" aria-hidden="true" />
								{ENTITY_LABEL[g.entity]()}
							</summary>
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							{#snippet navItem(i: DataRecordRef)}
								{@const isCurrent = i.id === currentId}
								<li class="relative">
									{#if isCurrent}
										<span
											aria-hidden="true"
											class="absolute top-0.5 bottom-0.5 -left-3.25 w-px bg-primary"
										></span>
									{/if}
									<div class="flex items-center">
										{#if i.children?.length}
											<button
												type="button"
												aria-expanded={subOpen(i)}
												aria-label={i.title ?? i.id}
												onclick={() => (openSubs[i.id] = !subOpen(i))}
												class="mr-0.5 -ml-1 shrink-0 rounded-sm p-0.5 text-primary/50 hover:text-primary"
											>
												<RiArrowRightSLine
													class="size-3 transition-transform {subOpen(i) ? 'rotate-90' : ''}"
													aria-hidden="true"
												/>
											</button>
										{/if}
										<RecordLink
											href={hrefFor(g.entity, i.id)}
											current={isCurrent}
											card={{
												title: i.title ?? i.id,
												description:
													typeof i.meta?.description === 'string' ? i.meta.description : undefined,
												logo:
													g.entity === 'myndigheter' && typeof i.meta?.logo === 'string'
														? i.meta.logo
														: undefined,
												tag: ENTITY_LABEL[g.entity]()
											}}
											class="block min-w-0 flex-1 truncate hover:text-primary {isCurrent
												? 'font-medium text-primary'
												: 'text-primary/60'}"
										>
											{i.title ?? i.id}
										</RecordLink>
									</div>
									{#if i.children?.length && subOpen(i)}
										<ul class="mt-1.5 ml-1 flex flex-col gap-1.5 border-l border-primary/10 pl-3">
											{#each i.children as c (c.id)}
												{@render navItem(c)}
											{/each}
										</ul>
									{/if}
								</li>
							{/snippet}
							<ul
								class="mt-1.5 ml-1.5 flex flex-col gap-1.5 border-l border-primary/10 pl-3 text-xs"
							>
								{#each g.items as i (i.id)}
									{@render navItem(i)}
								{/each}
							</ul>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</details>
					{/each}
				</div>
				{#if pageHref}
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<Separator class="mt-4 bg-primary/10" />
					<ul class="mt-3 flex flex-col gap-1.5 pl-3 text-xs">
						{#each PAGE_LINKS as p (p.slug)}
							{@const Icon = p.icon}
							{@const isCurrent = p.slug === currentId}
							<li class="relative">
								{#if isCurrent}
									<span
										aria-hidden="true"
										class="absolute top-0.5 bottom-0.5 -left-3.25 w-px bg-primary"
									></span>
								{/if}
								<a
									href={pageHref(p.slug)}
									title={p.label()}
									class="flex items-center gap-1.5 text-primary/60 hover:text-primary"
									><Icon class="size-3.5 shrink-0" aria-hidden="true" /><span class="truncate"
										>{p.label()}</span
									></a
								>
							</li>
						{/each}
					</ul>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			{/snippet}
			{#if rail}
				<ScrollArea class="h-[calc(100svh-10.5rem)] pr-1">
					{@render navBody()}
				</ScrollArea>
			{:else}
				{@render navBody()}
			{/if}
		</div>
	</nav>
{/if}
