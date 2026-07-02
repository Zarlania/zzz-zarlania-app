import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ThemeService, THEME_STORAGE_KEY } from './theme.service';

describe('theme initialization', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it('sets a data-theme attribute as soon as the service is constructed', () => {
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    TestBed.inject(ThemeService);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('no-flash inline script in index.html', () => {
  const indexHtml = readFileSync(join(__dirname, '..', '..', '..', 'index.html'), 'utf8');

  it("hardcodes the same storage key as ThemeService's THEME_STORAGE_KEY", () => {
    // The inline script cannot import from the bundle, so it duplicates the key literal.
    // This guards against silent drift that would reintroduce the flash-of-wrong-theme bug.
    expect(indexHtml).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);
  });
});
