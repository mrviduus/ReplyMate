/**
 * T032 — LinkedIn profile DOM parser (Phase A, US3).
 *
 * Pure function. No imports of runtime values (only types).
 * Self-contained so it can be passed to chrome.scripting.executeScript({ func })
 * and serialized cleanly into the active tab context.
 *
 * Reads documented LinkedIn profile DOM:
 *   .text-heading-xlarge          → fullName
 *   .text-body-medium.break-words → headline (first match)
 *   #about .inline-show-more-text → about (truncated to 1500 chars)
 *   #skills li.pvs-list__paged-list-item span.t-bold → topSkills (first 10)
 *   #content_collections .update-components-text     → recentPostThemes (first 5)
 *
 * Defensive: missing sections return empty string / empty array.
 * Never throws on malformed DOM — caller decides if fields are usable.
 */

export interface RawProfileFields {
  fullName: string;
  headline: string;
  about: string;
  topSkills: string[];
  recentPostThemes: string[];
}

export const ABOUT_MAX_CHARS = 1500;
export const MAX_TOP_SKILLS = 10;
export const MAX_RECENT_POST_THEMES = 5;

export function parseProfileDom(doc: Document | DocumentFragment): RawProfileFields {
  // Helper: read textContent (preferring aria-hidden child to match LinkedIn's pattern),
  // trim whitespace, collapse runs of whitespace into single spaces.
  const readText = (el: Element | null): string => {
    if (!el) return '';
    const ariaHidden = el.querySelector('[aria-hidden="true"]');
    const raw = (ariaHidden?.textContent ?? el.textContent ?? '').trim();
    return raw.replace(/\s+/g, ' ');
  };

  // v0.5.2 — defensive multi-selector parsing per Constitution VI. v0.4.0 dogfood
  // (see screenshot in commit b8fd4e6 thread) showed real LinkedIn DOM in 2026
  // doesn't match the v0.4.0 synthetic fixture selectors for headline / about /
  // skills / activity. Until the dump-linkedin-profile-dom.js snapshot lands,
  // we try all selectors I've seen LinkedIn use over the past 18 months.
  const firstMatchText = (selectors: string[]): string => {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      const text = readText(el);
      if (text) return text;
    }
    return '';
  };

  const fullName = firstMatchText([
    '.text-heading-xlarge',
    'h1.text-heading-xlarge',
    '.pv-text-details__left-panel h1',
    '.pv-top-card h1',
    'main h1',
  ]);

  const headline = firstMatchText([
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel .text-body-medium',
    '.pv-top-card .text-body-medium',
    '.ph5 .text-body-medium',
    'main .text-body-medium',
  ]);

  // About — try the section anchor, then any of its children that look like
  // the "see more" expander. Truncate hard at ABOUT_MAX_CHARS.
  let about = '';
  const aboutSection =
    doc.querySelector('#about') ??
    doc.querySelector('section[data-section="summary"]') ??
    doc.querySelector('section.summary');
  if (aboutSection) {
    const moreText =
      aboutSection.querySelector('.inline-show-more-text') ??
      aboutSection.querySelector('.pv-shared-text-with-see-more') ??
      aboutSection.querySelector('p') ??
      aboutSection;
    about = readText(moreText).slice(0, ABOUT_MAX_CHARS);
  } else {
    // Last-ditch: #about may be a sibling-anchor (LinkedIn pattern), so look at
    // the next .artdeco-card / .pv-profile-card.
    const aboutAnchor = doc.querySelector('div#about, span#about');
    const aboutCard =
      aboutAnchor?.closest('section, div.artdeco-card, div.pv-profile-card') ??
      aboutAnchor?.parentElement;
    if (aboutCard) {
      const moreText =
        aboutCard.querySelector('.inline-show-more-text') ??
        aboutCard.querySelector('.pv-shared-text-with-see-more') ??
        aboutCard;
      about = readText(moreText).slice(0, ABOUT_MAX_CHARS);
    }
  }

  // Skills — try canonical anchor, fall back to data-section, then to
  // sibling-anchor pattern. Inside, try multiple list-item shapes.
  const topSkills: string[] = [];
  const skillsContainer =
    doc.querySelector('#skills')?.parentElement ??
    doc.querySelector('section[data-section="skills"]') ??
    doc.querySelector('#skills')?.closest('section, div.artdeco-card');
  if (skillsContainer) {
    const candidates: NodeListOf<Element> = skillsContainer.querySelectorAll(
      'li.pvs-list__paged-list-item, li.pvs-entity, .pvs-entity__path-node'
    );
    for (let i = 0; i < candidates.length && topSkills.length < MAX_TOP_SKILLS; i++) {
      // Look for the skill name — prefer .t-bold (LinkedIn's bold style class),
      // fall back to first .visually-hidden (screenreader text contains skill name).
      const labelEl =
        candidates[i].querySelector('span.t-bold') ??
        candidates[i].querySelector('div.t-bold') ??
        candidates[i].querySelector('.visually-hidden');
      const text = readText(labelEl);
      if (text && !topSkills.includes(text)) topSkills.push(text);
    }
  }

  // Recent post themes — analogous defensive pass.
  const recentPostThemes: string[] = [];
  const activityContainer =
    doc.querySelector('#content_collections') ??
    doc.querySelector('section[data-section="posts"]') ??
    doc.querySelector('#content_collections')?.closest('section');
  if (activityContainer) {
    const texts = activityContainer.querySelectorAll(
      '.update-components-text, .feed-shared-update-v2__description, .feed-shared-text'
    );
    for (let i = 0; i < texts.length && recentPostThemes.length < MAX_RECENT_POST_THEMES; i++) {
      const t = readText(texts[i]);
      if (t && !recentPostThemes.includes(t)) recentPostThemes.push(t);
    }
  }

  return { fullName, headline, about, topSkills, recentPostThemes };
}
