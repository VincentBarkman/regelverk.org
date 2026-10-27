import { recordOg } from '#lib/generated/ogImages.js';

// Records that have a pre-generated OG image (see scripts/gen-site-images.mjs).
export const recordOgPath = (scope: string, entity: string, id: string): string | undefined =>
	recordOg[`${scope}/${entity}/${id}`];
