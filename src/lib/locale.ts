import { browser } from '$app/env';
import {
	cookieMaxAge,
	cookieName,
	getLocale,
	overwriteSetLocale,
	type Locale
} from '#lib/paraglide/runtime.js';

const SHARED_DOMAIN = 'regelverk.org';

if (browser) {
	overwriteSetLocale((locale: Locale, options?: { reload?: boolean }) => {
		const shared =
			location.hostname === SHARED_DOMAIN || location.hostname.endsWith(`.${SHARED_DOMAIN}`);
		const prev = getLocale();
		document.cookie = `${cookieName}=; path=/; max-age=0`;
		document.cookie =
			`${cookieName}=${locale}; path=/; max-age=${cookieMaxAge}` +
			(shared ? `; domain=${SHARED_DOMAIN}` : '');
		if (options?.reload !== false && locale !== prev) location.reload();
	});
}
