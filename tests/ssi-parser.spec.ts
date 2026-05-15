/**
 * T201 — SSI parser spec (Phase C, US2). Fixture-driven.
 * Drives src/ssi-parser.ts (T202). Pure function operating on Document.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseSsiDom } from '../src/ssi-parser';
import type { SsiSnapshot } from '../src/storage-schema';

const FIXED_NOW = 1_700_000_000_000;

function loadFixture(): Document {
  const html = fs.readFileSync(
    path.join(__dirname, 'fixtures/linkedin-ssi.html'),
    'utf-8',
  );
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('parseSsiDom — canonical fixture', () => {
  let result: ReturnType<typeof parseSsiDom>;
  let snapshot: SsiSnapshot;

  beforeAll(() => {
    result = parseSsiDom(loadFixture(), { now: FIXED_NOW });
    if (!result.ok) throw new Error(`Expected ok: ${result.reason} ${result.message}`);
    snapshot = result.snapshot;
  });

  it('parses total score 18', () => {
    expect(snapshot.total).toBe(18);
  });

  it('parses all 4 components by h3 title match (not by order)', () => {
    expect(snapshot.components.establishBrand).toBeCloseTo(5.42);
    expect(snapshot.components.findRightPeople).toBeCloseTo(6.12);
    expect(snapshot.components.engageWithInsights).toBeCloseTo(0.85);
    expect(snapshot.components.buildRelationships).toBeCloseTo(5.61);
  });

  it('parses industry and network rank text', () => {
    expect(snapshot.industryRank).toMatch(/top 80%/i);
    expect(snapshot.networkRank).toMatch(/top 91%/i);
  });

  it('sets capturedAt from options.now', () => {
    expect(snapshot.capturedAt).toBe(FIXED_NOW);
  });
});

describe('parseSsiDom — error cases', () => {
  it('returns missing-total when score element absent', () => {
    const html = '<main><div class="ssi-page-container"></div></main>';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const r = parseSsiDom(doc, { now: FIXED_NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing-total');
  });

  it('returns missing-component when fewer than 4 component cards present', () => {
    const html = `<main>
      <div class="ssi-score-table__current-ssi-score">42</div>
      <div class="ssi-component-card">
        <h3 class="ssi-component-card__title">Establish your professional brand</h3>
        <div class="ssi-score-table__component-value">5</div>
      </div>
    </main>`;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const r = parseSsiDom(doc, { now: FIXED_NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing-component');
  });

  it('returns missing-rank when ranking statements absent', () => {
    const html = `<main>
      <div class="ssi-score-table__current-ssi-score">42</div>
      <div class="ssi-component-card"><h3 class="ssi-component-card__title">Establish your professional brand</h3><div class="ssi-score-table__component-value">5</div></div>
      <div class="ssi-component-card"><h3 class="ssi-component-card__title">Find the right people</h3><div class="ssi-score-table__component-value">5</div></div>
      <div class="ssi-component-card"><h3 class="ssi-component-card__title">Engage with insights</h3><div class="ssi-score-table__component-value">5</div></div>
      <div class="ssi-component-card"><h3 class="ssi-component-card__title">Build relationships</h3><div class="ssi-score-table__component-value">5</div></div>
    </main>`;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const r = parseSsiDom(doc, { now: FIXED_NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing-rank');
  });

  it('returns malformed when total cannot be parsed as a number', () => {
    const html = `<main>
      <div class="ssi-score-table__current-ssi-score">not-a-number</div>
    </main>`;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const r = parseSsiDom(doc, { now: FIXED_NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('malformed');
  });
});

describe('parseSsiDom — robustness', () => {
  it('is pure: same DOM → same output across calls', () => {
    const a = parseSsiDom(loadFixture(), { now: FIXED_NOW });
    const b = parseSsiDom(loadFixture(), { now: FIXED_NOW });
    expect(a).toEqual(b);
  });

  it('uses Date.now() when options.now omitted', () => {
    const r = parseSsiDom(loadFixture());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snapshot.capturedAt).toBeGreaterThan(0);
    }
  });

  it('handles component values with leading/trailing whitespace', () => {
    const html = `<main>
      <div class="ssi-score-table__current-ssi-score">  20  </div>
      <div class="ssi-component-card"><h3 class="ssi-component-card__title">Establish your professional brand</h3><div class="ssi-score-table__component-value">  5.42  </div></div>
      <div class="ssi-component-card"><h3 class="ssi-component-card__title">Find the right people</h3><div class="ssi-score-table__component-value">6.12</div></div>
      <div class="ssi-component-card"><h3 class="ssi-component-card__title">Engage with insights</h3><div class="ssi-score-table__component-value">0.85</div></div>
      <div class="ssi-component-card"><h3 class="ssi-component-card__title">Build relationships</h3><div class="ssi-score-table__component-value">5.61</div></div>
      <p class="ssi-ranking-statement">You rank in the top 50% of your industry.</p>
      <p class="ssi-ranking-statement">You rank in the top 60% of your network.</p>
    </main>`;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const r = parseSsiDom(doc, { now: FIXED_NOW });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snapshot.total).toBe(20);
      expect(r.snapshot.components.establishBrand).toBeCloseTo(5.42);
    }
  });
});
