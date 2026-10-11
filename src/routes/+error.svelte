<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import SearchBar from '#lib/components/searchBar.svelte';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as m from '#lib/paraglide/messages.js';

	const notFound = $derived(page.status === 404);
	const title = $derived(notFound ? m.err_not_found_title() : m.err_generic_title());
	const description = $derived(notFound ? m.err_not_found_desc() : m.err_generic_desc());
</script>

<svelte:head>
	<title>{page.status} · {title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-svh items-center justify-center px-4">
	<Empty.Root class="border-0">
		<Empty.Header>
			<Empty.Title class="font-serif text-3xl font-medium">
				<a href={resolve('/[[site=site]]', {})} class="underline-offset-4 hover:underline"
					>{page.status} – {title}</a
				>
			</Empty.Title>
			<Empty.Description>{description}</Empty.Description>
		</Empty.Header>
		<Empty.Content>
			<SearchBar
				inputId="error-search"
				width="w-full sm:w-80"
				enableTyper={false}
				staticPlaceholder={m.err_search_placeholder()}
			/>
			<Empty.Description>
				{m.err_need_help()}
				<a
					href="https://github.com/VincentBarkman/regelverk.org/issues/new"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary underline underline-offset-4 hover:decoration-primary/60"
					>{m.err_open_issue()}</a
				>
			</Empty.Description>
		</Empty.Content>
	</Empty.Root>
</div>
