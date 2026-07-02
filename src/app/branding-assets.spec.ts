import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(__dirname, '..', '..', 'public');
const indexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

describe('favicon.svg (theme-aware vector mark)', () => {
  const svg = readFileSync(join(publicDir, 'favicon.svg'), 'utf8');

  it('is a 64x64 viewBox SVG', () => {
    expect(svg).toContain('viewBox="0 0 64 64"');
  });

  it('carries the dark-theme brand and action colors', () => {
    expect(svg).toContain('#eeb03a'); // --color-brand (dark)
    expect(svg).toContain('#e2622a'); // --color-action (dark)
  });

  it('swaps to the light-theme palette under prefers-color-scheme: light', () => {
    expect(svg).toContain('prefers-color-scheme: light');
    expect(svg).toContain('#b0872a'); // --color-brand (light)
    expect(svg).toContain('#276b48'); // --color-action (light)
  });
});

describe('index.html branding wiring', () => {
  it('links the SVG favicon as the primary icon', () => {
    expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="favicon.svg"');
  });

  it('keeps the .ico as a legacy fallback', () => {
    expect(indexHtml).toContain('href="favicon.ico"');
  });

  it('sets a theme-color for each color scheme using the real bg tokens', () => {
    expect(indexHtml).toContain('name="theme-color"');
    expect(indexHtml).toContain('content="#15110f" media="(prefers-color-scheme: dark)"');
    expect(indexHtml).toContain('content="#f3edde" media="(prefers-color-scheme: light)"');
  });
});
