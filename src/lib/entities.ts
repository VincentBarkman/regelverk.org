export const ENTITIES = [
	'lagstiftning',
	'standarder',
	'ramverk',
	'myndigheter',
	'system',
	'krav',
	'implementera',
	'sakerhet',
	'branscher',
	'lar-dig'
] as const;

export type Entity = (typeof ENTITIES)[number];

export function isEntity(value: unknown): value is Entity {
	return typeof value === 'string' && (ENTITIES as readonly string[]).includes(value);
}
