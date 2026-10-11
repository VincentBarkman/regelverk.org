const cache = new Map<string, { title?: string; description?: string } | null>();

const decodeEntities = (s: string) =>
	s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.trim();

async function fetchOne(url: string) {
	if (cache.has(url)) return cache.get(url);
	let info: { title?: string; description?: string } | null = null;
	try {
		const res = await fetch(url, {
			signal: AbortSignal.timeout(4000),
			headers: {
				'user-agent': 'regelverk.org (+https://regelverk.org)',
				accept: 'text/html'
			},
			redirect: 'follow'
		});
		if (res.ok) {
			const html = (await res.text()).slice(0, 200_000);
			const metas: Record<string, string> = {};
			for (const m of html.matchAll(/<meta\s+[^>]*>/gi)) {
				const name = m[0].match(/(?:name|property)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
				const content = m[0].match(/content=["']([^"']*)["']/i)?.[1];
				if (name && content && !(name in metas)) metas[name] = decodeEntities(content);
			}
			const title =
				metas['og:title'] ?? decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '');
			const description = metas['og:description'] ?? metas['description'];
			if (title || description) info = { title: title || undefined, description };
		}
	} catch {
		// leave null – caller falls back to hostname
	}
	cache.set(url, info);
	return info;
}

export async function fetchExternalInfo(
	urls: Iterable<string>
): Promise<Record<string, { title?: string; description?: string }>> {
	const unique = [...new Set([...urls].filter((u) => /^https?:\/\//.test(u)))];
	const entries = await Promise.all(unique.map(async (u) => [u, await fetchOne(u)] as const));
	const out: Record<string, { title?: string; description?: string }> = {};
	for (const [u, info] of entries) if (info) out[u] = info;
	return out;
}

export function externalUrls(meta: Record<string, unknown> | null): string[] {
	const out: string[] = [];
	const walk = (v: unknown) => {
		if (typeof v === 'string' && /^https?:\/\//.test(v)) out.push(v);
		else if (Array.isArray(v)) v.forEach(walk);
		else if (v && typeof v === 'object') Object.values(v).forEach(walk);
	};
	if (meta) Object.values(meta).forEach(walk);
	return out;
}
