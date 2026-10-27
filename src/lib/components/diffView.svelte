<script lang="ts">
	import * as m from '#lib/paraglide/messages.js';
	import type { DiffLine } from '#lib/diff.js';

	let {
		a,
		b,
		lines
	}: {
		a: { title: string };
		b: { title: string };
		lines: DiffLine[];
	} = $props();

	type Row = DiffLine | { type: 'gap'; count: number };
	const rows = $derived(collapse(lines));

	function collapse(ls: DiffLine[]): Row[] {
		const out: Row[] = [];
		let i = 0;
		while (i < ls.length) {
			if (ls[i].type === 'same') {
				let j = i;
				while (j < ls.length && ls[j].type === 'same') j++;
				const count = j - i;
				if (count > 6) {
					out.push(ls[i]);
					out.push({ type: 'gap', count: count - 2 });
					out.push(ls[j - 1]);
				} else {
					for (let k = i; k < j; k++) out.push(ls[k]);
				}
				i = j;
			} else {
				out.push(ls[i]);
				i++;
			}
		}
		return out;
	}
</script>

<div class="not-prose">
	<p class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary/60">
		<span class="inline-flex items-center gap-1.5">
			<span class="inline-block size-2 rounded-full bg-red-500/60" aria-hidden="true"></span>
			{m.ui_diff_removed()}: <span class="font-medium text-primary">{a.title}</span>
		</span>
		<span class="inline-flex items-center gap-1.5">
			<span class="inline-block size-2 rounded-full bg-green-600/60" aria-hidden="true"></span>
			{m.ui_diff_added()}: <span class="font-medium text-primary">{b.title}</span>
		</span>
	</p>
	<div
		class="overflow-x-auto rounded-lg border border-primary/15 font-mono text-xs leading-relaxed"
	>
		{#each rows as row, ri (ri)}
			{#if row.type === 'gap'}
				<div class="border-y border-primary/10 bg-primary/3 px-3 py-1 text-primary/40">
					··· {row.count}
				</div>
			{:else}
				<div
					class="px-3 whitespace-pre-wrap {row.type === 'add'
						? 'bg-green-600/10 text-green-800 dark:text-green-300'
						: row.type === 'del'
							? 'bg-red-500/10 text-red-800 dark:text-red-300'
							: 'text-primary/50'}"
				>
					<span class="mr-2 inline-block w-4 text-right opacity-50 select-none"
						>{row.type === 'add' ? '+' : row.type === 'del' ? '−' : ' '}</span
					>{row.text || ' '}
				</div>
			{/if}
		{/each}
	</div>
</div>
