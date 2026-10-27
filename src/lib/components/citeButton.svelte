<script lang="ts">
	import * as m from '#lib/paraglide/messages.js';
	import { Button } from '#lib/components/ui/button/index.js';

	let { title, meta, url }: { title: string; meta: Record<string, unknown> | null; url: string } =
		$props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const citation = $derived.by(() => {
		const parts = [title];
		const desig = meta?.designation ?? meta?.short;
		if (typeof desig === 'string' && desig && desig !== title) parts.push(`(${desig})`);
		const issuer = meta?.issuer;
		if (typeof issuer === 'string' && issuer) parts.push(`— ${issuer}`);
		return `${parts.join(' ')}. ${url}`;
	});

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(citation);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			// clipboard unavailable
		}
	};
</script>

<Button
	variant="ghost"
	size="xs"
	onclick={copy}
	class="not-prose shrink-0 text-primary/60"
	title={m.ui_copy_citation()}
	aria-label={m.ui_copy_citation()}
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
			><rect x="9" y="9" width="13" height="13" rx="2" /><path
				d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
			/></svg
		>
		{m.ui_copy_citation()}
	{/if}
</Button>
