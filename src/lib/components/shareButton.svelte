<script lang="ts">
	import * as m from '#lib/paraglide/messages.js';
	import { Button } from '#lib/components/ui/button/index.js';

	let { url, title }: { url: string; title?: string } = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const share = async () => {
		if (navigator.share) {
			try {
				await navigator.share({ title, url });
				return;
			} catch (e) {
				if ((e as DOMException).name === 'AbortError') return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			// clipboard unavailable (e.g. insecure context) — nothing else to do
		}
	};
</script>

<Button
	variant="ghost"
	size="xs"
	onclick={share}
	class="not-prose shrink-0 text-primary/60"
	title={m.ui_share()}
	aria-label={m.ui_share()}
>
	{#if copied}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
		>
		{m.ui_copied()}
	{:else}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle
				cx="18"
				cy="19"
				r="3"
			/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line
				x1="15.41"
				x2="8.59"
				y1="6.51"
				y2="10.49"
			/></svg
		>
		{m.ui_share()}
	{/if}
</Button>
