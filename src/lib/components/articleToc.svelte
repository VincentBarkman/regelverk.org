<script lang="ts">
	import * as m from '#lib/paraglide/messages.js';
	import type { Component } from 'svelte';

	let { article, content }: { article: HTMLElement | undefined; content?: Component } = $props();

	let toc = $state<{ id: string; text: string }[]>([]);
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
		if (!article) {
			toc = [];
			return;
		}

		const headings = [...article.querySelectorAll('h2')];

		const onHeadingClick = (e: MouseEvent) => {
			const h = (e.target as Element).closest('h2');
			if (!h?.id || window.getSelection()?.toString()) return;
			e.preventDefault();
			void navigator.clipboard?.writeText(
				new URL(`#${h.id}`, location.href).href
			);
			history.replaceState(null, '', `#${h.id}`);
			jump(h.id);
		};
		article.addEventListener('click', onHeadingClick);
		const items = headings.map((h, i) => {
			const text = [...h.childNodes]
				.filter((n) => !(n instanceof Element && n.classList.contains('secno')))
				.map((n) => n.textContent ?? '')
				.join('')
				.replace(/#$/, '')
				.trim();
			const id =
				h.id ||
				text
					.toLowerCase()
					.replace(/[^\p{L}\p{N}]+/gu, '-')
					.replace(/^-+|-+$/g, '');
			h.id = id;
			h.classList.add('group', 'cursor-pointer');
			if (!h.querySelector('span.secno')) {
				const span = document.createElement('span');
				span.textContent = `${i + 1}.`;
				span.className = 'secno mr-1.5 text-primary/40';
				h.insertBefore(span, h.firstChild);
			}
			if (!h.querySelector('a.anchor')) {
				const a = document.createElement('a');
				a.href = `#${id}`;
				a.textContent = '#';
				a.className =
					'anchor ml-2 text-primary/40 no-underline hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity';
				a.setAttribute('aria-label', text);
				a.addEventListener('click', () => {
					void navigator.clipboard?.writeText(new URL(a.href, location.href).href);
					jump(id);
				});
				h.appendChild(a);
			}
			return { id, text: `${i + 1}. ${text}` };
		});
		toc = items;
		activeId = items[0]?.id ?? '';

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

{#if toc.length}
	<nav
		aria-label={m.ui_contents()}
		class="hidden xl:block absolute top-0 bottom-0 left-full ml-8 w-44"
	>
		<div class="sticky top-10 pt-24">
			<p class="text-xs font-medium text-primary/70 mb-2">{m.ui_contents()}</p>
			<ul
				bind:this={listEl}
				class="relative flex flex-col gap-1.5 text-xs border-l border-primary/10 pl-3"
			>
				{#if thumb}
					<span
						aria-hidden="true"
						class="absolute -left-px w-px bg-primary transition-all duration-200 ease-out"
						style:top="{thumb.top}px"
						style:height="{thumb.h}px"
					></span>
				{/if}
				{#each toc as t (t.id)}
					<li>
						<a
							href="#{t.id}"
							onclick={() => jump(t.id)}
							aria-current={activeId === t.id ? 'location' : undefined}
							class="hover:text-primary {activeId === t.id
								? 'text-primary font-medium'
								: 'text-primary/60'}">{t.text}</a
						>
					</li>
				{/each}
			</ul>
		</div>
	</nav>
{/if}
