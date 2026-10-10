import type { SiteScope } from '#lib/sites.js';
import type { Entity } from '#lib/entities.js';
import * as m from '#lib/paraglide/messages.js';
import type { Component } from 'svelte';

import RiBook2Line from 'remixicon-svelte/icons/book-2-line';
import RiGitCommitLine from 'remixicon-svelte/icons/git-commit-line';
import RiScales3Line from 'remixicon-svelte/icons/scales-3-line';
import RiCheckboxLine from 'remixicon-svelte/icons/checkbox-line';
import RiGovernmentLine from 'remixicon-svelte/icons/government-line';
import RiPriceTag3Line from 'remixicon-svelte/icons/price-tag-3-line';
import RiNodeTree from 'remixicon-svelte/icons/node-tree';
import RiCompass3Line from 'remixicon-svelte/icons/compass-3-line';

export const SITE_LONG: Record<SiteScope, () => string> = {
	regelverk: m.nav_home,
	ot: m.site_long_ot,
	it: m.site_long_it,
	fysisk: m.site_long_fysisk,
	brandskydd: m.site_long_brandskydd,
	el: m.site_long_el,
	arbetsmiljo: m.site_long_arbetsmiljo
};

export const SITE_BLURB: Record<SiteScope, () => string> = {
	regelverk: m.site_tagline_regelverk,
	ot: m.site_blurb_ot,
	it: m.site_blurb_it,
	fysisk: m.site_blurb_fysisk,
	brandskydd: m.site_blurb_brandskydd,
	el: m.site_blurb_el,
	arbetsmiljo: m.site_blurb_arbetsmiljo
};

export const ARTICLE_PROSE = `prose prose-sm max-w-none
	prose-headings:font-serif prose-headings:font-medium prose-headings:text-primary
	prose-h1:text-3xl prose-h1:mb-6
	prose-h2:text-lg prose-h2:mt-7 prose-h2:mb-2 prose-h2:scroll-mt-8
	prose-p:text-primary/70 prose-p:leading-relaxed
	prose-li:text-primary/70 prose-li:marker:text-primary/40
	prose-strong:text-primary prose-a:text-primary prose-a:no-underline
	prose-a:underline-offset-4 prose-a:hover:underline`;

export type LegalSlug = 'privacy' | 'terms' | 'disclaimer';

export const LEGAL_LABEL: Record<LegalSlug, () => string> = {
	privacy: m.nav_privacy,
	terms: m.nav_terms,
	disclaimer: m.nav_disclaimer
};

export const ENTITY_LABEL: Record<Entity, () => string> = {
	sources: m.ent_sources,
	'source-versions': m.ent_source_versions,
	provisions: m.ent_provisions,
	requirements: m.ent_requirements,
	authorities: m.ent_authorities,
	topics: m.ent_topics,
	relations: m.ent_relations,
	guides: m.ent_guides
};

export const ENTITY_ICON: Record<Entity, Component> = {
	sources: RiBook2Line,
	'source-versions': RiGitCommitLine,
	provisions: RiScales3Line,
	requirements: RiCheckboxLine,
	authorities: RiGovernmentLine,
	topics: RiPriceTag3Line,
	relations: RiNodeTree,
	guides: RiCompass3Line
};
