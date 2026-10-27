<script lang="ts">
	import * as m from '#lib/paraglide/messages.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { isBookmarked, toggleBookmark, type Bookmark } from '#lib/bookmarks.svelte.js';
	import RiBookmarkLine from 'remixicon-svelte/icons/bookmark-line';
	import RiBookmarkFill from 'remixicon-svelte/icons/bookmark-fill';

	let { scope, entity, id, title }: Bookmark = $props();

	const saved = $derived(isBookmarked(entity, id));
	const label = $derived(saved ? m.bookmark_remove() : m.bookmark_add());
</script>

<Button
	variant="ghost"
	size="xs"
	onclick={() => toggleBookmark({ scope, entity, id, title })}
	class="not-prose shrink-0 text-primary/60"
	title={label}
	aria-label={label}
	aria-pressed={saved}
>
	{#if saved}
		<RiBookmarkFill class="size-4" aria-hidden="true" />
	{:else}
		<RiBookmarkLine class="size-4" aria-hidden="true" />
	{/if}
</Button>
