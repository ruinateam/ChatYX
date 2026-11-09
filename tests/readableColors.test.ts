import { expect, test } from "bun:test";
import { DEFAULT_CHAT_CONFIG } from "../src/config/chatUrlParams";
import { resolveReadableNickColor } from "../src/config/readableColors";
import {
  DEFAULT_READABLE_COLOR_CONTRAST,
  applyReadableColor,
  compositeOverBlack,
  contrastRatio,
  normalizeReadableColorContrast,
  normalizeReadableColorMode,
  parseCssColor,
} from "../src/utils/readableColor";

test("unchanged and none modes bypass colour math", () => {
  expect(applyReadableColor("rebeccapurple", "unchanged", 4.5, "#000000")).toBe(
    "rebeccapurple",
  );
  expect(applyReadableColor("#123456", "none", 4.5, "#000000")).toBe("");
});

test("hsl luma brightens dark colours on a dark background", () => {
  const result = applyReadableColor("#0000ff", "hsl-luma", 4.5, "#000000");
  expect(result).not.toBe("#0000ff");
  expect(contrastRatio(result, "#000000")).toBeGreaterThanOrEqual(4.4);
});

test("hsl luma darkens light colours on a light background", () => {
  const result = applyReadableColor("#ffff00", "hsl-luma", 4.5, "#ffffff");
  expect(result).not.toBe("#ffff00");
  expect(contrastRatio(result, "#ffffff")).toBeGreaterThanOrEqual(4.4);
});

test("hsl luma leaves an already readable colour unchanged", () => {
  expect(applyReadableColor("#ffffff", "hsl-luma", 4.5, "#000000")).toBe(
    "#ffffff",
  );
});

test("luv luma reaches the requested contrast on both backgrounds", () => {
  // Keeping Luv chroma can push a saturated colour out of the RGB gamut, so
  // the clamped result can land slightly below the exact ratio.
  const dark = applyReadableColor("#0000ff", "luv-luma", 4.5, "#000000");
  expect(contrastRatio(dark, "#000000")).toBeGreaterThanOrEqual(4.2);

  const light = applyReadableColor("#ffff00", "luv-luma", 4.5, "#ffffff");
  expect(contrastRatio(light, "#ffffff")).toBeGreaterThanOrEqual(4.2);
});

test("hsl loop raises dark colours and lowers light ones", () => {
  const dark = applyReadableColor("#202020", "hsl-loop", 4.5, "#000000");
  expect(contrastRatio(dark, "#000000")).toBeGreaterThanOrEqual(4);

  const light = applyReadableColor("#f0f0f0", "hsl-loop", 4.5, "#ffffff");
  expect(contrastRatio(light, "#ffffff")).toBeGreaterThanOrEqual(4);
});

test("rgb loop brightens and darkens in fixed steps", () => {
  const dark = applyReadableColor("#101010", "rgb-loop", 4.5, "#000000");
  expect(contrastRatio(dark, "#000000")).toBeGreaterThanOrEqual(3.8);

  const light = applyReadableColor("#f0f0f0", "rgb-loop", 4.5, "#ffffff");
  expect(contrastRatio(light, "#ffffff")).toBeGreaterThanOrEqual(2.8);
});

test("alpha is preserved through adjustments", () => {
  const result = applyReadableColor(
    "rgba(0, 0, 255, 0.5)",
    "hsl-luma",
    4.5,
    "#000000",
  );
  expect(result).toMatch(/^rgba\(\d+, \d+, \d+, 0\.5\)$/);
});

test("unparseable colours are returned unchanged", () => {
  expect(applyReadableColor("rebeccapurple", "hsl-luma", 4.5, "#000000")).toBe(
    "rebeccapurple",
  );
});

test("parses the colour syntaxes chat platforms send", () => {
  expect(parseCssColor("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  expect(parseCssColor("#11223380")?.a).toBeCloseTo(0.502, 2);
  expect(parseCssColor("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  expect(parseCssColor("rgba(0 0 0 / 50%)")?.a).toBeCloseTo(0.5, 5);
  expect(parseCssColor("rebeccapurple")).toBeNull();
});

test("composites the overlay backing over black", () => {
  expect(compositeOverBlack("#ffffff", 0)).toBe("#000000");
  expect(compositeOverBlack("#ffffff", 0.5)).toBe("#808080");
  expect(compositeOverBlack("#ffffff", 1)).toBe("#ffffff");
});

test("normalizes mode and contrast input", () => {
  expect(normalizeReadableColorMode("nope")).toBe("unchanged");
  expect(normalizeReadableColorMode("luv-luma")).toBe("luv-luma");
  expect(normalizeReadableColorContrast(Number.NaN)).toBe(
    DEFAULT_READABLE_COLOR_CONTRAST,
  );
  expect(normalizeReadableColorContrast(0)).toBe(1);
  expect(normalizeReadableColorContrast(100)).toBe(21);
});

test("the config helper respects explicit overrides", () => {
  const base = {
    ...DEFAULT_CHAT_CONFIG,
    overlayBackgroundColor: "#000000",
    overlayBackgroundOpacity: 100,
  };

  expect(
    resolveReadableNickColor(
      { ...base, readableColorsMode: "unchanged" },
      "#123456",
    ),
  ).toBe("#123456");
  expect(
    resolveReadableNickColor(
      { ...base, readableColorsMode: "none" },
      "#123456",
    ),
  ).toBe("");
  expect(
    resolveReadableNickColor(
      {
        ...base,
        readableColorsMode: "hsl-luma",
        readableColorsContrast: 4.5,
      },
      "#000080",
    ),
  ).not.toBe("#000080");
});
