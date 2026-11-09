import { t } from "~/i18n";
import {
  MAX_READABLE_COLOR_CONTRAST,
  MIN_READABLE_COLOR_CONTRAST,
  type ReadableColorMode,
} from "~/utils/readableColor";
import { SetupNumberField } from "../SetupNumberField";
import { SetupSelect } from "../SetupSelect";
import type { ControlRow } from "../SetupLayout";

/** Form state and callbacks the readable-colour rows read. */
export type ReadableColorRowsSource = {
  mode: () => ReadableColorMode;
  setMode: (value: ReadableColorMode) => void;
  contrast: () => string;
  setContrast: (value: string) => void;
};

/**
 * Readable colour controls: the minimum contrast ratio and the FFZ-compatible
 * adjustment mode applied to platform nickname colours.
 */
export function createReadableColorRows(
  source: ReadableColorRowsSource,
): ControlRow[] {
  const { mode, setMode, contrast, setContrast } = source;

  return [
    {
      label: () => t("setup.minimumContrast"),
      hint: () => t("setup.minimumContrastHint"),
      control: (_labelId) => (
        <SetupNumberField
          label={t("setup.minimumContrast")}
          value={contrast()}
          onChange={setContrast}
          min={MIN_READABLE_COLOR_CONTRAST}
          max={MAX_READABLE_COLOR_CONTRAST}
          step={0.1}
        />
      ),
    },
    {
      label: () => t("setup.colorAdjustment"),
      hint: () => t("setup.colorAdjustmentHint"),
      control: (labelId) => (
        <SetupSelect
          aria-labelledby={labelId}
          value={mode()}
          onChange={(event) =>
            setMode(event.currentTarget.value as ReadableColorMode)
          }
        >
          <option value="none">{t("setup.adjustmentNone")}</option>
          <option value="unchanged">{t("setup.adjustmentUnchanged")}</option>
          <option value="hsl-luma">{t("setup.adjustmentHslLuma")}</option>
          <option value="luv-luma">{t("setup.adjustmentLuvLuma")}</option>
          <option value="hsl-loop">{t("setup.adjustmentHslLoop")}</option>
          <option value="rgb-loop">{t("setup.adjustmentRgbLoop")}</option>
        </SetupSelect>
      ),
    },
  ];
}
