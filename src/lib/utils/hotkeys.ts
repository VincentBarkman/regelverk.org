const MOD_LABELS: Record<string, { mac: string; other: string }> = {
	mod: { mac: '⌘', other: 'Ctrl' },
	meta: { mac: '⌘', other: 'Meta' },
	ctrl: { mac: '⌃', other: 'Ctrl' },
	alt: { mac: '⌥', other: 'Alt' },
	option: { mac: '⌥', other: 'Alt' },
	shift: { mac: '⇧', other: 'Shift' }
};

function isApplePlatform(): boolean {
	if (typeof navigator === 'undefined') return false;

	const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
	const platform = nav.userAgentData?.platform ?? nav.platform ?? '';
	return /mac|iphone|ipad|ipod/i.test(platform);
}

export function formatShortcutLabel(shortcut: string): string {
	const mac = isApplePlatform();
	const parts = shortcut.toLowerCase().split('+');
	const key = parts[parts.length - 1];

	const mods = parts
		.slice(0, -1)
		.map((part) => MOD_LABELS[part]?.[mac ? 'mac' : 'other'] ?? part);

	const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1);

	return mac ? mods.join('') + label : [...mods, label].join('+');
}
