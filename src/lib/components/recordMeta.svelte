<script lang="ts">
	import {
		META_EXTRA_LABELS,
		META_FIELDS,
		META_FIELD_ICON,
		META_VALUES,
		META_VALUE_ICON,
		META_VALUE_INFO,
		ISSUER_LOGO,
		LICENSE_LINK,
		logoDarkClass
	} from '#lib/meta.js';
	import { isExternalHref } from '#lib/links.js';
	import RecordLink from './recordLink.svelte';
	import * as HoverCard from '#lib/components/ui/hover-card/index.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import * as m from '#lib/paraglide/messages.js';

	let {
		meta,
		links = {},
		logos = {},
		previews = {},
		siteInfo = {}
	}: {
		meta?: Record<string, unknown> | null;
		links?: Record<string, string>;
		logos?: Record<string, string>;
		previews?: Record<string, { title: string; description?: string; logo?: string; tag?: string }>;
		siteInfo?: Record<string, { title?: string; description?: string }>;
	} = $props();

	const EXCLUDED = new Set([
		'title',
		'name',
		'sites',
		'description',
		'logo',
		'aliases',
		'reviewedBy'
	]);
	const META_KEYS = new Set(META_FIELDS.map(([key]) => key));

	const values = (v: unknown): unknown[] =>
		(Array.isArray(v) ? v : [v]).filter((x) => x !== undefined && x !== null && x !== '');

	const rows = $derived.by(() => {
		if (!meta) return [];
		const std = META_FIELDS.filter(([key]) => values(meta[key]).length).map(([key, label]) => ({
			key,
			label: label(),
			items: values(meta[key])
		}));
		const extra = Object.keys(meta)
			.filter((key) => !META_KEYS.has(key) && !EXCLUDED.has(key) && values(meta[key]).length)
			.map((key) => ({ key, label: META_EXTRA_LABELS[key]?.() ?? key, items: values(meta[key]) }));
		return [...std, ...extra];
	});

	const display = (v: unknown) => META_VALUES[String(v)]?.() ?? String(v);
	const isTab = (v: unknown) => String(v) in META_VALUES;

	const FIELD_LABELS = new Map<string, () => string>([
		...META_FIELDS,
		...Object.entries(META_EXTRA_LABELS)
	]);

	const facts = (key: string): { label: string; value: string }[] => {
		if (!meta) return [];
		const pairs: [string, unknown][] =
			key === 'reviewStatus'
				? [
						['reviewedBy', meta.reviewedBy],
						['lastReviewed', meta.lastReviewed],
						['sourceChecked', meta.sourceChecked]
					]
				: key === 'status'
					? meta['applies-from']
						? [['applies-from', meta['applies-from']]]
						: [['published', meta.published]]
					: key === 'legalStatus'
						? [['issuer', meta.issuer]]
						: [];
		return pairs
			.filter(([, v]) => values(v).length)
			.map(([k, v]) => ({
				label: FIELD_LABELS.get(k)?.() ?? k,
				value: values(v).map(display).join(', ')
			}));
	};

	const DOT_GREEN = 'bg-green-500';
	const DOT_AMBER = 'bg-amber-500';
	const DOT_RED = 'bg-red-500';

	const dateDot = (v: unknown): string | null => {
		const d = new Date(String(v));
		if (Number.isNaN(d.getTime())) return null;
		const months = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
		return months <= 12 ? DOT_GREEN : months <= 24 ? DOT_AMBER : DOT_RED;
	};

	const relTime = (v: unknown): string | null => {
		const d = new Date(String(v));
		if (Number.isNaN(d.getTime())) return null;
		const days = Math.round((Date.now() - d.getTime()) / 86400000);
		const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
		if (days < 31) return rtf.format(-days, 'day');
		if (days < 365) return rtf.format(-Math.round(days / 30.44), 'month');
		return rtf.format(-Math.round(days / 365.25), 'year');
	};

	const dot = (key: string, v: unknown): string | null => {
		const s = String(v);
		if (key === 'status') {
			if (['in-force', 'active'].includes(s)) return DOT_GREEN;
			if (['draft', 'proposed', 'pending', 'under-review'].includes(s)) return DOT_AMBER;
			return DOT_RED;
		}
		if (key === 'reviewStatus') {
			if (['verified', 'granskad'].includes(s)) return DOT_GREEN;
			if (['stale', 'pending', 'in-progress'].includes(s)) return DOT_AMBER;
			return DOT_RED;
		}
		if (key === 'lastReviewed' || key === 'sourceChecked') return dateDot(v);
		return null;
	};

	const FLAG_SRC: Record<string, string> = {
		eu: '/flags/eu.svg',
		se: '/flags/sweden.svg',
		un: '/flags/un.svg'
	};

	const flagOf = (v: unknown): 'eu' | 'se' | 'un' | null => {
		const s = String(v);
		if (s === 'EU') return 'eu';
		if (['Sverige', 'Sweden', 'SE'].includes(s)) return 'se';
		if (['Internationell', 'International', 'UN', 'FN'].includes(s)) return 'un';
		return null;
	};

	const linkHref = (v: unknown, key?: string) => {
		const s = String(v);
		if (key === 'licenseClass' && LICENSE_LINK[s]) return LICENSE_LINK[s];
		if (links[s]) return links[s];
		if (/^https?:\/\//.test(s)) return s;
		return null;
	};

	const externalCard = (v: unknown) => {
		const url = String(v);
		const info = siteInfo[url];
		try {
			const u = new URL(url);
			const hostname = u.hostname.replace(/^www\./, '');
			return {
				title: info?.title ?? hostname,
				tag: info?.title ? hostname : m.ui_external_site(),
				description: info?.description ?? url,
				external: true
			};
		} catch {
			return undefined;
		}
	};
</script>

{#if rows.length}
	<footer class="not-prose mt-10 border-t border-primary/10 pt-5">
		<p class="mb-3 text-xs font-medium text-primary/70">{m.ui_metadata()}</p>
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<dl class="grid grid-cols-1 gap-x-8 gap-y-3 text-xs sm:grid-cols-2">
			{#each rows as r (r.label)}
				{@const Icon = META_FIELD_ICON[r.key]}
				<div class="flex items-baseline justify-between gap-x-4">
					<dt class="flex shrink-0 items-center gap-1.5 text-primary/50">
						{#if Icon}
							<Icon class="size-3.5" aria-hidden="true" />
						{/if}
						{r.label}
					</dt>
					<dd class="flex flex-wrap items-center justify-end gap-1 text-right text-primary">
						{#each r.items as item, i (i)}
							{@const href = linkHref(item, r.key)}
							{@const external = href ? isExternalHref(href) : false}
							{@const ValueIcon = META_VALUE_ICON[String(item)]}
							{@const dotClass = dot(r.key, item)}
							{#snippet markers()}
								{#if dotClass}
									<span class="size-1.5 rounded-full {dotClass}" aria-hidden="true"></span>
								{:else if ValueIcon}
									<ValueIcon class="size-3" aria-hidden="true" />
								{/if}
								{@const logo = logos[String(item)] ?? ISSUER_LOGO[String(item)]}
								{#if logo}
									<img
										src={logo}
										alt=""
										class="h-3 w-auto max-w-10 shrink-0 object-contain {logoDarkClass(logo)}"
									/>
								{/if}
								{@const flag = flagOf(item)}
								{#if flag && logo !== FLAG_SRC[flag]}
									<img src={FLAG_SRC[flag]} alt="" class="h-2.5 w-auto shrink-0 rounded-[1px]" />
								{/if}
							{/snippet}
							{@const preview = previews[String(item)]}
							{#snippet linkValue()}
								{#if href && preview}
									<RecordLink {href} card={preview} class="underline-offset-4 hover:underline"
										>{display(item)}</RecordLink
									>
								{:else if href && external}
									<RecordLink
										{href}
										card={externalCard(item)}
										class="underline-offset-4 hover:underline"
									>
										{display(item)}
									</RecordLink>
								{:else if href}
									<a {href} class="underline-offset-4 hover:underline">{display(item)}</a>
								{/if}
							{/snippet}
							{#if isTab(item)}
								{@const info = META_VALUE_INFO[String(item)]?.()}
								{@const detail = facts(r.key)}
								{#if (info || detail.length) && !href}
									<HoverCard.Root openDelay={150} closeDelay={80}>
										<HoverCard.Trigger
											class="inline-flex cursor-help items-center gap-1 rounded-md bg-primary/8 px-1.5 py-px text-primary/80"
										>
											{@render markers()}
											{display(item)}
										</HoverCard.Trigger>
										<HoverCard.Content side="top" class="w-60 p-3">
											<p class="text-xs font-medium text-primary">{display(item)}</p>
											{#if info}
												<p class="mt-1 text-xs leading-relaxed text-primary/60">{info}</p>
											{/if}
											{#if detail.length}
												<dl class="mt-2 space-y-1 border-t border-primary/10 pt-2">
													{#each detail as fact (fact.label)}
														<div class="flex items-baseline justify-between gap-3 text-[11px]">
															<dt class="shrink-0 text-primary/45">{fact.label}</dt>
															<dd class="text-right text-primary/75">{fact.value}</dd>
														</div>
													{/each}
												</dl>
											{/if}
										</HoverCard.Content>
									</HoverCard.Root>
								{:else}
									<span
										class="inline-flex items-center gap-1 rounded-md bg-primary/8 px-1.5 py-px text-primary/80"
									>
										{@render markers()}
										{#if href}{@render linkValue()}{:else}{display(item)}{/if}
									</span>
								{/if}
							{:else}
								{@const rel =
									r.key === 'lastReviewed' || r.key === 'sourceChecked' ? relTime(item) : null}
								<span class="inline-flex items-center gap-1">
									{@render markers()}
									{#if href}
										{@render linkValue()}
									{:else if rel}
										<HoverCard.Root openDelay={150} closeDelay={80}>
											<HoverCard.Trigger
												class="cursor-help underline decoration-primary/25 decoration-dotted underline-offset-4 hover:decoration-primary/60"
											>
												{display(item)}
											</HoverCard.Trigger>
											<HoverCard.Content side="top" class="w-auto px-2.5 py-1.5 text-xs">
												{rel}
											</HoverCard.Content>
										</HoverCard.Root>
									{:else}
										{display(item)}
									{/if}
								</span>
							{/if}
						{/each}
					</dd>
				</div>
			{/each}
		</dl>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</footer>
{/if}
