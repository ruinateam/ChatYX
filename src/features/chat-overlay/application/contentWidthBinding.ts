import { measureContentWidth } from "../model/overlayStyles";

export interface ContentWidthBindingOptions {
  /** Always full parent width: the basis the content width is measured in. */
  root: HTMLElement;
  /** Scroll container that holds the message rows. */
  container: HTMLElement;
  /** Surface that receives the measured width, padding and border included. */
  surface: HTMLElement;
  isEnabled: () => boolean;
}

export interface ContentWidthBinding {
  refresh: () => void;
  destroy: () => void;
}

const ROW_SELECTOR = ".chat_line";
const CHROME_PROPERTIES = [
  "padding-left",
  "padding-right",
  "border-left-width",
  "border-right-width",
] as const;
export const CONTENT_WIDTH_PROPERTY = "--chat-content-width";

/**
 * Publishes `--chat-content-width` for the "content" overlay width mode.
 *
 * The surface cannot shrink to its content through CSS alone: a container that
 * sizes to its content and content that wraps to its container resolve each
 * other to the minimum. Measurement breaks the cycle — rows are laid out at the
 * full parent width, the widest row becomes the surface width (plus the surface
 * chrome), and the container stays at 100% so long lines still wrap.
 */
export function bindContentWidth({
  root,
  container,
  surface,
  isEnabled,
}: ContentWidthBindingOptions): ContentWidthBinding {
  let frame: number | undefined;

  const rows = () =>
    Array.from(container.querySelectorAll<HTMLElement>(ROW_SELECTOR)).filter(
      (row) => row.isConnected,
    );

  const apply = () => {
    frame = undefined;
    if (!isEnabled()) {
      root.style.removeProperty(CONTENT_WIDTH_PROPERTY);
      return;
    }

    // Measure at the full parent width every time. Leaving the previous width
    // in place would make a transient early measurement permanent: rows wrap
    // to the narrowed width and never report their natural size again. Both
    // steps happen synchronously before paint, so the reset is never shown.
    root.style.removeProperty(CONTENT_WIDTH_PROPERTY);
    const style = getComputedStyle(surface);
    const chromeWidth = CHROME_PROPERTIES.reduce(
      (sum, property) =>
        sum + (Number.parseFloat(style.getPropertyValue(property)) || 0),
      0,
    );
    const available = Math.max(
      0,
      root.getBoundingClientRect().width - chromeWidth,
    );
    const value = `${Math.ceil(
      measureContentWidth(rows(), available) + chromeWidth,
    )}px`;
    root.style.setProperty(CONTENT_WIDTH_PROPERTY, value);
  };

  const schedule = () => {
    if (frame === undefined) frame = window.requestAnimationFrame(apply);
  };

  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(root);
  const observed = new Set<HTMLElement>();

  const observeRows = () => {
    for (const row of observed) {
      if (!row.isConnected) {
        resizeObserver.unobserve(row);
        observed.delete(row);
      }
    }
    for (const row of rows()) {
      if (observed.has(row)) continue;
      observed.add(row);
      resizeObserver.observe(row);
    }
  };

  const mutationObserver = new MutationObserver(() => {
    observeRows();
    schedule();
  });
  mutationObserver.observe(container, { childList: true });

  observeRows();
  schedule();
  // A late webfont changes the widest row without necessarily changing its
  // height, so neither observer above would fire.
  void document.fonts?.ready.then(schedule).catch(() => {});

  return {
    refresh: schedule,
    destroy: () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      frame = undefined;
      observed.clear();
      root.style.removeProperty(CONTENT_WIDTH_PROPERTY);
    },
  };
}
