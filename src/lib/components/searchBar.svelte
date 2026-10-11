<script lang="ts">
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import RiSearchLine from 'remixicon-svelte/icons/search-line';
	import RiArrowRightSLine from 'remixicon-svelte/icons/arrow-right-s-line';
	import RiCloseLine from 'remixicon-svelte/icons/close-line';
	import * as Kbd from '#lib/components/ui/kbd/index.js';
	import { createPlaceholderTyper } from '#lib/utils/placeholderTyper.js';
	import { formatShortcutLabel } from '#lib/utils/hotkeys.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/env';
	import * as m from '#lib/paraglide/messages.js';
	import { ENTITY_ICON, ENTITY_LABEL } from '#lib/meta.js';
	import { SITES, type SiteScope } from '#lib/sites.js';
	import type { Entity } from '#lib/entities.js';

	interface Props {
		inputId?: string;
		width?: string;
		enableTyper?: boolean;
		typingPhrases?: string[];
		staticPlaceholder?: string;
		initialValue?: string;
		label?: string;
		showSuggestions?: boolean;
		onsubmit?: (query: string) => void;
		value?: string;
	}

	type ArticleSearchResult = {
		id: string;
		slug: string;
		title: string;
		description: string;
		entity: Entity;
		scope: SiteScope;
	};

	let {
		inputId = 'search-input',
		width = 'w-80 max-w-full',
		enableTyper = true,
		typingPhrases = [
			m.search_placeholder(),
			'ATEX...',
			'NIS2...',
			'ISO 27001...',
			'ELSÄK-FS...',
			'AFS 2023...'
		],
		staticPlaceholder = m.search_placeholder(),
		initialValue = '',
		label = m.search_label(),
		showSuggestions = true,
		onsubmit,
		value = $bindable('')
	}: Props = $props();

	// svelte-ignore state_referenced_locally
	if (!value && initialValue) value = initialValue;

	let placeholder = $state('');
	let showResults = $state(false);

	let searchResults = $state<ArticleSearchResult[]>([]);
	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);

	const hasValue = $derived(!!value);
	const shortcutStr = 'mod+k';
	const shortcutLabel = formatShortcutLabel(shortcutStr);

	function goToWiki(slug: string) {
		goto(resolve('/wiki/[...slug]', { slug }));
	}

	function goToSearch(query: string) {
		goto(resolve(`/search?search=${encodeURIComponent(query)}`));
	}

	function submitSearch() {
		const q = value.trim();
		if (onsubmit) {
			onsubmit(q);
			return;
		}
		if (!q) return;

		if (searchResults.length > 0) {
			goToWiki(searchResults[0].slug);
		} else {
			goToSearch(q);
		}
	}

	let typer: ReturnType<typeof createPlaceholderTyper> | null = null;

	$effect(() => {
		if (enableTyper) {
			typer = createPlaceholderTyper(
				{
					phrases: typingPhrases,
					typeBaseMs: 220,
					typeMinMs: 55,
					typeAccel: 0.84,
					typeJitterMs: 18,
					pauseAfterTypeMs: 1100,
					pauseAfterDeleteMs: 400,
					deleteMs: 45
				},
				(t) => (placeholder = t)
			);
			typer.start();

			return () => {
				typer?.stop();
				typer = null;
			};
		}

		placeholder = staticPlaceholder;
	});

	function onFocus() {
		typer?.onFocus();
		placeholder = staticPlaceholder;
		showResults = true;
	}

	function onBlur() {
		typer?.onBlur();
		setTimeout(() => {
			showResults = false;
		}, 200);
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		const isModKey = event.metaKey || event.ctrlKey;
		if (isModKey && event.key === 'k') {
			const target = event.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

			event.preventDefault();
			const el = document.getElementById(inputId) as HTMLInputElement | null;
			if (el) {
				el.focus();
				queueMicrotask(() => el.select());
			}
		}
	}

	function onKeyDown(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			value = '';
			e.currentTarget.blur();
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			submitSearch();
		}
	}

	let lastQuery = '';
	let debounceHandle: ReturnType<typeof setTimeout> | null = null;

	async function runSearch(query: string) {
		if (!browser) return;

		const trimmed = query.trim();
		if (!trimmed || trimmed.length < 2) {
			searchResults = [];
			errorMessage = null;
			isLoading = false;
			return;
		}

		isLoading = true;
		errorMessage = null;

		try {
			const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(trimmed)}`);
			if (!res.ok) {
				throw new Error(`Search failed with status ${res.status}`);
			}
			const data = (await res.json()) as { results: ArticleSearchResult[] };
			searchResults = data.results ?? [];
		} catch (err) {
			console.error(err);
			errorMessage = m.search_failed();
			searchResults = [];
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (!browser || !showSuggestions) return;

		const q = value.trim();
		if (q === lastQuery) return;
		lastQuery = q;

		if (debounceHandle) {
			clearTimeout(debounceHandle);
		}

		if (!q) {
			searchResults = [];
			errorMessage = null;
			isLoading = false;
			return;
		}

		debounceHandle = setTimeout(() => {
			runSearch(q);
		}, 180);

		return () => {
			if (debounceHandle) {
				clearTimeout(debounceHandle);
				debounceHandle = null;
			}
		};
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<Label for={inputId} class="sr-only">{label}</Label>

<div class="relative {width}">
	<InputGroup.Root class={width}>
		<InputGroup.Input
			id={inputId}
			class={hasValue ? '' : 'caret-transparent'}
			placeholder={placeholder || staticPlaceholder}
			onfocus={onFocus}
			onblur={onBlur}
			bind:value
			onkeydown={onKeyDown}
		/>

		<InputGroup.Addon>
			<RiSearchLine />
		</InputGroup.Addon>

		<InputGroup.Addon align="inline-end" class="pr-4">
			{#if hasValue}
				<InputGroup.Button
					class="hidden size-6 rounded-full md:flex"
					onclick={() => (value = '')}
					aria-label={m.search_clear()}
				>
					<RiCloseLine class="size-4" />
				</InputGroup.Button>
			{:else}
				<Kbd.Root
					class="hidden md:flex"
					aria-label={m.search_focus_shortcut({ shortcut: shortcutLabel })}
				>
					{shortcutLabel}
				</Kbd.Root>
			{/if}

			<InputGroup.Button
				class="flex size-6 rounded-full md:hidden"
				aria-label={m.search_go()}
				onclick={submitSearch}
			>
				<RiArrowRightSLine class="size-4" />
			</InputGroup.Button>
		</InputGroup.Addon>
	</InputGroup.Root>

	{#if showSuggestions && showResults && value.trim()}
		<div class="absolute z-50 mt-2 w-full">
			<Command.Root class="rounded-lg border bg-background shadow-md">
				<Command.List>
					{#if isLoading}
						<Command.Empty>{m.search_searching()}</Command.Empty>
					{:else if errorMessage}
						<Command.Empty>{errorMessage}</Command.Empty>
					{:else if searchResults.length === 0}
						<Command.Empty>{m.search_no_results()}</Command.Empty>
					{:else}
						<Command.Group>
							{#each searchResults as item (item.id)}
								{@const Icon = ENTITY_ICON[item.entity]}
								<Command.Item onSelect={() => goToWiki(item.slug)} class="px-2 py-2">
									<a
										href={resolve('/wiki/[...slug]', { slug: item.slug })}
										class="flex w-full items-start gap-2.5 text-left"
										onclick={() => (showResults = true)}
									>
										<span class="flex h-5 shrink-0 items-center">
											<Icon class="size-3.5 text-primary/40" aria-hidden="true" />
										</span>
										<span class="flex min-w-0 flex-1 flex-col">
											<span class="truncate font-serif text-sm font-semibold text-primary">{item.title}</span>
											{#if item.description}
												<span class="truncate text-xs text-primary/55">{item.description}</span>
											{/if}
											<span class="mt-0.5 text-[10px] text-primary/40"
												>{ENTITY_LABEL[item.entity]()} · {SITES[item.scope]?.label ??
													item.scope}</span
											>
										</span>
									</a>
								</Command.Item>
							{/each}
							<Command.Item
								onSelect={() => goToSearch(value.trim())}
								class="border-t border-primary/10 px-2 py-2"
							>
								<button
									type="button"
									onclick={() => goToSearch(value.trim())}
									class="flex w-full items-center gap-2 text-left text-xs font-medium text-primary/60"
								>
									<RiSearchLine class="size-3.5 shrink-0 text-primary/40" aria-hidden="true" />
									<span class="truncate">{m.ui_view_all()}</span>
									<RiArrowRightSLine class="ml-auto size-3.5 text-primary/40" aria-hidden="true" />
								</button>
							</Command.Item>
						</Command.Group>
					{/if}
				</Command.List>
			</Command.Root>
		</div>
	{/if}
</div>
