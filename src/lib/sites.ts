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
	/** Short label for nav links. */
	label: string;
	/** Subdomain on regelverk.org, or null for the apex domain. */
	subdomain: string | null;
	/** Tailwind text color class for the subdomain part of the wordmark. */
	colorClass: string;
}

export const SITES: Record<SiteScope, Site> = {
	regelverk: {
		label: 'Global',
		subdomain: null,
		colorClass: 'text-amber-700'
	},
	ot: {
		label: 'OT',
		subdomain: 'ot',
		colorClass: 'text-slate-600'
	},
	it: {
		label: 'IT',
		subdomain: 'it',
		colorClass: 'text-blue-600'
	},
	fysisk: {
		label: 'Fysisk',
		subdomain: 'fysisk',
		colorClass: 'text-purple-600'
	},
	brandskydd: {
		label: 'Brandskydd',
		subdomain: 'brandskydd',
		colorClass: 'text-red-600'
	},
	el: {
		label: 'El',
		subdomain: 'el',
		colorClass: 'text-yellow-600'
	},
	arbetsmiljo: {
		label: 'Arbetsmiljö',
		subdomain: 'arbetsmiljo',
		colorClass: 'text-green-600'
	}
};

export function siteHost(scope: SiteScope): string {
	const sub = SITES[scope].subdomain;
	return sub ? `${sub}.regelverk.org` : 'regelverk.org';
}

export function isSiteScope(value: unknown): value is SiteScope {
	return typeof value === 'string' && value in SITES;
}

/**
 * Derive a scope from the request hostname, e.g. `it.regelverk.org`.
 * `*.localhost` is also recognized so `ot.localhost:5173` works in dev
 * without an env var.
 */
export function scopeFromHost(hostname: string): SiteScope | null {
	const match =
		hostname.match(/^([\w-]+)\.regelverk\.org$/) ?? hostname.match(/^([\w-]+)\.localhost$/);
	return isSiteScope(match?.[1]) ? match[1] : null;
}
