import { defineParams } from '@sveltejs/kit/params';
import { isSiteScope } from '#lib/sites.js';

// The global `regelverk` site is served at `/`, so it never matches here.
export const params = defineParams({
	site: (param) => (isSiteScope(param) && param !== 'regelverk' ? param : undefined)
});
