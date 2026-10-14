<script lang="ts">
	let { data }: { data: Record<string, unknown> } = $props();
	const tag = $derived(
		`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</` +
			`script>`
	);
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html tag}
</svelte:head>
