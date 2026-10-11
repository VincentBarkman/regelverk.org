import type { SiteScope } from '#lib/sites.js';
import type { Entity } from '#lib/entities.js';
import * as m from '#lib/paraglide/messages.js';
import type { Component } from 'svelte';

import RiScales3Line from 'remixicon-svelte/icons/scales-3-line';
import RiBook2Line from 'remixicon-svelte/icons/book-2-line';
import RiNodeTree from 'remixicon-svelte/icons/node-tree';
import RiGovernmentLine from 'remixicon-svelte/icons/government-line';
import RiCpuLine from 'remixicon-svelte/icons/cpu-line';
import RiCheckboxLine from 'remixicon-svelte/icons/checkbox-line';
import RiToolsLine from 'remixicon-svelte/icons/tools-line';
import RiShieldCheckLine from 'remixicon-svelte/icons/shield-check-line';
import RiBuilding4Line from 'remixicon-svelte/icons/building-4-line';
import RiGraduationCapLine from 'remixicon-svelte/icons/graduation-cap-line';
import RiRefreshLine from 'remixicon-svelte/icons/refresh-line';
import RiLinksLine from 'remixicon-svelte/icons/links-line';
import RiFlowChart from 'remixicon-svelte/icons/flow-chart';
import RiInformationLine from 'remixicon-svelte/icons/information-line';
import RiHistoryLine from 'remixicon-svelte/icons/history-line';
import RiHashtag from 'remixicon-svelte/icons/hashtag';
import RiMapPinLine from 'remixicon-svelte/icons/map-pin-line';
import RiPulseLine from 'remixicon-svelte/icons/pulse-line';
import RiVerifiedBadgeLine from 'remixicon-svelte/icons/verified-badge-line';
import RiBankLine from 'remixicon-svelte/icons/bank-line';
import RiScales2Line from 'remixicon-svelte/icons/scales-2-line';
import RiCalendarCheckLine from 'remixicon-svelte/icons/calendar-check-line';
import RiCheckboxCircleLine from 'remixicon-svelte/icons/checkbox-circle-line';
import RiCreativeCommonsLine from 'remixicon-svelte/icons/creative-commons-line';
import RiBookOpenLine from 'remixicon-svelte/icons/book-open-line';
import RiGitCommitLine from 'remixicon-svelte/icons/git-commit-line';
import RiCalendarLine from 'remixicon-svelte/icons/calendar-line';
import RiTimeLine from 'remixicon-svelte/icons/time-line';
import RiArticleLine from 'remixicon-svelte/icons/article-line';
import RiAlarmLine from 'remixicon-svelte/icons/alarm-line';
import RiAsterisk from 'remixicon-svelte/icons/asterisk';
import RiPriceTag3Line from 'remixicon-svelte/icons/price-tag-3-line';
import RiIdCardLine from 'remixicon-svelte/icons/id-card-line';
import RiExternalLinkLine from 'remixicon-svelte/icons/external-link-line';
import RiArrowRightLine from 'remixicon-svelte/icons/arrow-right-line';
import RiGlobalLine from 'remixicon-svelte/icons/global-line';
import RiCheckLine from 'remixicon-svelte/icons/check-line';
import RiCloseLine from 'remixicon-svelte/icons/close-line';
import RiAlertLine from 'remixicon-svelte/icons/alert-line';

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
	prose-headings:hyphens-auto prose-headings:wrap-break-word
	prose-h1:text-3xl prose-h1:mb-6
	prose-h2:text-lg prose-h2:mt-7 prose-h2:mb-2 prose-h2:scroll-mt-8
	prose-p:text-primary/70 prose-p:leading-relaxed
	prose-li:text-primary/70 prose-li:marker:text-primary/40
	prose-strong:text-primary prose-a:text-primary prose-a:no-underline
	prose-a:underline-offset-4 prose-a:hover:underline
	prose-code:font-mono prose-code:text-[0.85em] prose-code:font-normal prose-code:text-primary/80
	prose-code:bg-primary/[0.06] prose-code:rounded prose-code:px-1 prose-code:py-0.5
	prose-code:before:content-none prose-code:after:content-none
	prose-pre:bg-transparent prose-pre:p-0
	prose-table:border-separate prose-table:border-spacing-0
	prose-table:overflow-hidden prose-table:rounded-md prose-table:border prose-table:border-primary/15
	prose-th:bg-primary/5 prose-th:font-medium prose-th:text-primary prose-th:px-3 prose-th:py-2
	prose-td:px-3 prose-td:py-2 prose-td:text-primary/70`;

export type LegalSlug = 'privacy' | 'terms' | 'disclaimer';

export const LEGAL_LABEL: Record<LegalSlug, () => string> = {
	privacy: m.nav_privacy,
	terms: m.nav_terms,
	disclaimer: m.nav_disclaimer
};

export const LEGAL_LINKS: { slug: LegalSlug; label: () => string; icon: Component }[] = [
	{ slug: 'privacy', label: m.nav_privacy, icon: RiShieldCheckLine },
	{ slug: 'terms', label: m.nav_terms, icon: RiArticleLine },
	{ slug: 'disclaimer', label: m.nav_disclaimer, icon: RiAlertLine }
];

export const PAGE_LINKS: { slug: string; label: () => string; icon: Component }[] = [
	{ slug: 'uppdateringar', label: () => m.nav_updates(), icon: RiRefreshLine },
	{ slug: 'kallor', label: () => m.nav_references(), icon: RiLinksLine },
	{ slug: 'metodik', label: () => m.nav_methodology(), icon: RiFlowChart },
	{ slug: 'om', label: () => m.nav_about(), icon: RiInformationLine },
	{ slug: 'andringslogg', label: () => m.nav_changelog(), icon: RiHistoryLine }
];

export const ENTITY_LABEL: Record<Entity, () => string> = {
	lagstiftning: m.ent_lagstiftning,
	standarder: m.ent_standarder,
	ramverk: m.ent_ramverk,
	myndigheter: m.ent_myndigheter,
	system: m.ent_system,
	krav: m.ent_krav,
	implementera: m.ent_implementera,
	sakerhet: m.ent_sakerhet,
	branscher: m.ent_branscher,
	'lar-dig': m.ent_lar_dig
};

export const META_FIELDS: [key: string, label: () => string][] = [
	['designation', m.meta_designation],
	['jurisdiction', m.meta_jurisdiction],
	['status', m.meta_status],
	['reviewStatus', m.meta_review_status],
	['issuer', m.meta_issuer],
	['legalStatus', m.meta_legal_status],
	['lastReviewed', m.meta_last_reviewed],
	['sourceChecked', m.meta_source_checked],
	['licenseClass', m.meta_license_class]
];

export const META_EXTRA_LABELS: Record<string, () => string> = {
	source: m.meta_source,
	version: m.meta_version,
	published: m.meta_published,
	'applies-from': m.meta_applies_from,
	provision: m.meta_provision,
	ref: m.meta_ref,
	deadline: m.meta_deadline,
	obligatory: m.meta_obligatory,
	kind: m.meta_kind,
	related: m.meta_related,
	short: m.meta_short,
	url: m.meta_url,
	from: m.meta_from,
	to: m.meta_to,
	sites: m.meta_sites_field,
	type: m.meta_type,
	reviewedBy: m.meta_reviewed_by
};

export const META_VALUES: Record<string, () => string> = {
	'in-force': m.val_in_force,
	active: m.val_active,
	inactive: m.val_inactive,
	verified: m.val_verified,
	granskad: m.val_reviewed,
	binding: m.val_binding,
	'non-binding': m.val_non_binding,
	standard: m.val_standard,
	framework: m.val_framework,
	sector: m.val_sector,
	system: m.val_system,
	myndighet: m.val_authority,
	'eu-directive': m.val_eu_directive,
	'national-authority': m.val_national_authority,
	'eu-agency': m.val_eu_agency,
	'standards-org': m.val_standards_org,
	association: m.val_association,
	organisation: m.val_organisation,
	supranational: m.val_supranational,
	'international-org': m.val_international_org,
	state: m.val_state,
	article: m.val_article,
	replaces: m.val_replaces,
	implements: m.val_implements,
	'official-text': m.val_official_text,
	'public-info': m.val_public_info,
	'24h-early-warning': m.val_early_warning_24h,
	true: m.val_true,
	false: m.val_false
};

export const META_VALUE_INFO: Record<string, () => string> = {
	'in-force': m.info_in_force,
	active: m.info_active,
	inactive: m.info_inactive,
	verified: m.info_verified,
	granskad: m.info_reviewed,
	binding: m.info_binding,
	'non-binding': m.info_non_binding
};

export const META_FIELD_ICON: Record<string, Component> = {
	designation: RiHashtag,
	jurisdiction: RiMapPinLine,
	status: RiPulseLine,
	reviewStatus: RiVerifiedBadgeLine,
	issuer: RiBankLine,
	legalStatus: RiScales2Line,
	lastReviewed: RiCalendarCheckLine,
	sourceChecked: RiCheckboxCircleLine,
	licenseClass: RiCreativeCommonsLine,
	source: RiBookOpenLine,
	version: RiGitCommitLine,
	published: RiCalendarLine,
	'applies-from': RiTimeLine,
	provision: RiArticleLine,
	ref: RiLinksLine,
	deadline: RiAlarmLine,
	obligatory: RiAsterisk,
	kind: RiPriceTag3Line,
	related: RiNodeTree,
	short: RiIdCardLine,
	url: RiExternalLinkLine,
	from: RiArrowRightLine,
	to: RiArrowRightLine,
	sites: RiGlobalLine,
	type: RiPriceTag3Line
};

export const META_VALUE_ICON: Record<string, Component> = {
	true: RiCheckLine,
	false: RiCloseLine
};

export const LICENSE_LINK: Record<string, string> = {
	'AGPL-3.0': 'https://github.com/VincentBarkman/regelverk.org/blob/main/LICENSE.md',
	'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0.en.html',
	'LGPL-3.0': 'https://www.gnu.org/licenses/lgpl-3.0.en.html',
	MIT: 'https://opensource.org/license/mit',
	'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
	'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
	'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
	'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/'
};

export const ISSUER_LOGO: Record<string, string> = {
	NIST: '/logos/nist.svg',
	IEC: '/logos/iec.svg',
	ISO: '/logos/iso.svg',
	ETSI: '/logos/etsi.svg',
	ENISA: '/logos/enisa.svg',
	CISA: '/logos/cisa.svg',
	SIS: '/logos/sis.svg',
	SSF: '/logos/ssf.png',
	Arbetsmiljöverket: '/logos/arbetsmiljoverket.svg',
	Elsäkerhetsverket: '/logos/elsakerhetsverket.svg',
	Brandskyddsföreningen: '/logos/brandskyddsforeningen.svg'
};

export const DARK_INVERT_LOGOS = new Set(['/logos/nist.svg']);

export const logoDarkClass = (src: string): string =>
	DARK_INVERT_LOGOS.has(src) ? 'dark:invert' : '';

export const ENTITY_ICON: Record<Entity, Component> = {
	lagstiftning: RiScales3Line,
	standarder: RiBook2Line,
	ramverk: RiNodeTree,
	myndigheter: RiGovernmentLine,
	system: RiCpuLine,
	krav: RiCheckboxLine,
	implementera: RiToolsLine,
	sakerhet: RiShieldCheckLine,
	branscher: RiBuilding4Line,
	'lar-dig': RiGraduationCapLine
};
