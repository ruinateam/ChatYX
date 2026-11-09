/**
 * Readable nickname colours, modelled on FrankerFaceZ's colour adjuster.
 *
 * The overlay cannot know what is behind a transparent background, so callers
 * pass the colour the text is assumed to sit on. `compositeOverBlack` derives
 * that colour from the configured overlay backing.
 *
 * The modes mirror FFZ:
 * - `none` removes the per-user colour entirely.
 * - `unchanged` keeps the platform colour.
 * - `hsl-luma` and `luv-luma` move the colour to the luminance that reaches the
 *   requested contrast ratio, preserving hue/chroma as far as possible.
 * - `hsl-loop` and `rgb-loop` are the historical BTTV-style loops.
 */
export type ReadableColorMode =
  | "none"
  | "unchanged"
  | "hsl-luma"
  | "luv-luma"
  | "hsl-loop"
  | "rgb-loop";

export const READABLE_COLOR_MODES: readonly ReadableColorMode[] = [
  "none",
  "unchanged",
  "hsl-luma",
  "luv-luma",
  "hsl-loop",
  "rgb-loop",
];

export const DEFAULT_READABLE_COLOR_MODE: ReadableColorMode = "unchanged";
export const DEFAULT_READABLE_COLOR_CONTRAST = 4.5;
export const MIN_READABLE_COLOR_CONTRAST = 1;
export const MAX_READABLE_COLOR_CONTRAST = 21;

const CACHE_LIMIT = 512;
const colorCache = new Map<string, string>();

const WHITE_X = 0.950456;
const WHITE_Y = 1;
const WHITE_Z = 1.088754;
const WHITE_DENOMINATOR = WHITE_X + 15 * WHITE_Y + 3 * WHITE_Z;
const U_DELTA_GAMMA = (4 * WHITE_X) / WHITE_DENOMINATOR;
const V_DELTA_GAMMA = (9 * WHITE_Y) / WHITE_DENOMINATOR;
const LUMA_EPSILON = Math.pow(6 / 29, 3);
const LUMA_KAPPA = Math.pow(29 / 3, 3);

type Rgba = { r: number; g: number; b: number; a: number };
type Hsl = { h: number; s: number; l: number; a: number };
type Xyz = { x: number; y: number; z: number };
type Luv = { l: number; u: number; v: number };

export function isReadableColorMode(value: unknown): value is ReadableColorMode {
  return (
    typeof value === "string" &&
    (READABLE_COLOR_MODES as readonly string[]).includes(value)
  );
}

export function normalizeReadableColorMode(value: unknown): ReadableColorMode {
  return isReadableColorMode(value) ? value : DEFAULT_READABLE_COLOR_MODE;
}

export function normalizeReadableColorContrast(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_READABLE_COLOR_CONTRAST;
  return clamp(
    numeric,
    MIN_READABLE_COLOR_CONTRAST,
    MAX_READABLE_COLOR_CONTRAST,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseChannel(raw: string): number | null {
  const percent = raw.endsWith("%");
  const numeric = Number(percent ? raw.slice(0, -1) : raw);
  if (!Number.isFinite(numeric)) return null;
  return clamp(percent ? numeric * 2.55 : numeric, 0, 255);
}

function parseAlpha(raw: string): number | null {
  const percent = raw.endsWith("%");
  const numeric = Number(percent ? raw.slice(0, -1) : raw);
  if (!Number.isFinite(numeric)) return null;
  return clamp(percent ? numeric / 100 : numeric, 0, 1);
}

/** Parses the CSS colour syntaxes chat platforms actually send. */
export function parseCssColor(input: string): Rgba | null {
  const value = input.trim();
  if (!value) return null;

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const chars = [...hex];
      const channels = chars.slice(0, 3).map((char) => Number.parseInt(char + char, 16));
      if (channels.some((channel) => !Number.isFinite(channel))) return null;
      return {
        r: channels[0]!,
        g: channels[1]!,
        b: channels[2]!,
        a: chars[3] ? Number.parseInt(chars[3] + chars[3], 16) / 255 : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      const raw = Number.parseInt(hex.slice(0, 6), 16);
      if (!Number.isFinite(raw)) return null;
      return {
        r: (raw >> 16) & 0xff,
        g: (raw >> 8) & 0xff,
        b: raw & 0xff,
        a: hex.length === 8 ? Number.parseInt(hex.slice(6), 16) / 255 : 1,
      };
    }
    return null;
  }

  const match = /^rgba?\((.*)\)$/i.exec(value);
  if (!match) return null;

  const parts = match[1]!.trim().split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const channels = parts.slice(0, 3).map(parseChannel);
  if (channels.some((channel) => channel === null)) return null;
  const alpha = parts[3] === undefined ? 1 : parseAlpha(parts[3]!);
  if (alpha === null) return null;

  return {
    r: channels[0]!,
    g: channels[1]!,
    b: channels[2]!,
    a: alpha,
  };
}

function channelToHex(channel: number): string {
  return Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0");
}

function colorToCss({ r, g, b, a }: Rgba): string {
  if (a >= 1) return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
  const alpha = Math.round(clamp(a, 0, 1) * 1000) / 1000;
  return `rgba(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(clamp(b, 0, 255))}, ${alpha})`;
}

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function linearToSrgb(channel: number): number {
  return channel <= 0.0031308
    ? channel * 12.92
    : Math.pow(1.055 * channel, 1 / 2.4) - 0.055;
}

function relativeLuminance({ r, g, b }: Rgba): number {
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

/** WCAG contrast ratio between two colours, exposed for tests and diagnostics. */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(background);
  if (!fg || !bg) return 0;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function rgbToHsl({ r, g, b, a }: Rgba): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l, a };

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h: number;
  if (max === red) h = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;

  return { h: h / 6, s, l, a };
}

function hueToRgb(p: number, q: number, t: number): number {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

function hslToRgb({ h, s, l, a }: Hsl): Rgba {
  if (s === 0) {
    const value = clamp(l * 255, 0, 255);
    return { r: value, g: value, b: value, a };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clamp(255 * hueToRgb(p, q, h + 1 / 3), 0, 255),
    g: clamp(255 * hueToRgb(p, q, h), 0, 255),
    b: clamp(255 * hueToRgb(p, q, h - 1 / 3), 0, 255),
    a,
  };
}

function targetLuminance(hsl: Hsl, target: number): Hsl {
  let saturation = hsl.s;
  saturation *= Math.pow(hsl.l > 0.5 ? -hsl.l : hsl.l - 1, 7) + 1;

  let min = 0;
  let max = 1;
  let mid = 0.5;
  for (let index = 0; index < 32; index += 1) {
    mid = (min + max) / 2;
    const luminance = relativeLuminance(
      hslToRgb({ h: hsl.h, s: saturation, l: mid, a: hsl.a }),
    );
    if (luminance > target) max = mid;
    else min = mid;
  }

  return { ...hsl, s: saturation, l: mid };
}

function rgbToXyz({ r, g, b }: Rgba): Xyz {
  const red = srgbToLinear(r);
  const green = srgbToLinear(g);
  const blue = srgbToLinear(b);
  return {
    x: 0.412453 * red + 0.35758 * green + 0.180423 * blue,
    y: 0.212671 * red + 0.71516 * green + 0.072169 * blue,
    z: 0.019334 * red + 0.119193 * green + 0.950227 * blue,
  };
}

function xyzToRgb({ x, y, z }: Xyz, alpha: number): Rgba {
  return {
    r: clamp(255 * linearToSrgb(3.240479 * x - 1.53715 * y - 0.498535 * z), 0, 255),
    g: clamp(255 * linearToSrgb(-0.969256 * x + 1.875992 * y + 0.041556 * z), 0, 255),
    b: clamp(255 * linearToSrgb(0.055648 * x - 0.204043 * y + 1.057311 * z), 0, 255),
    a: alpha,
  };
}

function xyzToLuvL({ y }: Xyz): number {
  const gamma = y / WHITE_Y;
  return gamma > LUMA_EPSILON
    ? 116 * Math.cbrt(gamma) - 16
    : LUMA_KAPPA * gamma;
}

function xyzToLuv({ x, y, z }: Xyz): Luv {
  const denominator = x + 15 * y + 3 * z;
  const delta = 1 / (denominator === 0 ? 1 : denominator);
  const l = xyzToLuvL({ x, y, z });
  return {
    l,
    u: 13 * l * (4 * x * delta - U_DELTA_GAMMA),
    v: 13 * l * (9 * y * delta - V_DELTA_GAMMA),
  };
}

function luvToRgb({ l, u, v }: Luv, alpha: number): Rgba | null {
  if (l <= 0) return { r: 0, g: 0, b: 0, a: alpha };

  const uDenominator = u + 13 * l * U_DELTA_GAMMA;
  const vDenominator = v + 13 * l * V_DELTA_GAMMA;
  if (
    Math.abs(uDenominator) < 1e-9 ||
    Math.abs(vDenominator) < 1e-9
  ) {
    return null;
  }

  const y = l > 8 ? Math.pow((l + 16) / 116, 3) : l / LUMA_KAPPA;
  const a = (1 / 3) * ((52 * l) / uDenominator - 1);
  const b = -5 * y;
  const c = -1 / 3;
  const d = y * ((39 * l) / vDenominator - 5);
  const x = (d - b) / (a - c);
  const z = x * a + b;

  if (![x, y, z].every(Number.isFinite)) return null;
  return xyzToRgb({ x, y, z }, alpha);
}

function perceivedBrightness({ r, g, b }: Rgba): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function brighten({ r, g, b, a }: Rgba, amount: number): Rgba {
  return {
    r: clamp(r + amount, 0, 255),
    g: clamp(g + amount, 0, 255),
    b: clamp(b + amount, 0, 255),
    a,
  };
}

function adjustColor(
  color: Rgba,
  mode: Exclude<ReadableColorMode, "none" | "unchanged">,
  contrast: number,
  background: Rgba,
): Rgba {
  const backgroundLuminance = relativeLuminance(background);
  const dark = backgroundLuminance < 0.5;
  const target = dark
    ? contrast * (backgroundLuminance + 0.05) - 0.05
    : (backgroundLuminance + 0.05) / contrast - 0.05;
  const clampedTarget = clamp(target, 0, 1);

  switch (mode) {
    case "hsl-luma": {
      const luminance = relativeLuminance(color);
      if (dark ? luminance < clampedTarget : luminance > clampedTarget) {
        return hslToRgb(targetLuminance(rgbToHsl(color), clampedTarget));
      }
      return color;
    }

    case "luv-luma": {
      const luv = xyzToLuv(rgbToXyz(color));
      const targetL = xyzToLuvL({ x: 0, y: clampedTarget, z: 0 });
      if (dark ? luv.l < targetL : luv.l > targetL) {
        return luvToRgb({ l: targetL, u: luv.u, v: luv.v }, color.a) ?? color;
      }
      return color;
    }

    case "hsl-loop": {
      let current = color;
      for (
        let index = 0;
        index < 256 && (dark ? perceivedBrightness(current) < 0.5 : perceivedBrightness(current) >= 0.5);
        index += 1
      ) {
        const hsl = rgbToHsl(current);
        current = hslToRgb({
          ...hsl,
          l: clamp(dark ? 0.1 + 0.9 * hsl.l : 0.9 * hsl.l, 0, 1),
        });
      }
      return current;
    }

    case "rgb-loop": {
      let current = color;
      for (
        let index = 0;
        index < 127 &&
        (dark ? relativeLuminance(current) < 0.15 : relativeLuminance(current) > 0.3);
        index += 1
      ) {
        current = brighten(current, dark ? 3 : -3);
      }
      return current;
    }
  }
}

/**
 * Applies one readable-colour mode. Unparseable colours are returned unchanged
 * so named CSS colours and paints keep working.
 */
export function applyReadableColor(
  color: string,
  mode: ReadableColorMode,
  contrast: number,
  background: string,
): string {
  if (mode === "unchanged") return color;
  if (mode === "none") return "";

  const parsed = parseCssColor(color);
  if (!parsed) return color;

  const safeContrast = normalizeReadableColorContrast(contrast);
  const key = `${mode}\u0000${safeContrast}\u0000${background}\u0000${color}`;
  const cached = colorCache.get(key);
  if (cached !== undefined) return cached;

  const base = parseCssColor(background) ?? { r: 0, g: 0, b: 0, a: 1 };
  const result = colorToCss(adjustColor(parsed, mode, safeContrast, base));

  if (colorCache.size >= CACHE_LIMIT) colorCache.clear();
  colorCache.set(key, result);
  return result;
}

/**
 * Flattens the overlay backing over black. The stream behind a transparent
 * overlay is unknowable, so black is the documented assumption.
 */
export function compositeOverBlack(color: string, opacity: number): string {
  const parsed = parseCssColor(color);
  if (!parsed) return "#000000";

  const alpha = clamp(parsed.a * clamp(opacity, 0, 1), 0, 1);
  return colorToCss({
    r: parsed.r * alpha,
    g: parsed.g * alpha,
    b: parsed.b * alpha,
    a: 1,
  });
}
