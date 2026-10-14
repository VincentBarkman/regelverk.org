<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import RiExternalLinkLine from 'remixicon-svelte/icons/external-link-line';

	type Ref =
		| { kind: 'anchor'; frag: string }
		| { kind: 'internal'; url: URL; frag: string }
		| { kind: 'external'; url: URL };

	type Card = {
		style: string;
		title: string;
		text?: string;
		external?: boolean;
		loading?: boolean;
	};

	let card = $state<Card | null>(null);
	const cache = new SvelteMap<string, { title: string; text: string }>();
	let seq = 0;
	let showT: ReturnType<typeof setTimeout> | undefined;
	let hideT: ReturnType<typeof setTimeout> | undefined;
	let current: HTMLAnchorElement | undefined;

	const LEGAL_HOSTS = /(^|\.)rkrattsbaser\.gov\.se$|(^|\.)eur-lex\.europa\.eu$/;
	const WIDTH = 256;

	const classify = (a: HTMLAnchorElement): Ref | null => {
		const href = a.getAttribute('href') ?? '';
		if (href.startsWith('#')) return { kind: 'anchor', frag: href.slice(1) };
		let u: URL;
		try {
			u = new URL(href, location.href);
		} catch {
			return null;
		}
		if (LEGAL_HOSTS.test(u.hostname)) return { kind: 'external', url: u };
		if (u.origin === location.origin && u.pathname.startsWith('/lagstiftning/'))
			return { kind: 'internal', url: u, frag: decodeURIComponent(u.hash.slice(1)) };
		return null;
	};

	const clean = (s: string | null | undefined) =>
		(s ?? '').replace(/#$/, '').replace(/\s+/g, ' ').trim();

	const excerpt = (h: Element) => {
		let text = '';
		for (
			let el = h.nextElementSibling;
			el && !/^H[1-6]$/.test(el.tagName) && text.length < 360;
			el = el.nextElementSibling
		) {
			const t = clean(el.textContent);
			if (t) text += (text ? ' ' : '') + t;
		}
		return text.slice(0, 360);
	};

	const fromDoc = (doc: Document, frag: string) => {
		const h = (frag ? doc.getElementById(frag) : null) ?? doc.querySelector('h1');
		return h ? { title: clean(h.textContent), text: excerpt(h) } : null;
	};

	const loadInternal = async (url: URL, frag: string) => {
		const key = `${url.pathname}#${frag}`;
		const hit = cache.get(key);
		if (hit) return hit;
		const res = await fetch(url.pathname);
		const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
		const found = fromDoc(doc, frag) ?? { title: clean(doc.title), text: '' };
		cache.set(key, found);
		return found;
	};

	const scheduleHide = () => {
		clearTimeout(hideT);
		hideT = setTimeout(() => {
			card = null;
			current = undefined;
		}, 140);
	};

	const show = async (a: HTMLAnchorElement, ref: Ref) => {
		const id = ++seq;
		const r = a.getBoundingClientRect();
		const x = Math.min(Math.max(8, r.left), Math.max(8, innerWidth - WIDTH - 8));
		const below = r.bottom + 150 < innerHeight;
		const style = below
			? `top:${Math.round(r.bottom + 8)}px;left:${Math.round(x)}px`
			: `bottom:${Math.round(innerHeight - r.top + 8)}px;left:${Math.round(x)}px`;

		const external = ref.kind === 'external';
		card = { style, title: clean(a.textContent), external, loading: !external };

		let data: { title: string; text: string } | null;
		if (ref.kind === 'anchor') {
			data = ref.frag ? fromDoc(document, ref.frag) : null;
		} else if (ref.kind === 'internal') {
			try {
				data = await loadInternal(ref.url, ref.frag);
			} catch {
				data = { title: ref.url.pathname, text: '' };
			}
		} else {
			data = { title: clean(a.textContent), text: `${ref.url.hostname}${ref.url.pathname}` };
		}
		if (id !== seq || !card) return;
		if (!data) {
			card = null;
			return;
		}
		card = { ...card, title: data.title || clean(a.textContent), text: data.text, loading: false };
	};

	$effect(() => {
		const el = document.querySelector('article');
		if (!el) return;

		const over = (e: MouseEvent) => {
			const a = (e.target as HTMLElement).closest?.('a[href]');
			if (!(a instanceof HTMLAnchorElement) || a === current) return;
			const ref = classify(a);
			if (!ref) return;
			current = a;
			clearTimeout(showT);
			clearTimeout(hideT);
			showT = setTimeout(() => void show(a, ref), 250);
		};

		const out = (e: MouseEvent) => {
			const to = e.relatedTarget as HTMLElement | null;
			if (to && (to.closest('a[href]') === current || to.closest('[data-ref-card]'))) return;
			clearTimeout(showT);
			scheduleHide();
		};

		const dismiss = () => {
			card = null;
			current = undefined;
		};

		el.addEventListener('mouseover', over);
		el.addEventListener('mouseout', out);
		window.addEventListener('scroll', dismiss, { passive: true, capture: true });
		return () => {
			el.removeEventListener('mouseover', over);
			el.removeEventListener('mouseout', out);
			window.removeEventListener('scroll', dismiss, { capture: true });
			clearTimeout(showT);
			clearTimeout(hideT);
		};
	});
</script>

{#if card}
	<div
		data-ref-card
		class="fixed z-50 w-64 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
		style={card.style}
		role="tooltip"
		onmouseenter={() => clearTimeout(hideT)}
		onmouseleave={scheduleHide}
	>
		<div class="flex items-center gap-1.5">
			{#if card.external}
				<RiExternalLinkLine class="size-3.5 shrink-0 text-primary/50" aria-hidden="true" />
			{/if}
			<span class="min-w-0 truncate text-xs font-medium text-primary">{card.title}</span>
		</div>
		{#if card.loading}
			<p class="mt-1 text-[11px] text-primary/40">…</p>
		{:else if card.text}
			<p class="mt-1.5 line-clamp-4 text-xs leading-relaxed text-primary/60">{card.text}</p>
		{/if}
	</div>
{/if}
