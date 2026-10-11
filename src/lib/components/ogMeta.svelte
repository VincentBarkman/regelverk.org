<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';

	let {
		type = 'website',
		title,
		description,
		url
	}: {
		type?: 'website' | 'article';
		title: string;
		description: string;
		url: string;
	} = $props();
</script>

<meta property="og:type" content={type} />
<meta property="og:site_name" content="regelverk.org" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={url} />
<meta property="og:locale" content={getLocale() === 'sv' ? 'sv_SE' : 'en_US'} />
<meta property="og:locale:alternate" content={getLocale() === 'sv' ? 'en_US' : 'sv_SE'} />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
