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

  const fullName = readText(doc.querySelector('.text-heading-xlarge'));
  const headline = readText(doc.querySelector('.text-body-medium.break-words'));

  // About — search inside #about for .inline-show-more-text first, else fall back
  // to any first paragraph-ish element. Truncate hard at ABOUT_MAX_CHARS.
  const aboutSection = doc.querySelector('#about');
  let about = '';
  if (aboutSection) {
    const moreText =
      aboutSection.querySelector('.inline-show-more-text') ??
      aboutSection.querySelector('.pv-shared-text-with-see-more') ??
      aboutSection.querySelector('p');
    about = readText(moreText).slice(0, ABOUT_MAX_CHARS);
  }

  // Skills — first MAX_TOP_SKILLS items, looking for span.t-bold under each list item.
  const skillsSection = doc.querySelector('#skills');
  const topSkills: string[] = [];
  if (skillsSection) {
    const items = skillsSection.querySelectorAll('li.pvs-list__paged-list-item');
    for (let i = 0; i < items.length && topSkills.length < MAX_TOP_SKILLS; i++) {
      const labelEl = items[i].querySelector('span.t-bold');
      const text = readText(labelEl);
      if (text) topSkills.push(text);
    }
  }

  // Recent post themes — from #content_collections (activity section). Take first
  // MAX_RECENT_POST_THEMES texts. These are short summaries used downstream by
  // the prompt builder to keep generated drafts on-brand.
  const activitySection = doc.querySelector('#content_collections');
  const recentPostThemes: string[] = [];
  if (activitySection) {
    const texts = activitySection.querySelectorAll('.update-components-text');
    for (let i = 0; i < texts.length && recentPostThemes.length < MAX_RECENT_POST_THEMES; i++) {
      const t = readText(texts[i]);
      if (t) recentPostThemes.push(t);
    }
  }

  return { fullName, headline, about, topSkills, recentPostThemes };
}
