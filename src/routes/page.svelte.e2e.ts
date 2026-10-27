import { expect, test } from '@playwright/test';

// Production builds emit absolute https://<host>/ links (multi-subdomain
// setup). Proxy those back to the preview server so clicks stay testable.
const PREVIEW = 'http://localhost:4173';

test.beforeEach(async ({ page }) => {
	for (const host of [
		'regelverk.org',
		'www.ot.se',
		'www.it.se',
		'www.fysisk.se',
		'www.brandskydd.se',
		'www.el.se',
		'www.arbetsmiljo.se'
	]) {
		await page.route(`https://${host}/**`, async (route) => {
			const url = new URL(route.request().url());
			const res = await route.fetch({
				url: `${PREVIEW}${url.pathname}${url.search}`,
				method: route.request().method()
			});
			await route.fulfill({ response: res });
		});
	}
});

test('has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});

test('header search shows dropdown results', async ({ page }) => {
	await page.goto('/lagstiftning/nis2');
	await page.locator('#header-search').fill('nis2');
	const list = page.locator('#header-search-list');
	await expect(list).toBeVisible();
	await expect(list.locator('[data-slot="command-item"]').first()).toBeVisible({
		timeout: 5000
	});
});

test('home search shows dropdown results', async ({ page }) => {
	await page.goto('/');
	await page.locator('#global-search-input').fill('nis2');
	const list = page.locator('#global-search-input-list');
	await expect(list).toBeVisible();
	await expect(list.locator('[data-slot="command-item"]').first()).toBeVisible({
		timeout: 5000
	});
});

test('record page has canonical and hreflang links', async ({ page }) => {
	await page.goto('/lagstiftning/nis2');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://regelverk.org/lagstiftning/nis2'
	);
	await expect(page.locator('link[hreflang="sv"]')).toHaveAttribute(
		'href',
		'https://regelverk.org/lagstiftning/nis2'
	);
	await expect(page.locator('link[hreflang="en"]')).toHaveAttribute(
		'href',
		'https://regelverk.org/en/lagstiftning/nis2'
	);
	await expect(page.locator('link[hreflang="x-default"]')).toBeAttached();
});

test('version diff renders added/removed markers', async ({ page }) => {
	await page.goto('/lagstiftning/nis2?diff=nis2%2Fversion-2022-2555');
	await expect(page.getByText('Borttaget', { exact: false })).toBeVisible();
	await expect(page.getByText('Tillagt', { exact: false })).toBeVisible();
});

test('english page shows swedish fallback notice', async ({ page }) => {
	await page.goto('/en/lagstiftning/afs-2023-1');
	await expect(page.getByText(/not available in English/)).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open the Swedish page' })).toHaveAttribute(
		'href',
		'/lagstiftning/afs-2023-1'
	);
});

test('command palette opens with mod+k and lists actions', async ({ page }) => {
	await page.goto('/');
	// the shortcut listener attaches during hydration — wait for it
	await page.waitForLoadState('networkidle');
	await page.keyboard.press('Control+k');
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Relationsgraf')).toBeVisible();
	await expect(dialog.getByText('Tidslinje')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
});

test('graph page renders canvas and entity filters', async ({ page }) => {
	await page.goto('/graf');
	await expect(page.locator('h1')).toContainText('Relationsgraf');
	await expect(page.locator('canvas')).toBeVisible();
	const chips = page.locator('button[aria-pressed]');
	await expect(chips.first()).toBeVisible();
	await chips.first().click();
	await expect(chips.first()).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('canvas')).toBeVisible();
});

test('graph focus param loads without errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await page.goto('/graf?fokus=nis2');
	await expect(page.locator('canvas')).toBeVisible();
	await page.waitForTimeout(1500);
	expect(errors).toEqual([]);
});

test('timeline page lists dated records', async ({ page }) => {
	await page.goto('/tidslinje');
	await expect(page.locator('h1')).toContainText('Tidslinje');
	await expect(page.locator('main ol li a').first()).toBeVisible();
});

test('stats page renders sections', async ({ page }) => {
	await page.goto('/statistik');
	await expect(page.locator('h1')).toContainText('Statistik');
	await expect(page.getByText('Poster per kategori')).toBeVisible();
});

test('sidebar links to graph, stats and timeline', async ({ page }) => {
	await page.goto('/lagstiftning/nis2');
	const rail = page.locator('main').first();
	await expect(rail.getByRole('link', { name: 'Relationsgraf' }).first()).toBeVisible();
	await expect(rail.getByRole('link', { name: 'Statistik' }).first()).toBeVisible();
	await expect(rail.getByRole('link', { name: 'Tidslinje' }).first()).toBeVisible();
});

test('404 page suggests near matches', async ({ page }) => {
	await page.goto('/lagstiftning/afs-2023');
	await expect(page.getByText(/Menade du/i).first()).toBeVisible({ timeout: 5000 });
});
