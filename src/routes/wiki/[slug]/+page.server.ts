import { getRecord } from '#lib/data.js';
import { isEntity } from '#lib/entities.js';
import { isSiteScope } from '#lib/sites.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const parts = params.slug.split('/');
	const ref =
		parts.length === 3 && isSiteScope(parts[0]) && isEntity(parts[1])
			? { scope: parts[0], entity: parts[1], id: parts[2] }
			: null;

	return {
		slug: params.slug,
		ref,
		record: ref ? getRecord(ref.scope, ref.entity, ref.id) : null
	};
};
