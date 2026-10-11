import { dev } from '$app/env';
import { siteHost, type SiteScope } from './sites.js';

export function legalHref(scope: SiteScope, page: string): string {
	return dev
		? scope === 'regelverk'
			? `/legal/${page}`
			: `/${scope}/legal/${page}`
		: `https://${siteHost(scope)}/legal/${page}`;
}

export function legalIndexHref(scope: SiteScope): string {
	return dev
		? scope === 'regelverk'
			? '/legal'
			: `/${scope}/legal`
		: `https://${siteHost(scope)}/legal`;
}
