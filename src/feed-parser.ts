/**
 * T112 — LinkedIn feed DOM parser (Phase B, US1).
 *
 * Pure function. Extracts ParsedPost[] from a /feed/ DOM.
 *
 * Selector chain (mirrors src/linkedin-content.ts + Constitution VI defensive list):
 *   container: [data-urn^="urn:li:activity"] OR .feed-shared-update-v2
 *   author:    .update-components-actor__title
 *   title:     .update-components-actor__description
 *   sub-desc:  .update-components-actor__sub-description  ("X followers · 2h")
 *   degree:    .update-components-actor__supplementary-actor-info
 *   text:      .feed-shared-text / .feed-shared-update-v2__description /
 *              .update-components-text
 *   likes:     .social-counts-reactions__count
 *   comments:  .social-details-social-counts__comments
 */

import type {
  ConnectionDegree,
  FollowerTier,
  ParsedPost,
} from './storage-schema';

interface ParseOptions {
  /** Defaults to Date.now(). Override for deterministic tests. */
  now?: number;
}

/** Map "X followers" text → tier bucket. Stripping commas before parseInt. */
export function parseFollowerTier(text: string): FollowerTier {
  if (!text) return 'unknown';
  const match = text.match(/([\d,]+)\s+followers?/i);
  if (!match) return 'unknown';
  const n = parseInt(match[1].replace(/,/g, ''), 10);
  if (Number.isNaN(n)) return 'unknown';
  if (n < 1000) return 'lt_1k';
  if (n < 10_000) return '1k_10k';
  if (n < 100_000) return '10k_100k';
  return 'gt_100k';
}

/** Convert "30m" / "2h" / "1d" / "2w" → absolute ms timestamp from `now`. */
export function parseAgoToTimestamp(ago: string, now: number): number {
  if (!ago) return now;
  const m = ago.trim().match(/^(\d+)\s*([smhdw])\b/i);
  if (!m) return now;
  const value = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return now - value * (multipliers[unit] ?? 0);
}

export function parseDegree(text: string): ConnectionDegree {
  const t = (text || '').trim();
  if (t === '1st') return '1st';
  if (t === '2nd') return '2nd';
  if (t === '3rd') return '3rd';
  if (/^following$/i.test(t)) return 'follow-only';
  return 'unknown';
}

/** Read trimmed text, preferring aria-hidden child to match LinkedIn pattern. */
function readText(el: Element | null): string {
  if (!el) return '';
  const ariaHidden = el.querySelector('[aria-hidden="true"]');
  const raw = (ariaHidden?.textContent ?? el.textContent ?? '').trim();
  return raw.replace(/\s+/g, ' ');
}

/** Parse "1,234 comments" → 1234. Returns 0 if no number found. */
function parseCount(text: string): number {
  if (!text) return 0;
  const m = text.match(/[\d,]+/);
  if (!m) return 0;
  const n = parseInt(m[0].replace(/,/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Extract "/in/{handle}/" handle from an href, or '' if no match. */
function extractAuthorUrn(href: string): string {
  const m = href.match(/\/in\/([^/?#]+)/);
  return m ? `urn:li:profile:${m[1]}` : '';
}

export function parseFeedDom(
  doc: Document | DocumentFragment,
  options: ParseOptions = {},
): ParsedPost[] {
  const now = options.now ?? Date.now();
  const containers = doc.querySelectorAll(
    '[data-urn^="urn:li:activity"], .feed-shared-update-v2[data-urn]',
  );

  const out: ParsedPost[] = [];
  for (const el of Array.from(containers)) {
    const dataUrn = el.getAttribute('data-urn') ?? '';
    if (!dataUrn) continue;

    const id = dataUrn;
    const authorLink = el.querySelector('.update-components-actor__meta-link');
    const authorHref = authorLink?.getAttribute('href') ?? '';
    const authorUrn = extractAuthorUrn(authorHref);

    const authorName = readText(el.querySelector('.update-components-actor__title'));
    const authorTitle = readText(el.querySelector('.update-components-actor__description'));
    const subDescription = readText(
      el.querySelector('.update-components-actor__sub-description'),
    );
    const followerTier = parseFollowerTier(subDescription);

    // Extract the "2h" / "1d" piece from sub-description (between bullets/dots).
    // Pattern: "142,300 followers · 2h · 🌐" or "640 followers · 1d"
    const agoMatch = subDescription.match(/(\d+\s*[smhdw])/i);
    const postedAt = parseAgoToTimestamp(agoMatch?.[1] ?? '', now);

    const degreeText = readText(
      el.querySelector('.update-components-actor__supplementary-actor-info'),
    );
    const isOwn = degreeText.trim().toLowerCase() === 'you';
    const degree = parseDegree(degreeText);

    // Text — try multiple selectors per Constitution VI defensive pattern
    const textEl =
      el.querySelector('.feed-shared-text') ??
      el.querySelector('.feed-shared-update-v2__description') ??
      el.querySelector('.update-components-text');
    const text = readText(textEl);

    const likeCount = parseCount(
      readText(el.querySelector('.social-counts-reactions__count')),
    );
    const commentCount = parseCount(
      readText(el.querySelector('.social-details-social-counts__comments')),
    );

    out.push({
      id,
      authorUrn,
      authorName,
      authorTitle,
      followerTier,
      degree,
      text,
      postedAt,
      likeCount,
      commentCount,
      isOwn,
    });
  }
  return out;
}
