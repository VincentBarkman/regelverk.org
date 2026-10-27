import { resolveScope } from '#lib/scope.js';
import { SITE_COLOR, sitePngIcon } from '#lib/sites.js';
import { siteTitle, SITE_LONG, SITE_DESC } from '#lib/meta.js';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = ({ url }) => {
	const scope = resolveScope(undefined, url.hostname);
	const manifest = {
		id: '/',
		name: siteTitle(scope),
		short_name: scope === 'regelverk' ? 'regelverk.org' : SITE_LONG[scope](),
		description: SITE_DESC[scope](),
		start_url: '/',
		scope: '/',
		display: 'standalone',
		background_color: '#ffffff',
		theme_color: SITE_COLOR[scope],
		icons: [
			{ src: sitePngIcon(scope, 192), sizes: '192x192', type: 'image/png' },
			{ src: sitePngIcon(scope, 512), sizes: '512x512', type: 'image/png' },
			{ src: sitePngIcon(scope, 512), sizes: '512x512', type: 'image/png', purpose: 'maskable' }
		]
	};
	return new Response(JSON.stringify(manifest), {
		headers: { 'content-type': 'application/manifest+json; charset=utf-8' }
	});
};
