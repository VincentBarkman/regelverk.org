import type { Handle } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { commits } from '#lib/generated/commits.js';

const EDGE_TTL = 86400;
const BROWSER_TTL = 300;

interface EdgeCache {
	match(request: Request): Promise<Response | undefined>;
	put(request: Request, response: Response): Promise<void>;
}

const cacheable = (request: Request) => {
	if (request.method !== 'GET') return false;
	const { pathname } = new URL(request.url);
	return !pathname.startsWith('/api/');
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, async ({ request, locale }) => {
		const respond = () =>
			resolve(
				{ ...event, request },
				{
					transformPageChunk: ({ html }) =>
						html
							.replace('%paraglide.lang%', locale)
							.replace('%paraglide.dir%', getTextDirection(locale))
				}
			);

		const cache = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
		if (!cache || !cacheable(request)) return respond();

		const keyUrl = new URL(request.url);
		keyUrl.searchParams.set('__l', locale);
		keyUrl.searchParams.set('__v', commits[0]?.hash ?? 'dev');
		const key = new Request(keyUrl, { method: 'GET' });

		const hit = await cache.match(key);
		if (hit) {
			const res = new Response(hit.body, hit);
			res.headers.set('Cache-Control', `public, max-age=${BROWSER_TTL}`);
			res.headers.set('x-cache', 'HIT');
			return res;
		}

		const res = await respond();
		if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
			const stored = res.clone();
			stored.headers.set('Cache-Control', `public, max-age=${EDGE_TTL}`);
			await cache.put(key, stored);
		}
		res.headers.set('Cache-Control', `public, max-age=${BROWSER_TTL}`);
		res.headers.set('x-cache', 'MISS');
		return res;
	});

export const handle: Handle = handleParaglide;
