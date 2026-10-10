<script lang="ts">
	import type { SiteScope } from '#lib/sites.js';

	let { scope, class: className }: { scope: SiteScope; class?: string } = $props();
</script>

<svg viewBox="0 0 24 24" fill="currentColor" class={className} aria-hidden="true">
	{#if scope === 'regelverk'}
		<rect x="4" y="4" width="7" height="7" rx="1.5" />
		<rect x="13" y="4" width="7" height="7" rx="1.5" />
		<rect x="4" y="13" width="7" height="7" rx="1.5" />
		<rect x="13" y="13" width="7" height="7" rx="1.5" />
	{:else if scope === 'ot'}
		<g stroke="currentColor" stroke-width="4" stroke-linecap="round">
			<path d="M12 6v12" />
			<path d="M6.8 9l10.4 6" />
			<path d="M6.8 15 17.2 9" />
		</g>
	{:else if scope === 'it'}
		<path d="M12 1.8 21 5v7c0 5.2-3.8 9-9 10.2C6.8 21 3 17.2 3 12V5z" />
	{:else if scope === 'fysisk'}
		<path
			d="M9 3h6l6 6v6l-6 6H9l-6-6V9Z"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linejoin="round"
		/>
	{:else if scope === 'brandskydd'}
		<path
			d="M12 4.5 20.5 19h-17Z"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
	{:else if scope === 'el'}
		<path
			d="M14 2.5 6 13.5h4.5L9 21.5 18 10h-4.5Z"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linejoin="round"
		/>
	{:else}
		<path d="M4 20v-6.5h5.2V9h5.2V4h5.2v16z" />
	{/if}
</svg>
