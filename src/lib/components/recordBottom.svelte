<script lang="ts">
	import * as m from '#lib/paraglide/messages.js';
	import { logoDarkClass } from '#lib/meta.js';
	import RecordLink from './recordLink.svelte';

	type Link = { href: string; title: string; logo?: string; description?: string; tag?: string };

	let {
		related,
		scopes,
		subs = [],
		more,
		moreHref,
		moreLabel
	}: {
		related: Link[];
		scopes: Link[];
		subs?: Link[];
		more: Link[];
		moreHref?: string;
		moreLabel: string;
	} = $props();
</script>

{#if related.length || scopes.length || subs.length || more.length}
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
								class="flex items-center gap-1.5 text-primary/60 hover:text-primary"
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
					{#each subs as l (l.href)}
						<li>
							<RecordLink
								href={l.href}
								card={l}
								class="block truncate text-primary/60 hover:text-primary"
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
								class="block truncate text-primary/60 hover:text-primary">{l.title}</a
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
								class="block truncate text-primary/60 hover:text-primary"
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
