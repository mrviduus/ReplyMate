/**
 * T031 — Profile parser spec (Phase A, US3).
 * Drives src/profile-parser.ts (T032). Pure function operating on
 * Document | DocumentFragment. Fixture-driven.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseProfileDom } from '../src/profile-parser';
import type { RawProfileFields } from '../src/profile-parser';

function loadFixture(filename: string): Document {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures', filename), 'utf-8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('profile-parser (T031)', () => {
  describe('against the canonical linkedin-profile.html fixture', () => {
    let fields: RawProfileFields;

    beforeAll(() => {
      const doc = loadFixture('linkedin-profile.html');
      fields = parseProfileDom(doc);
    });

    it('extracts fullName from .text-heading-xlarge', () => {
      expect(fields.fullName).toBe('Synthetic Me');
    });

    it('extracts headline from .text-body-medium.break-words', () => {
      expect(fields.headline).toBe('AI Engineer | RAG | Agents | TypeScript');
    });

    it('extracts about and truncates to 1500 chars max', () => {
      expect(fields.about.length).toBeGreaterThan(0);
      expect(fields.about.length).toBeLessThanOrEqual(1500);
      expect(fields.about).toMatch(/local-first AI systems/);
    });

    it('extracts exactly 10 topSkills, in order, ignoring 11th+', () => {
      expect(fields.topSkills).toHaveLength(10);
      expect(fields.topSkills[0]).toBe('TypeScript');
      expect(fields.topSkills[1]).toBe('Python');
      expect(fields.topSkills[9]).toBe('Prompt Engineering');
      // DevOps is the 11th skill in fixture — must be excluded
      expect(fields.topSkills).not.toContain('DevOps');
    });

    it('extracts 3–5 recentPostThemes from #content_collections', () => {
      expect(fields.recentPostThemes.length).toBeGreaterThanOrEqual(3);
      expect(fields.recentPostThemes.length).toBeLessThanOrEqual(5);
      expect(fields.recentPostThemes[0]).toMatch(/ReplyMate v0\.3\.3/);
    });

    it('returned strings are trimmed (no leading/trailing whitespace)', () => {
      expect(fields.fullName).toBe(fields.fullName.trim());
      expect(fields.headline).toBe(fields.headline.trim());
      expect(fields.about).toBe(fields.about.trim());
      for (const skill of fields.topSkills) {
        expect(skill).toBe(skill.trim());
      }
    });
  });

  describe('edge cases', () => {
    it('returns empty fields for a profile with no #about section', () => {
      const html = `
        <main>
          <h1 class="text-heading-xlarge">Test Person</h1>
          <div class="text-body-medium break-words">Engineer</div>
          <!-- no #about, no #skills, no activity -->
        </main>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fields = parseProfileDom(doc);
      expect(fields.fullName).toBe('Test Person');
      expect(fields.headline).toBe('Engineer');
      expect(fields.about).toBe('');
      expect(fields.topSkills).toEqual([]);
      expect(fields.recentPostThemes).toEqual([]);
    });

    it('returns empty strings/arrays on completely empty DOM (does not throw)', () => {
      const doc = new DOMParser().parseFromString('<main></main>', 'text/html');
      expect(() => parseProfileDom(doc)).not.toThrow();
      const fields = parseProfileDom(doc);
      expect(fields.fullName).toBe('');
      expect(fields.headline).toBe('');
      expect(fields.about).toBe('');
      expect(fields.topSkills).toEqual([]);
      expect(fields.recentPostThemes).toEqual([]);
    });

    it('handles missing aria-hidden span (textContent fallback)', () => {
      const html = `
        <main>
          <h1 class="text-heading-xlarge">Plain Name</h1>
          <div class="text-body-medium break-words">Plain Headline</div>
          <section id="skills">
            <ul class="pvs-list">
              <li class="pvs-list__paged-list-item">
                <div><span class="t-bold">Direct Skill</span></div>
              </li>
            </ul>
          </section>
        </main>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fields = parseProfileDom(doc);
      expect(fields.fullName).toBe('Plain Name');
      expect(fields.topSkills).toEqual(['Direct Skill']);
    });

    it('caps about at 1500 chars even when source is longer', () => {
      const longAbout = 'lorem ipsum '.repeat(500); // ~6000 chars
      const html = `
        <main>
          <h1 class="text-heading-xlarge">X</h1>
          <section id="about">
            <div class="inline-show-more-text"><span aria-hidden="true">${longAbout}</span></div>
          </section>
        </main>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fields = parseProfileDom(doc);
      expect(fields.about.length).toBe(1500);
    });

    it('caps topSkills at 10 even when more present', () => {
      const skillItems = Array.from({ length: 25 }, (_, i) =>
        `<li class="pvs-list__paged-list-item"><div><span class="t-bold"><span aria-hidden="true">Skill ${i}</span></span></div></li>`,
      ).join('');
      const html = `
        <main>
          <section id="skills"><ul class="pvs-list">${skillItems}</ul></section>
        </main>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fields = parseProfileDom(doc);
      expect(fields.topSkills).toHaveLength(10);
      expect(fields.topSkills[0]).toBe('Skill 0');
      expect(fields.topSkills[9]).toBe('Skill 9');
    });
  });

  it('is pure: same DOM → same output across calls', () => {
    const doc = loadFixture('linkedin-profile.html');
    const a = parseProfileDom(doc);
    const b = parseProfileDom(doc);
    expect(a).toEqual(b);
  });
});
