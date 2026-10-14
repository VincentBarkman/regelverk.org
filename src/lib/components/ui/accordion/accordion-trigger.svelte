<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import RiArrowDownSLine from 'remixicon-svelte/icons/arrow-down-s-line';
	import RiArrowUpSLine from 'remixicon-svelte/icons/arrow-up-s-line';
	import { cn, type WithoutChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		level = 3,
		children,
		...restProps
	}: WithoutChild<AccordionPrimitive.TriggerProps> & {
		level?: AccordionPrimitive.HeaderProps['level'];
	} = $props();
</script>

<AccordionPrimitive.Header {level} class="flex">
	<AccordionPrimitive.Trigger
		data-slot="accordion-trigger"
		bind:ref
		class={cn(
			'group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		<RiArrowDownSLine
			data-slot="accordion-trigger-icon"
			class="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
		/>
		<RiArrowUpSLine
			data-slot="accordion-trigger-icon"
			class="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
		/>
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
