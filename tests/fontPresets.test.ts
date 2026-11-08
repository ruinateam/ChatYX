import { expect, test } from "bun:test";
import {
  DEFAULT_CHAT_CONFIG,
  chatConfigToSearchParams,
  parseChatConfigFromSearchParams,
} from "../src/config/chatUrlParams";
import { FONTS, getFontFamily } from "../src/styles/chatStyles";

test("keeps existing font presets and appends Monocraft as preset 14", () => {
  expect(FONTS[12]).toBe("'BF Mono', monospace");
  expect(FONTS[13]).toBe("'Monocraft', monospace");
  expect(getFontFamily({ ...DEFAULT_CHAT_CONFIG, font: 14 })).toBe(
    "'Monocraft', monospace",
  );
});

test("round-trips the Monocraft font preset through the overlay URL", () => {
  const params = chatConfigToSearchParams({
    ...DEFAULT_CHAT_CONFIG,
    font: 14,
  });

  expect(params.get("f")).toBe("14");
  expect(parseChatConfigFromSearchParams(params).font).toBe(14);
});
