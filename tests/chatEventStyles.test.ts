import { describe, expect, test } from "bun:test";
import { getChatEventStyleVariables } from "../src/styles/chatEventStyles";
import { getOverlayStyleVariables, SIZE_CONFIGS } from "../src/styles/chatStyles";
import { DEFAULT_CHAT_CONFIG } from "../src/config/chatUrlParams";
import { DEFAULT_EVENT_COLORS } from "../src/config/eventColors";

describe("chat event style variables", () => {
  test("uses the configured color for each semantic event", () => {
    const variables = getChatEventStyleVariables({
      event: { type: "reward", label: "" },
      colors: { ...DEFAULT_EVENT_COLORS, eventColorReward: "#ff00ff" }, opacity: 35,
    });

    expect(variables["--chat-event-color"]).toBe("#ff00ff");
    expect(variables["--chat-event-opacity"]).toBe("35%");
  });

  test("allows Twitch announcement levels to provide their resolved accent", () => {
    const variables = getChatEventStyleVariables({
      event: { type: "announcement", label: "", level: "GREEN" },
      colors: { ...DEFAULT_EVENT_COLORS, eventColorAnnGreen: "#abcdef" }, opacity: 0,
    });

    expect(variables["--chat-event-color"]).toBe("#abcdef");
  });

  test("falls back safely when an event color is invalid", () => {
    const variables = getChatEventStyleVariables({
      event: {
        type: "announcement",
        label: "",
      },
      colors: { ...DEFAULT_EVENT_COLORS, eventColorAnnPrimary: "url(javascript:invalid)" }, opacity: 22,
    });

    expect(variables["--chat-event-color"]).toBe(DEFAULT_EVENT_COLORS.eventColorAnnPrimary);
  });

  test("publishes the scaled gigantified emote width for every size preset", () => {
    for (const size of [1, 2, 3] as const) {
      const variables = getOverlayStyleVariables({
        ...DEFAULT_CHAT_CONFIG,
        size,
        gigantifiedEmoteScale: 1.5,
      });
      expect(variables["--chat-gigantified-emote-width"]).toBe(
        `${Number.parseFloat(SIZE_CONFIGS[size].gigantifiedEmoteWidth) * 1.5}px`,
      );
    }
  });

  test("scales the message line height", () => {
    const variables = getOverlayStyleVariables({
      ...DEFAULT_CHAT_CONFIG,
      size: 1,
      lineHeight: 150,
    });
    expect(variables["--chat-line-height"]).toBe("45px");
  });

  test("keeps the default giant size ceiling independent from its requested scale", () => {
    for (const size of [1, 2, 3] as const) {
      for (const gigantifiedEmoteScale of [0.25, 1, 3]) {
        const variables = getOverlayStyleVariables({
          ...DEFAULT_CHAT_CONFIG,
          size,
          gigantifiedEmoteScale,
        });
        expect(variables["--chat-gigantified-emote-max-size"]).toBe(
          SIZE_CONFIGS[size].gigantifiedEmoteWidth,
        );
      }
    }
  });

  test("clamps the line height percentage", () => {
    expect(
      getOverlayStyleVariables({ ...DEFAULT_CHAT_CONFIG, size: 1, lineHeight: 900 })[
        "--chat-line-height"
      ],
    ).toBe("60px");
    expect(
      getOverlayStyleVariables({ ...DEFAULT_CHAT_CONFIG, size: 1, lineHeight: 0 })[
        "--chat-line-height"
      ],
    ).toBe("24px");
  });

  test("folds the emote scale into the emote and emoji sizes", () => {
    const scaled = getOverlayStyleVariables({
      ...DEFAULT_CHAT_CONFIG,
      size: 2,
      emoteScale: 1.5,
    });
    expect(scaled["--chat-emote-max-width"]).toBe("192px");
    expect(scaled["--chat-emote-max-height"]).toBe("63px");
    expect(scaled["--chat-emoji-size"]).toBe("58.5px");
  });

  test("omits the shadow and stroke properties when they are switched off", () => {
    const off = getOverlayStyleVariables({
      ...DEFAULT_CHAT_CONFIG,
      shadow: false,
      stroke: false,
    });
    expect(off["--chat-shadow-filter"]).toBeUndefined();
    expect(off["--chat-stroke"]).toBeUndefined();
    expect(off["--chat-paint-order"]).toBeUndefined();
  });

  test("publishes the shadow and stroke properties when they are on", () => {
    const on = getOverlayStyleVariables({
      ...DEFAULT_CHAT_CONFIG,
      shadow: 3,
      stroke: 4,
    });
    expect(on["--chat-shadow-filter"]).toBe("drop-shadow(2px 2px 0.5rem #000000)");
    expect(on["--chat-stroke"]).toBe("4px #000000");
    expect(on["--chat-paint-order"]).toBe("stroke fill");
  });

  test("uses the configured shadow and stroke colors and falls back to black", () => {
    const custom = getOverlayStyleVariables({
      ...DEFAULT_CHAT_CONFIG,
      shadow: 1,
      stroke: 2,
      shadowColor: "#ff0000",
      strokeColor: "#00ff00",
    });
    expect(custom["--chat-shadow-filter"]).toBe("drop-shadow(2px 2px 0.2rem #ff0000)");
    expect(custom["--chat-stroke"]).toBe("2px #00ff00");

    const invalid = getOverlayStyleVariables({
      ...DEFAULT_CHAT_CONFIG,
      shadow: 1,
      stroke: 2,
      shadowColor: "red; color: blue",
      strokeColor: "",
    });
    expect(invalid["--chat-shadow-filter"]).toBe("drop-shadow(2px 2px 0.2rem #000000)");
    expect(invalid["--chat-stroke"]).toBe("2px #000000");
  });
});
