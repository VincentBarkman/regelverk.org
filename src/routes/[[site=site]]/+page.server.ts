import { SITE_SCOPE } from '$app/env/private';
import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import { scopeFromHost } from '#lib/sites.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	// Path-based site switching (/ot, /it, ...) is a development convenience —
	// in production each site is selected by its subdomain or SITE_SCOPE.
	if (params.site !== undefined) {
		if (!dev) error(404, 'Not found');
		return { scope: params.site };
	}

	return { scope: SITE_SCOPE ?? scopeFromHost(url.hostname) ?? 'regelverk' };
};
