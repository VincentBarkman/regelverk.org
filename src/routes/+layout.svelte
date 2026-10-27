<script lang="ts">
	import './layout.css';
	import '#lib/theme.svelte.js';
	import { ModeWatcher } from 'mode-watcher';
	import * as m from '#lib/paraglide/messages.js';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a
	href="#main-content"
	class="fixed top-2 left-2 z-50 -translate-y-[200%] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus-visible:translate-y-0"
	>{m.ui_skip_to_content()}</a
>
<ModeWatcher defaultMode="light" />
{@render children()}
