export const ENTITIES = [
	'sources',
	'source-versions',
	'provisions',
	'requirements',
	'authorities',
	'topics',
	'relations',
	'guides'
] as const;

export type Entity = (typeof ENTITIES)[number];

export function isEntity(value: unknown): value is Entity {
	return typeof value === 'string' && (ENTITIES as readonly string[]).includes(value);
}
