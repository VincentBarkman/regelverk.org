import { defineEnvVars } from '@sveltejs/kit/env';
import { isSiteScope, SITE_SCOPES } from '#lib/sites.js';

export const variables = defineEnvVars({
	SITE_SCOPE: {
		description:
			'Which site this deployment serves. One of: ' + SITE_SCOPES.join(', '),
		schema: (value) => {
			if (value === undefined) return undefined;
			if (!isSiteScope(value)) {
				throw new Error(`Invalid SITE_SCOPE "${value}" (expected one of: ${SITE_SCOPES.join(', ')})`);
			}
			return value;
		}
	}
});
