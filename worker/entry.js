// Entry wrapper around the SvelteKit Cloudflare adapter worker.
//
// SvelteKit serves a *rerouted* prerendered path before hooks run
// (respond.js fast path), so `/en/...` requests for prerendered pages get the
// base-locale HTML verbatim — including relative `../_app` asset URLs that
// resolve to `/en/_app/...` and 404, which kills hydration. SvelteKit hooks
// cannot intercept that path, so we post-process the response here: make the
// asset URLs absolute and fix the baked `lang` attribute. The client then
// hydrates and swaps to the localized UI.
import worker from '../.svelte-kit/cloudflare/_worker.js';

const LOCALES = ['en'];

export default {
	async fetch(request, env, ctx) {
		const res = await worker.fetch(request, env, ctx);

		const { pathname } = new URL(request.url);
		const segment = pathname.split('/')[1];
		if (!LOCALES.includes(segment)) return res;
		if (!res.headers.get('content-type')?.includes('text/html')) return res;

		const headers = new Headers(res.headers);
		// ASSETS may serve pre-compressed bodies; res.text() yields decoded text,
		// so drop the now-wrong headers before re-wrapping.
		headers.delete('content-encoding');
		headers.delete('content-length');

		const html = (await res.text())
			.replace(/(\.\.?\/)+_app\//g, '/_app/')
			.replace('<html lang="sv"', `<html lang="${segment}"`);

		return new Response(html, {
			status: res.status,
			statusText: res.statusText,
			headers
		});
	}
};
