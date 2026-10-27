<script lang="ts">
	import { goto } from '$app/navigation';
	import { SvelteURL } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import * as m from '#lib/paraglide/messages.js';
	import { enhanceCodeBlocks } from '#lib/codeBlocks.js';
	import type { TocItem } from '#lib/headings.js';

	let {
		article,
		items = [],
		content,
		rail = true
	}: {
		article?: HTMLElement;
		items?: TocItem[];
		content?: unknown;
		rail?: boolean;
	} = $props();

	let activeId = $state('');
	let listEl = $state<HTMLUListElement>();
	let thumb = $state<{ top: number; h: number } | null>(null);

	$effect(() => {
		const li = listEl?.querySelector(`a[href="#${activeId}"]`)?.closest('li');
		thumb = li ? { top: li.offsetTop, h: li.offsetHeight } : null;
	});

	const jump = (id: string) => {
		activeId = id;
		document
			.querySelector(`nav[aria-label] a[href="#${id}"]`)
			?.scrollIntoView({ block: 'nearest' });
	};

	$effect(() => {
		void content;
		if (!article) return;

		const headings = [...article.querySelectorAll('h2')].filter((h) => h.id);

		const onHeadingClick = (e: MouseEvent) => {
			const h = (e.target as Element).closest('h2, h3');
			if (!h?.id || window.getSelection()?.toString()) return;
			const a = (e.target as Element).closest('a');
			if (a && !a.classList.contains('anchor')) return;
			e.preventDefault();
			const url = new SvelteURL(location.href);
			url.hash = h.id;
			void navigator.clipboard?.writeText(url.href);
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- hash-only update on the current page, not a route
			void goto(url, { state: {}, shallow: true, replace: true });
			jump(h.id);
		};
		article.addEventListener('click', onHeadingClick);
		activeId = headings[0]?.id ?? '';
		enhanceCodeBlocks(article);

		const update = () => {
			if (
				window.scrollY > 0 &&
				window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8
			) {
				activeId = headings.at(-1)?.id ?? '';
				return;
			}
			let current = headings[0];
			for (const h of headings) {
				if (h.getBoundingClientRect().top <= 96) current = h;
				else break;
			}
			activeId = current?.id ?? '';
		};
		update();
		window.addEventListener('scroll', update, { passive: true });
		return () => {
			article.removeEventListener('click', onHeadingClick);
			window.removeEventListener('scroll', update);
		};
	});
</script>

{#if items.length && !rail}
	<nav aria-label={m.ui_contents()} class="not-prose mb-8 xl:hidden print:hidden!">
		<p class="mb-2 text-xs font-medium text-primary/70">{m.ui_contents()}</p>
		<ul class="flex flex-col gap-1.5 border-l border-primary/10 pl-3 text-xs">
			{#each items as t, i (t.id)}
				<li>
					<a
						href="#{t.id}"
						title={t.text}
						class="block min-h-6 truncate py-1 text-primary/60 hover:text-primary"
						>{i + 1}. {t.text}</a
					>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

{#if items.length && rail}
	<nav
		transition:fade={{ duration: 200 }}
		aria-label={m.ui_contents()}
		class="absolute top-0 bottom-0 left-full ml-8 hidden w-44 xl:block print:hidden!"
	>
		<div class="sticky top-28 pt-1">
			<p class="mb-2 text-xs font-medium text-primary/70">{m.ui_contents()}</p>
			<ul
				bind:this={listEl}
				class="relative flex flex-col gap-1.5 border-l border-primary/10 pl-3 text-xs"
			>
				{#if thumb}
					<span
						aria-hidden="true"
						class="absolute -left-px w-px bg-primary transition-all duration-200 ease-out"
						style:top="{thumb.top}px"
						style:height="{thumb.h}px"
					></span>
				{/if}
				{#each items as t, i (t.id)}
					<li>
						<a
							href="#{t.id}"
							onclick={() => jump(t.id)}
							aria-current={activeId === t.id ? 'location' : undefined}
							title={t.text}
							class="block truncate hover:text-primary {activeId === t.id
								? 'font-medium text-primary'
								: 'text-primary/60'}">{i + 1}. {t.text}</a
						>
					</li>
				{/each}
			</ul>
		</div>
	</nav>
{/if}
