export function fitText(node: HTMLElement, maxRem = 3) {
	const resize = () => {
		node.style.fontSize = `${maxRem}rem`;
		const parent = node.parentElement;
		if (!parent) return;
		const ps = getComputedStyle(parent);
		let max = parent.clientWidth;
		if (ps.display === 'flex' && ps.flexDirection.startsWith('row')) {
			const siblings = [...parent.children].filter((c) => c !== node);
			const gap = parseFloat(ps.columnGap) || 0;
			const taken = siblings.reduce((w, el) => w + (el as HTMLElement).offsetWidth, 0);
			max -= taken + gap * siblings.length;
		}
		if (node.scrollWidth > max) {
			node.style.fontSize = `${(maxRem * max) / node.scrollWidth}rem`;
		}
	};
	resize();
	window.addEventListener('resize', resize);
	return { destroy: () => window.removeEventListener('resize', resize) };
}
