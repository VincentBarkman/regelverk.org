import { dev } from '$app/env';
import type { Handle } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { commits } from '#lib/generated/commits.js';

const EDGE_TTL = 86400;
const BROWSER_TTL = 300;

const CSP = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data:",
	"font-src 'self'",
	`connect-src 'self'${dev ? ' ws: wss:' : ''}`,
	"manifest-src 'self'",
	"object-src 'none'",
	"base-uri 'none'",
	"form-action 'self'",
	"frame-ancestors 'self'"
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
	'content-security-policy': CSP,
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'x-frame-options': 'SAMEORIGIN',
	'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};

const secure = (res: Response) => {
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
	return res;
};

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
		const respond = async () => {
			const res = await resolve(
				{ ...event, request },
				{
					transformPageChunk: ({ html }) =>
						html
							.replace('%paraglide.lang%', locale)
							.replace('%paraglide.dir%', getTextDirection(locale))
				}
			);
			return res;
		};

		const cache = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
		if (!cache || !cacheable(request)) return secure(await respond());

		const keyUrl = new URL(request.url);
		keyUrl.searchParams.set('__l', locale);
		keyUrl.searchParams.set('__v', commits[0]?.hash ?? 'dev');
		const key = new Request(keyUrl, { method: 'GET' });

		const hit = await cache.match(key);
		if (hit) {
			const res = new Response(hit.body, hit);
			res.headers.set('Cache-Control', `public, max-age=${BROWSER_TTL}`);
			res.headers.set('x-cache', 'HIT');
			return secure(res);
		}

		const res = await respond();
		if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
			const stored = res.clone();
			stored.headers.set('Cache-Control', `public, max-age=${EDGE_TTL}`);
			await cache.put(key, stored);
		}
		res.headers.set('Cache-Control', `public, max-age=${BROWSER_TTL}`);
		res.headers.set('x-cache', 'MISS');
		return secure(res);
	});

export const handle: Handle = handleParaglide;
