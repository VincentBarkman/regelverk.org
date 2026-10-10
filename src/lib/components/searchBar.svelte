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

	interface Props {
		inputId?: string;
		width?: string;
		enableTyper?: boolean;
		typingPhrases?: string[];
		staticPlaceholder?: string;
	}

	type ArticleSearchResult = {
		id: string;          // <- string, matches API
		slug: string;
		title: string;
		description: string;
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
		staticPlaceholder = m.search_placeholder()
	}: Props = $props();

	let placeholder = $state('');
	let value = $state('');
	let showResults = $state(false);

	let searchResults = $state<ArticleSearchResult[]>([]);
	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);

	const hasValue = $derived(!!value);
	const shortcutStr = 'mod+k';
	const shortcutLabel = formatShortcutLabel(shortcutStr);

	function goToWiki(slug: string) {
		goto(resolve('/wiki/[slug]', { slug: encodeURIComponent(slug) }));
	}

	function goToSearch(query: string) {
		goto(resolve(`/search?search=${encodeURIComponent(query)}`));
	}

	function submitSearch() {
		const q = value.trim();
		if (!q) return;

		if (searchResults.length > 0) {
			goToWiki(searchResults[0].slug);
		} else {
			goToSearch(q);
		}
	}

	// typer setup
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
		showResults = true;
	}

	function onBlur() {
		typer?.onBlur();
		setTimeout(() => {
			showResults = false;
		}, 200);
	}

	function handleResultClick(item: ArticleSearchResult) {
		value = item.title;
		showResults = false;
		goToWiki(item.slug);
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

	// client-only, debounced search
	let lastQuery = '';
	let debounceHandle: ReturnType<typeof setTimeout> | null = null;

	async function runSearch(query: string) {
		if (!browser) return; // never run on SSR

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
		if (!browser) return; // page can SSR instantly

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

<Label for={inputId} class="sr-only">{m.search_label()}</Label>

<div class="relative {width}">
	<InputGroup.Root class="{width} rounded-full">
		<InputGroup.Input
			id={inputId}
			{placeholder}
			onfocus={onFocus}
			onblur={onBlur}
			bind:value={value}
			onkeydown={onKeyDown}
		/>

		<InputGroup.Addon>
			<RiSearchLine />
		</InputGroup.Addon>

		<InputGroup.Addon align="inline-end" class="pr-4">
			{#if hasValue}
				<InputGroup.Button
					class="size-6 rounded-full hidden md:flex"
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
				class="size-6 rounded-full flex md:hidden"
				aria-label={m.search_go()}
				onclick={submitSearch}
			>
				<RiArrowRightSLine class="size-4" />
			</InputGroup.Button>
		</InputGroup.Addon>
	</InputGroup.Root>

	{#if showResults && value.trim()}
		<div class="absolute w-full mt-2 z-50">
			<Command.Root class="rounded-lg border shadow-md bg-background">
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
								<Command.Item onSelect={() => goToWiki(item.slug)}>
									<a
										href={resolve('/wiki/[slug]', { slug: encodeURIComponent(item.slug) })}
										class="flex flex-col gap-1 w-full text-left"
										onclick={() => (showResults = true)}
									>
										<span class="font-medium">{item.title}</span>
										<span class="text-xs text-muted-foreground">
											{item.description}
										</span>
									</a>
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}
				</Command.List>
			</Command.Root>
		</div>
	{/if}
</div>
