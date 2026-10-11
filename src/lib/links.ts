const DOMAIN = 'regelverk.org';

export function isExternalHref(href: string | undefined | null): boolean {
	if (!href || !/^https?:\/\//i.test(href)) return false;
	try {
		const { hostname } = new URL(href);
		return hostname !== DOMAIN && !hostname.endsWith(`.${DOMAIN}`);
	} catch {
		return false;
	}
}
