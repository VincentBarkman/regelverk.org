<script lang="ts">
	let { items }: { items: { label: string; href?: string }[] } = $props();
</script>

{#if items.length}
	<nav aria-label="Breadcrumb" class="not-prose mb-5">
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<ol class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-primary/50">
			{#each items as item, i (i)}
				{#if i > 0}<li aria-hidden="true" class="select-none">/</li>{/if}
				<li>
					{#if item.href}
						<a href={item.href} class="underline-offset-4 hover:underline hover:text-primary"
							>{item.label}</a
						>
					{:else}
						<span aria-current="page" class="text-primary/70">{item.label}</span>
					{/if}
				</li>
			{/each}
		</ol>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</nav>
{/if}
