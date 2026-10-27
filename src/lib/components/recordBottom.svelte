<script lang="ts">
	import * as m from '#lib/paraglide/messages.js';
	import { logoDarkClass } from '#lib/meta.js';
	import RecordLink from './recordLink.svelte';

	type Link = { href: string; title: string; logo?: string; description?: string; tag?: string };
	type Version = {
		href: string;
		title: string;
		version?: string;
		published?: string;
		status?: string;
		diffHref?: string;
	};

	let {
		related,
		referencedBy = [],
		versions = [],
		scopes,
		subs = [],
		more,
		moreHref,
		moreLabel
	}: {
		related: Link[];
		referencedBy?: Link[];
		versions?: Version[];
		scopes: Link[];
		subs?: Link[];
		more: Link[];
		moreHref?: string;
		moreLabel: string;
	} = $props();

	const SUBS_LIMIT = 8;
	let subsOpen = $state(false);
	const subsShown = $derived(subsOpen ? subs : subs.slice(0, SUBS_LIMIT));
	const VERSIONS_LIMIT = 8;
	let versionsOpen = $state(false);
	const versionsShown = $derived(versionsOpen ? versions : versions.slice(0, VERSIONS_LIMIT));
</script>

{#if related.length || referencedBy.length || versions.length || scopes.length || subs.length || more.length}
	<footer
		class="not-prose mt-10 grid grid-cols-1 gap-6 border-t border-primary/10 pt-5 sm:grid-cols-3"
	>
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		{#if related.length}
			<div>
				<p class="mb-2 text-xs font-medium text-primary/70">{m.ui_related_refs()}</p>
				<ul class="flex flex-col gap-1.5 text-xs">
					{#each related as l (l.href)}
						<li>
							<RecordLink
								href={l.href}
								card={l}
								class="flex min-h-6 items-center gap-1.5 py-1 text-primary/60 hover:text-primary"
							>
								{#if l.logo}<img
										src={l.logo}
										alt=""
										class="h-3.5 w-auto shrink-0 {logoDarkClass(l.logo)}"
									/>{/if}
								<span class="truncate">{l.title}</span>
							</RecordLink>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if subs.length}
			<div>
				<p class="mb-2 text-xs font-medium text-primary/70">{m.ui_subpages()}</p>
				<ul class="flex flex-col gap-1.5 text-xs">
					{#each subsShown as l (l.href)}
						<li>
							<RecordLink
								href={l.href}
								card={l}
								class="block min-h-6 truncate py-1 text-primary/60 hover:text-primary"
							>
								{l.title}
							</RecordLink>
						</li>
					{/each}
					{#if subs.length > SUBS_LIMIT}
						<li>
							<button
								type="button"
								onclick={() => (subsOpen = !subsOpen)}
								aria-expanded={subsOpen}
								class="flex min-h-6 items-center py-1 font-medium text-primary/80 hover:text-primary"
								>{subsOpen
									? m.ui_show_less() + ' ↑'
									: m.ui_show_all_count({ count: subs.length }) + ' ↓'}</button
							>
						</li>
					{/if}
				</ul>
			</div>
		{/if}
		{#if versions.length}
			<div>
				<p class="mb-2 text-xs font-medium text-primary/70">{m.ui_versions()}</p>
				<ul class="flex flex-col gap-1.5 text-xs">
					{#each versionsShown as v (v.href)}
						<li class="flex flex-col gap-0.5">
							<RecordLink
								href={v.href}
								class="block min-h-6 truncate py-1 font-medium text-primary/80 hover:text-primary"
							>
								{v.title}
							</RecordLink>
							<span class="flex flex-wrap items-center gap-x-2 text-[11px] text-primary/50">
								{#if v.version}<span>{v.version}</span>{/if}
								{#if v.published}<span>{v.published}</span>{/if}
								{#if v.status}<span>{v.status}</span>{/if}
								{#if v.diffHref}
									<a href={v.diffHref} class="underline underline-offset-2 hover:text-primary"
										>{m.ui_compare()} →</a
									>
								{/if}
							</span>
						</li>
					{/each}
					{#if versions.length > VERSIONS_LIMIT}
						<li>
							<button
								type="button"
								onclick={() => (versionsOpen = !versionsOpen)}
								aria-expanded={versionsOpen}
								class="flex min-h-6 items-center py-1 font-medium text-primary/80 hover:text-primary"
								>{versionsOpen
									? m.ui_show_less() + ' ↑'
									: m.ui_show_all_count({ count: versions.length }) + ' ↓'}</button
							>
						</li>
					{/if}
				</ul>
			</div>
		{/if}
		{#if referencedBy.length}
			<div>
				<p class="mb-2 text-xs font-medium text-primary/70">{m.ui_referenced_by()}</p>
				<ul class="flex flex-col gap-1.5 text-xs">
					{#each referencedBy as l (l.href)}
						<li>
							<RecordLink
								href={l.href}
								card={l}
								class="block min-h-6 truncate py-1 text-primary/60 hover:text-primary"
							>
								{l.title}
							</RecordLink>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if scopes.length}
			<div>
				<p class="mb-2 text-xs font-medium text-primary/70">{m.ui_coverage()}</p>
				<ul class="flex flex-col gap-1.5 text-xs">
					{#each scopes as l (l.href)}
						<li>
							<a
								href={l.href}
								title={l.title}
								class="block min-h-6 truncate py-1 text-primary/60 hover:text-primary">{l.title}</a
							>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if more.length}
			<div>
				<p class="mb-2 text-xs font-medium text-primary/70">{moreLabel}</p>
				<ul class="flex flex-col gap-1.5 text-xs">
					{#each more as l (l.href)}
						<li>
							<RecordLink
								href={l.href}
								card={l}
								class="block min-h-6 truncate py-1 text-primary/60 hover:text-primary"
							>
								{l.title}
							</RecordLink>
						</li>
					{/each}
					{#if moreHref}
						<li>
							<a href={moreHref} class="font-medium text-primary/80 hover:text-primary"
								>{m.ui_view_all()} →</a
							>
						</li>
					{/if}
				</ul>
			</div>
		{/if}
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</footer>
{/if}
