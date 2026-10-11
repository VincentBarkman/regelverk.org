import { browser } from '$app/env';
import {
	cookieMaxAge,
	cookieName,
	getLocale,
	overwriteSetLocale,
	type Locale
} from '#lib/paraglide/runtime.js';

const SHARED_DOMAIN = 'regelverk.org';

const isSharedHost = (host: string) => host === SHARED_DOMAIN || host.endsWith(`.${SHARED_DOMAIN}`);

const writeCookie = (locale: Locale, shared: boolean) => {
	document.cookie = `${cookieName}=; path=/; max-age=0`;
	document.cookie =
		`${cookieName}=${locale}; path=/; max-age=${cookieMaxAge}` +
		(shared ? `; domain=${SHARED_DOMAIN}` : '');
};

if (browser) {
	const shared = isSharedHost(location.hostname);
	if (shared) writeCookie(getLocale(), true);

	overwriteSetLocale((locale: Locale, options?: { reload?: boolean }) => {
		const prev = getLocale();
		writeCookie(locale, shared);
		if (options?.reload !== false && locale !== prev) location.reload();
	});
}
