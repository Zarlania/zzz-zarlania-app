import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(__dirname, '..', '..', 'public');
const indexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

describe('favicon.svg (theme-aware vector mark)', () => {
  const svg = readFileSync(join(publicDir, 'favicon.svg'), 'utf8');

  it('is a two-path SVG with a viewBox', () => {
    expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
    expect(svg.match(/<path/g)?.length).toBe(2);
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

// PNG size without any external tool: 8-byte signature, then IHDR whose
// width is a big-endian uint32 at byte 16 and height at byte 20.
function pngSize(file: string): { width: number; height: number } {
  const b = readFileSync(join(publicDir, file));
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

// JPEG size: walk the marker segments to the Start-Of-Frame (SOFn), whose
// payload holds height (2 BE) then width (2 BE) after a 1-byte precision.
function jpegSize(file: string): { width: number; height: number } {
  const b = readFileSync(join(publicDir, file));
  let o = 2; // skip SOI (FFD8)
  while (o < b.length) {
    if (b[o] !== 0xff) {
      o++;
      continue;
    }
    const marker = b[o + 1];
    // SOF0..SOF15 carry the frame dimensions; DHT/JPG/DAC do not.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(o + 5), width: b.readUInt16BE(o + 7) };
    }
    o += 2 + b.readUInt16BE(o + 2); // skip this segment
  }
  throw new Error('no SOF marker found');
}

describe('raster icon set', () => {
  it('apple-touch-icon is 180x180', () => {
    expect(pngSize('apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
  });

  it('manifest icons are 192 and 512 square', () => {
    expect(pngSize('icon-192.png')).toEqual({ width: 192, height: 192 });
    expect(pngSize('icon-512.png')).toEqual({ width: 512, height: 512 });
  });

  it('og-image is a JPEG at the standard 1200x630 social size', () => {
    expect(jpegSize('og-image.jpg')).toEqual({ width: 1200, height: 630 });
  });
});

describe('site.webmanifest', () => {
  const manifest = JSON.parse(readFileSync(join(publicDir, 'site.webmanifest'), 'utf8'));

  it('names the app and sets brand-consistent colors', () => {
    expect(manifest.name).toBe('Zarlania');
    expect(manifest.theme_color).toBe('#15110f');
    expect(manifest.background_color).toBe('#15110f');
    expect(manifest.display).toBe('standalone');
  });

  it('references the 192 and 512 icons', () => {
    const srcs = manifest.icons.map((i: { src: string }) => i.src);
    expect(srcs).toContain('icon-192.png');
    expect(srcs).toContain('icon-512.png');
  });
});

describe('index.html icon/manifest wiring', () => {
  it('links the apple-touch-icon and the web manifest', () => {
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png"');
    expect(indexHtml).toContain('<link rel="manifest" href="site.webmanifest"');
  });
});

// ICO directory: reserved(2)=0, type(2)=1, count(2), then count 16-byte entries
// whose first byte is the image width (0 encodes 256).
function icoSizes(file: string): number[] {
  const b = readFileSync(join(publicDir, file));
  expect(b.readUInt16LE(0)).toBe(0); // reserved
  expect(b.readUInt16LE(2)).toBe(1); // type: icon
  const count = b.readUInt16LE(4);
  return Array.from({ length: count }, (_, i) => b.readUInt8(6 + i * 16) || 256);
}

describe('favicon.ico (branded multi-resolution fallback)', () => {
  it('is a valid ICO offering at least the spec-required 16px and 32px sizes', () => {
    const sizes = icoSizes('favicon.ico');
    expect(sizes).toContain(16);
    expect(sizes).toContain(32);
  });
});
