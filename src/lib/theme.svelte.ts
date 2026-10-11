import { browser } from '$app/env';
import { userPrefersMode } from 'mode-watcher';

const SHARED_DOMAIN = 'regelverk.org';
const MAX_AGE = 34560000;

if (browser) {
	$effect.root(() => {
		$effect(() => {
			const mode = userPrefersMode.current;
			const shared =
				location.hostname === SHARED_DOMAIN || location.hostname.endsWith(`.${SHARED_DOMAIN}`);
			document.cookie = 'theme=; path=/; max-age=0';
			document.cookie =
				`theme=${mode}; path=/; max-age=${MAX_AGE}` + (shared ? `; domain=${SHARED_DOMAIN}` : '');
		});
	});
}
