import { expect, test } from "bun:test";
import { DEFAULT_CHAT_CONFIG } from "../src/config/chatUrlParams";
import {
  createContainerStyle,
  createOverlayRootStyle,
  createSurfaceStyle,
  measureContentWidth,
} from "../src/features/chat-overlay";

function row(width: number): HTMLElement {
  return { getBoundingClientRect: () => ({ width }) } as unknown as HTMLElement;
}

test("measures the widest rendered row", () => {
  expect(measureContentWidth([row(120), row(300), row(80)], 1000)).toBe(300);
});

test("caps the measured width at the available parent width", () => {
  // A message wider than the parent must wrap, not overflow the overlay.
  expect(measureContentWidth([row(1200), row(300)], 800)).toBe(800);
});

test("an empty list measures zero", () => {
  expect(measureContentWidth([], 800)).toBe(0);
});

test("parent mode keeps the surface at the full parent width", () => {
  expect(createSurfaceStyle(DEFAULT_CHAT_CONFIG, 200, "parent").width).toBe(
    "100%",
  );
  expect(createSurfaceStyle(DEFAULT_CHAT_CONFIG, 200).width).toBe("100%");
});

test("content mode reads the measured width with a full-width fallback", () => {
  expect(createSurfaceStyle(DEFAULT_CHAT_CONFIG, 200, "content").width).toBe(
    "var(--chat-content-width, 100%)",
  );
});

test("the root and container stay full width so long lines wrap", () => {
  // They are the measuring basis: shrinking them would feed the measured width
  // back into itself and collapse the overlay.
  expect(createOverlayRootStyle(true, "content").width).toBe("100%");
  expect(createContainerStyle().width).toBe("100%");
});
