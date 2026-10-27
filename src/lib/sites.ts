export const SITE_SCOPES = [
	'regelverk',
	'ot',
	'it',
	'fysisk',
	'brandskydd',
	'el',
	'arbetsmiljo'
] as const;

export type SiteScope = (typeof SITE_SCOPES)[number];

export interface Site {
	label: string;
	subdomain: string | null;
	colorClass: string;
	softClass: string;
}

export const SITES: Record<SiteScope, Site> = {
	regelverk: {
		label: 'Global',
		subdomain: null,
		colorClass: 'text-amber-700',
		softClass: 'bg-amber-700/8'
	},
	ot: {
		label: 'OT',
		subdomain: 'ot',
		colorClass: 'text-orange-600',
		softClass: 'bg-orange-600/8'
	},
	it: {
		label: 'IT',
		subdomain: 'it',
		colorClass: 'text-blue-600',
		softClass: 'bg-blue-600/8'
	},
	fysisk: {
		label: 'Fysisk',
		subdomain: 'fysisk',
		colorClass: 'text-purple-600',
		softClass: 'bg-purple-600/8'
	},
	brandskydd: {
		label: 'Brandskydd',
		subdomain: 'brandskydd',
		colorClass: 'text-red-600',
		softClass: 'bg-red-600/8'
	},
	el: {
		label: 'El',
		subdomain: 'el',
		colorClass: 'text-yellow-600',
		softClass: 'bg-yellow-600/10'
	},
	arbetsmiljo: {
		label: 'Arbetsmiljö',
		subdomain: 'arbetsmiljo',
		colorClass: 'text-green-600',
		softClass: 'bg-green-600/8'
	}
};

export const SITE_COLOR: Record<SiteScope, string> = {
	regelverk: '#b45309',
	ot: '#ea580c',
	it: '#2563eb',
	fysisk: '#9333ea',
	brandskydd: '#dc2626',
	el: '#ca8a04',
	arbetsmiljo: '#16a34a'
};

export function siteFavicon(scope: SiteScope): string {
	return scope === 'regelverk' ? '/favicon.svg' : `/favicon-${scope}.svg`;
}

export function sitePngIcon(scope: SiteScope, size: 192 | 512): string {
	return `/icon-${size}-${scope}.png`;
}

export function siteAppleIcon(scope: SiteScope): string {
	return `/apple-touch-icon-${scope}.png`;
}

export function siteOgImage(scope: SiteScope): string {
	return `/og-${scope}.png`;
}

export function siteHost(scope: SiteScope): string {
	const sub = SITES[scope].subdomain;
	return sub ? `${sub}.regelverk.org` : 'regelverk.org';
}

export function isSiteScope(value: unknown): value is SiteScope {
	return typeof value === 'string' && value in SITES;
}

export function scopeFromHost(hostname: string): SiteScope | null {
	const match =
		hostname.match(/^([\w-]+)\.regelverk\.org$/) ?? hostname.match(/^([\w-]+)\.localhost$/);
	return isSiteScope(match?.[1]) ? match[1] : null;
}
