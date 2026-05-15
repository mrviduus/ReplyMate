/**
 * T202 — LinkedIn SSI page DOM parser (Phase C, US2).
 *
 * Pure function. Operates on the DOM of https://www.linkedin.com/sales/ssi.
 * Both Sales Navigator and free LinkedIn variants share the same score-table
 * class names; this parser handles both.
 *
 * Selectors:
 *   total:      .ssi-score-table__current-ssi-score → integer 0..100
 *   components: .ssi-component-card (4 cards). Matched to the 4 sub-scores by
 *               .ssi-component-card__title h3 text (case-insensitive substring).
 *               Value read from .ssi-score-table__component-value.
 *   ranks:      .ssi-ranking-statement (2 of them; first=industry, second=network)
 *
 * Returns a tagged union — SsiParseSuccess on full match, SsiParseError
 * otherwise so the popup can render an actionable chip.
 */

import type { SsiSnapshot } from './storage-schema';

export type SsiParseReason = 'missing-total' | 'missing-component' | 'missing-rank' | 'malformed';

export interface SsiParseSuccess {
  ok: true;
  snapshot: SsiSnapshot;
}
export interface SsiParseError {
  ok: false;
  reason: SsiParseReason;
  message: string;
}
export type SsiParseResult = SsiParseSuccess | SsiParseError;

interface ParseOptions {
  /** Defaults to Date.now(). Override for deterministic tests. */
  now?: number;
}

function readText(el: Element | null): string {
  if (!el) return '';
  const aria = el.querySelector('[aria-hidden="true"]');
  const raw = (aria?.textContent ?? el.textContent ?? '').trim();
  return raw.replace(/\s+/g, ' ');
}

function readNumber(el: Element | null): number | null {
  const text = readText(el);
  if (!text) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

// h3 title → snapshot.components key. Matched by substring (case-insensitive)
// because LinkedIn occasionally A/B-tests phrasing.
const COMPONENT_KEY_MAP: Array<[RegExp, keyof SsiSnapshot['components']]> = [
  [/establish your professional brand/i, 'establishBrand'],
  [/find the right people/i, 'findRightPeople'],
  [/engage with insights/i, 'engageWithInsights'],
  [/build relationships/i, 'buildRelationships'],
];

function err(reason: SsiParseReason, message: string): SsiParseError {
  return { ok: false, reason, message };
}

export function parseSsiDom(
  doc: Document | DocumentFragment,
  options: ParseOptions = {},
): SsiParseResult {
  const now = options.now ?? Date.now();

  // Total
  const totalEl = doc.querySelector('.ssi-score-table__current-ssi-score');
  if (!totalEl) {
    return err('missing-total', 'Could not locate .ssi-score-table__current-ssi-score');
  }
  const total = readNumber(totalEl);
  if (total === null) {
    return err('malformed', `Total score text is not a number: "${readText(totalEl)}"`);
  }

  // Components — populate by matching h3 title against COMPONENT_KEY_MAP.
  const components: Partial<SsiSnapshot['components']> = {};
  const cards = doc.querySelectorAll('.ssi-component-card');
  for (const card of Array.from(cards)) {
    const title = readText(card.querySelector('.ssi-component-card__title'));
    const value = readNumber(card.querySelector('.ssi-score-table__component-value'));
    if (value === null) continue;
    for (const [pattern, key] of COMPONENT_KEY_MAP) {
      if (pattern.test(title)) {
        components[key] = value;
        break;
      }
    }
  }
  const requiredKeys: Array<keyof SsiSnapshot['components']> = [
    'establishBrand',
    'findRightPeople',
    'engageWithInsights',
    'buildRelationships',
  ];
  const missing = requiredKeys.filter((k) => components[k] === undefined);
  if (missing.length > 0) {
    return err(
      'missing-component',
      `Missing component cards: ${missing.join(', ')} (got ${cards.length} cards)`,
    );
  }

  // Ranks — first .ssi-ranking-statement is industry, second is network.
  const rankEls = doc.querySelectorAll('.ssi-ranking-statement');
  if (rankEls.length < 2) {
    return err(
      'missing-rank',
      `Expected 2 .ssi-ranking-statement elements; found ${rankEls.length}`,
    );
  }
  const industryRank = readText(rankEls[0]);
  const networkRank = readText(rankEls[1]);

  return {
    ok: true,
    snapshot: {
      total,
      components: components as SsiSnapshot['components'],
      industryRank,
      networkRank,
      capturedAt: now,
    },
  };
}
