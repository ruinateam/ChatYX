import type { ChatConfig } from "./chatUrlParams";
import { applyReadableColor, compositeOverBlack } from "../utils/readableColor";

export type ReadableColorConfig = Pick<
  ChatConfig,
  | "readableColorsMode"
  | "readableColorsContrast"
  | "overlayBackgroundColor"
  | "overlayBackgroundOpacity"
>;

/**
 * Resolves the nickname/action/mention colour through the configured readable
 * colour mode. Paints and the uniform nickname colour are resolved by callers
 * before this point, so they are never adjusted.
 */
export function resolveReadableNickColor(
  config: ReadableColorConfig,
  color: string,
): string {
  if (!color) return color;

  const background = compositeOverBlack(
    config.overlayBackgroundColor,
    config.overlayBackgroundOpacity / 100,
  );

  return applyReadableColor(
    color,
    config.readableColorsMode,
    config.readableColorsContrast,
    background,
  );
}
