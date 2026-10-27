<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';

	let {
		type = 'website',
		title,
		description,
		url,
		image
	}: {
		type?: 'website' | 'article';
		title: string;
		description: string;
		url: string;
		image?: string;
	} = $props();

	const siteName = $derived.by(() => {
		try {
			return new URL(url).hostname;
		} catch {
			return 'regelverk.org';
		}
	});
</script>

<meta property="og:type" content={type} />
<meta property="og:site_name" content={siteName} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={url} />
<meta property="og:locale" content={getLocale() === 'sv' ? 'sv_SE' : 'en_US'} />
<meta property="og:locale:alternate" content={getLocale() === 'sv' ? 'en_US' : 'sv_SE'} />
{#if image}
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:image" content={image} />
{/if}
<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
