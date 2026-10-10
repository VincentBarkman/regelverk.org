<script lang="ts">
	import SiteHome from '#lib/components/siteHome.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<SiteHome scope={data.scope} />
