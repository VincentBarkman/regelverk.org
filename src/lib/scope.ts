import { SITE_SCOPE } from '$app/env/private';
import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import { scopeFromHost, type SiteScope } from '#lib/sites.js';

export function resolveScope(site: string | undefined, hostname: string): SiteScope {
	if (site !== undefined) {
		if (!dev) error(404, 'Not found');
		return site as SiteScope;
	}
	return (SITE_SCOPE as SiteScope | undefined) ?? scopeFromHost(hostname) ?? 'regelverk';
}
