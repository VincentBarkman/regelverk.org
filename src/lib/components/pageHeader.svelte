<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { localizeHref } from '#lib/paraglide/runtime.js';
	import { SITES, siteHost, type SiteScope } from '#lib/sites.js';
	import { ENTITIES, type Entity } from '#lib/entities.js';
	import { ENTITY_LABEL, ENTITY_ICON } from '#lib/meta.js';
	import { topRecords } from '#lib/data.js';
	import * as NavigationMenu from '#lib/components/ui/navigation-menu/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import RiMenuLine from 'remixicon-svelte/icons/menu-line';
	import SearchBar from '#lib/components/searchBar.svelte';
	import { fitText } from '#lib/fitText.js';
	import * as m from '#lib/paraglide/messages.js';

	let { scope, active }: { scope: SiteScope; active?: Entity } = $props();

	const site = $derived(SITES[scope]);
	const host = $derived(siteHost(scope));

	const entityHref = (ent: Entity) =>
		localizeHref(
			dev
				? resolve(
						'/[[site=site]]/[entity=entity]',
						scope === 'regelverk' ? { entity: ent } : { site: scope, entity: ent }
					)
				: `https://${host}/${ent}`
		);

	const recordHref = (ent: Entity, id: string) =>
		localizeHref(
			dev
				? resolve(
						'/[[site=site]]/[entity=entity]/[...id]',
						scope === 'regelverk' ? { entity: ent, id } : { site: scope, entity: ent, id }
					)
				: `https://${host}/${ent}/${id.split('/').map(encodeURIComponent).join('/')}`
		);

	const records = (ent: Entity) => topRecords(scope, ent);
</script>

<header class="bg-amber-5/80 sticky top-0 z-10 backdrop-blur-sm">
	<Sheet.Root>
		<div class="@container mx-auto w-full max-w-4xl px-4 pt-3 pb-1 sm:px-6 xl:max-w-296 xl:px-0">
			<div class="flex items-center gap-4">
				{#if dev}
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={localizeHref(
							resolve('/[[site=site]]', scope === 'regelverk' ? {} : { site: scope })
						)}
						aria-label={host}
						use:fitText={1.875}
						class="shrink-0 font-serif text-[min(1.875rem,calc((100cqw_-_88px)/13))] font-medium whitespace-nowrap lg:text-[min(1.875rem,calc((100cqw_-_308px)/13))]"
						>{#if site.subdomain}<span class={site.colorClass}>{site.subdomain}</span
							>.regelverk.org{:else}regelverk.org{/if}</a
					>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{:else}
					<a
						href={localizeHref(`https://${host}/`)}
						rel="external"
						aria-label={host}
						use:fitText={1.875}
						class="shrink-0 font-serif text-[min(1.875rem,calc((100cqw_-_88px)/13))] font-medium whitespace-nowrap lg:text-[min(1.875rem,calc((100cqw_-_308px)/13))]"
						>{#if site.subdomain}<span class={site.colorClass}>{site.subdomain}</span
							>.regelverk.org{:else}regelverk.org{/if}</a
					>
				{/if}

				<div class="ml-auto hidden shrink-0 lg:block">
					<SearchBar inputId="header-search" width="w-64 max-w-full" />
				</div>

				<Sheet.Trigger
					class="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-md text-primary/70 hover:bg-primary/5 hover:text-primary lg:hidden"
					aria-label={m.ui_menu()}
				>
					<RiMenuLine class="size-5" aria-hidden="true" />
				</Sheet.Trigger>
			</div>

			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<NavigationMenu.Root viewport={false} class="mt-3 hidden min-w-0 justify-start lg:flex">
				<NavigationMenu.List class="flex-wrap gap-0.5 whitespace-nowrap">
					{#each ENTITIES as ent (ent)}
						<NavigationMenu.Item>
							{@const Icon = ENTITY_ICON[ent]}
							<NavigationMenu.Trigger
								aria-current={ent === active ? 'page' : undefined}
								class="h-8 px-1.5 py-1 text-xs font-normal {ent === active
									? 'font-medium text-primary'
									: 'text-primary/60'}"
							>
								{ENTITY_LABEL[ent]()}
							</NavigationMenu.Trigger>
							<NavigationMenu.Content>
								<div class="grid w-[24rem] grid-cols-2 gap-1 p-2">
									<NavigationMenu.Link
										href={entityHref(ent)}
										rel={dev ? undefined : 'external'}
										class="flex flex-col justify-center rounded-md p-3 {site.softClass}"
									>
										<span class="text-xs font-medium {site.colorClass} flex items-center gap-1.5"
											><Icon class="size-3.5" aria-hidden="true" />{ENTITY_LABEL[ent]()}</span
										>
										<span class="mt-0.5 text-[11px] text-primary/60">{m.ui_view_all()}</span>
									</NavigationMenu.Link>
									<ul class="flex min-h-32 flex-col">
										{#each records(ent) as r (r.id)}
											<li>
												<NavigationMenu.Link
													href={recordHref(ent, r.id)}
													rel={dev ? undefined : 'external'}
													class="block min-w-0 truncate rounded-md px-3 py-2 text-xs text-primary/80 hover:bg-primary/5"
												>
													{r.title ?? r.id}
												</NavigationMenu.Link>
											</li>
										{/each}
									</ul>
								</div>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
					{/each}
				</NavigationMenu.List>
			</NavigationMenu.Root>

			<Sheet.Content side="right" class="w-full! overflow-y-auto p-0 sm:max-w-sm">
				<Sheet.Header class="border-b border-primary/8 p-4">
					<Sheet.Title class="font-serif text-base font-medium">{host}</Sheet.Title>
				</Sheet.Header>
				<div class="p-2">
					<SearchBar inputId="sheet-search" width="w-full" />
				</div>
				<nav class="border-t border-primary/8 p-2">
					{#each ENTITIES as ent (ent)}
						{@const Icon = ENTITY_ICON[ent]}
						<Sheet.Close>
							{#snippet child({ props })}
								<a
									{...props}
									href={entityHref(ent)}
									rel={dev ? undefined : 'external'}
									aria-current={ent === active ? 'page' : undefined}
									class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm {ent === active
										? 'font-medium text-primary ' + site.softClass
										: 'text-primary/70 hover:bg-primary/5'}"
								>
									<Icon
										class="size-4 shrink-0 {ent === active ? site.colorClass : 'text-primary/60'}"
										aria-hidden="true"
									/>
									{ENTITY_LABEL[ent]()}
								</a>
							{/snippet}
						</Sheet.Close>
					{/each}
				</nav>
			</Sheet.Content>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>
	</Sheet.Root>
</header>
