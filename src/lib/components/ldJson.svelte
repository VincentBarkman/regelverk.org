<script lang="ts">
	let { json }: { json?: string } = $props();
	const tag = $derived(
		json ? `<script type="application/ld+json">${json.replace(/</g, '\\u003c')}</` + `script>` : ''
	);
</script>

{#if tag}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html tag}
{/if}
