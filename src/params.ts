import { defineParams } from '@sveltejs/kit/params';
import { isSiteScope } from './lib/sites.ts';
import { isEntity } from './lib/entities.ts';

// regelverk is served at `/`, so it never matches as a site param.
export const params = defineParams({
	site: (param) => (isSiteScope(param) && param !== 'regelverk' ? param : undefined),
	entity: (param) => (isEntity(param) ? param : undefined),
	legal: (param) => (['privacy', 'terms', 'disclaimer'].includes(param) ? param : undefined)
});
