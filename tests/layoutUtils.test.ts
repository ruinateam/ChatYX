import { describe, expect, test } from "bun:test";
import {
  LayoutManager,
  getLayoutStyles,
  getScrollPosition,
  isScrolledToEnd,
  scrollToLatest,
  stepSmoothScroll,
} from "../src/services/chat/runtime/layoutManager";

function createContainer(
  values: Partial<HTMLElement> = {},
): HTMLElement & { lastScroll?: ScrollToOptions } {
  const container = {
    clientHeight: 300,
    clientWidth: 400,
    scrollHeight: 900,
    scrollWidth: 1200,
    scrollLeft: 0,
    scrollTop: 0,
    scrollTo(options: ScrollToOptions) {
      this.lastScroll = options;
    },
    ...values,
  };

  return container as unknown as HTMLElement & {
    lastScroll?: ScrollToOptions;
  };
}

describe("chat layout scrolling", () => {
  test("keeps a stable flex direction when message order is reversed", () => {
    const normal = getLayoutStyles({ horizontal: false, reverse: false });
    const reverse = getLayoutStyles({ horizontal: false, reverse: true });

    expect(normal).toContain("flex-direction: column");
    expect(reverse).toContain("flex-direction: column");
    expect(reverse).not.toContain("column-reverse");
  });

  test("scrolls normal vertical chat to its latest message", () => {
    const container = createContainer();

    expect(getScrollPosition(container, { horizontal: false, reverse: false })).toBe(
      600,
    );
    scrollToLatest(container, { horizontal: false, reverse: false });
    expect(container.lastScroll).toEqual({ top: 600, behavior: "auto" });
  });

  test("keeps reversed chat at the start", () => {
    const container = createContainer({ scrollTop: 12 });

    expect(getScrollPosition(container, { horizontal: false, reverse: true })).toBe(
      0,
    );
    expect(
      isScrolledToEnd(container, { horizontal: false, reverse: true }, 10),
    ).toBe(false);

    scrollToLatest(container, { horizontal: false, reverse: true });
    expect(container.lastScroll).toEqual({ top: 0, behavior: "auto" });
  });

  test("uses horizontal scroll coordinates", () => {
    const container = createContainer({ scrollLeft: 795 });
    const options = { horizontal: true, reverse: false };

    expect(getScrollPosition(container, options)).toBe(800);
    expect(isScrolledToEnd(container, options, 10)).toBe(true);
  });

  test("leaves horizontal baseline alignment to the static stylesheet", () => {
    for (const reverse of [false, true]) {
      const styles = getLayoutStyles({ horizontal: true, reverse });
      expect(styles).toContain("flex-direction: row");
      expect(styles).not.toContain("align-items:");
    }
  });

  test("supports intentional smooth scrolling", () => {
    const container = createContainer();

    scrollToLatest(
      container,
      { horizontal: false, reverse: false },
      "smooth",
    );
    expect(container.lastScroll).toEqual({ top: 600, behavior: "smooth" });
  });
});

describe("smooth scroll glide", () => {
  test("starts from rest without a first-frame jump", () => {
    const next = stepSmoothScroll({ position: 0, velocity: 0 }, 166, 16);
    expect(next.position).toBeLessThan(166 / 10);
    expect(next.velocity).toBeGreaterThan(0);
  });

  test("settles on the target without overshooting", () => {
    let state = { position: 0, velocity: 0 };
    let peak = 0;
    for (let frame = 0; frame < 60; frame++) {
      state = stepSmoothScroll(state, 100, 16);
      peak = Math.max(peak, state.position);
    }
    expect(peak).toBeLessThanOrEqual(100.01);
    expect(Math.abs(state.position - 100)).toBeLessThan(0.5);
  });

  test("a retarget mid-glide keeps the motion instead of restarting it", () => {
    let state = { position: 0, velocity: 0 };
    for (let frame = 0; frame < 5; frame++) state = stepSmoothScroll(state, 100, 16);
    const next = stepSmoothScroll(state, 140, 16);
    expect(next.position).toBeGreaterThan(state.position);
    expect(next.velocity).toBeGreaterThan(state.velocity);
  });
});

describe("layout manager cleanup", () => {
  test("smooth scrolling reaches its target when the browser rounds scroll positions", () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousDocument = (globalThis as { document?: unknown }).document;
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    (globalThis as unknown as { window: unknown }).window = {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
      },
      cancelAnimationFrame: (id: number) => frames.delete(id),
    };
    (globalThis as unknown as { document: unknown }).document = {
      createElement: () => ({}), head: { appendChild: () => {} },
      getElementById: () => null, querySelectorAll: () => [],
    };
    try {
      const container = createContainer({
        classList: { remove: () => {}, add: () => {} },
      } as unknown as Partial<HTMLElement>);
      let scrollTop = 0;
      Object.defineProperty(container, "scrollTop", {
        get: () => scrollTop,
        set: (value: number) => { scrollTop = Math.round(value); },
      });
      const manager = new LayoutManager(container);
      manager.scrollIfNeeded("smooth", true);
      const start = performance.now();
      for (let i = 1; i <= 240 && frames.size; i++) {
        const [id, callback] = frames.entries().next().value!;
        frames.delete(id);
        callback(start + i * 16);
      }
      expect(scrollTop).toBe(600);
      expect(frames.size).toBe(0);
      manager.cleanup();
    } finally {
      if (previousWindow === undefined) Reflect.deleteProperty(globalThis, "window");
      else (globalThis as unknown as { window: unknown }).window = previousWindow;
      if (previousDocument === undefined) Reflect.deleteProperty(globalThis, "document");
      else (globalThis as unknown as { document: unknown }).document = previousDocument;
    }
  });

  test("cancels the pending settle scroll when smooth scrolling starts", () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousDocument = (globalThis as { document?: unknown }).document;
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    (globalThis as unknown as { window: unknown }).window = {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
      },
      cancelAnimationFrame: (id: number) => frames.delete(id),
      setTimeout: () => 1,
      clearTimeout: () => {},
    };
    (globalThis as unknown as { document: unknown }).document = {
      createElement: () => ({}), head: { appendChild: () => {} },
      getElementById: () => null, querySelectorAll: () => [],
    };
    try {
      const container = createContainer({
        classList: { remove: () => {}, add: () => {} },
      } as unknown as Partial<HTMLElement>);
      const manager = new LayoutManager(container);
      manager.scrollIfNeeded("auto", true);
      manager.scrollIfNeeded("smooth", true);
      expect(frames.has(1)).toBe(false);
      expect(frames.has(2)).toBe(true);
      manager.cleanup();
    } finally {
      if (previousWindow === undefined) Reflect.deleteProperty(globalThis, "window");
      else (globalThis as unknown as { window: unknown }).window = previousWindow;
      if (previousDocument === undefined) Reflect.deleteProperty(globalThis, "document");
      else (globalThis as unknown as { document: unknown }).document = previousDocument;
    }
  });

  test("settles after the browser has measured the new rows", () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousDocument = (globalThis as { document?: unknown }).document;
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    (globalThis as unknown as { window: unknown }).window = {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
      },
      cancelAnimationFrame: (id: number) => frames.delete(id),
    };
    (globalThis as unknown as { document: unknown }).document = {
      createElement: () => ({}), head: { appendChild: () => {} },
      getElementById: () => null, querySelectorAll: () => [],
    };
    try {
      const container = createContainer({
        classList: { remove: () => {}, add: () => {} },
      } as unknown as Partial<HTMLElement>);
      const manager = new LayoutManager(container);
      manager.scrollIfNeeded("auto", true);
      for (let i = 0; i < 3 && frames.size; i++) {
        const [id, callback] = frames.entries().next().value!;
        frames.delete(id);
        callback(performance.now() + i * 16);
      }
      expect(container.lastScroll).toEqual({ top: 600, behavior: "auto" });
      expect(frames.size).toBe(0);
      manager.cleanup();
    } finally {
      if (previousWindow === undefined) Reflect.deleteProperty(globalThis, "window");
      else (globalThis as unknown as { window: unknown }).window = previousWindow;
      if (previousDocument === undefined) Reflect.deleteProperty(globalThis, "document");
      else (globalThis as unknown as { document: unknown }).document = previousDocument;
    }
  });

  test("stops an in-flight smooth scroll when an immediate scroll replaces it", () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousDocument = (globalThis as { document?: unknown }).document;
    const cancelled: number[] = [];
    (globalThis as unknown as { window: unknown }).window = {
      requestAnimationFrame: () => 42,
      cancelAnimationFrame: (id: number) => cancelled.push(id),
    };
    (globalThis as unknown as { document: unknown }).document = {
      createElement: () => ({}),
      head: { appendChild: () => {} },
      getElementById: () => null,
      querySelectorAll: () => [],
    };

    try {
      const container = createContainer({
        classList: { remove: () => {}, add: () => {} },
      } as unknown as Partial<HTMLElement>);
      const manager = new LayoutManager(container);
      manager.scrollIfNeeded("smooth", true);
      manager.scrollIfNeeded("auto", true, false);

      expect(cancelled).toContain(42);
      expect(container.lastScroll).toEqual({ top: 600, behavior: "auto" });
      manager.cleanup();
    } finally {
      if (previousWindow === undefined) Reflect.deleteProperty(globalThis, "window");
      else (globalThis as unknown as { window: unknown }).window = previousWindow;
      if (previousDocument === undefined) Reflect.deleteProperty(globalThis, "document");
      else (globalThis as unknown as { document: unknown }).document = previousDocument;
    }
  });

  test("cancels the smooth follow it started", () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousDocument = (globalThis as { document?: unknown }).document;
    const frames: FrameRequestCallback[] = [];
    const head: Array<{ remove: () => void }> = [];
    let cancelled: number | undefined;

    (globalThis as unknown as { window: unknown }).window = {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.push(callback);
        return 42;
      },
      cancelAnimationFrame: (id: number) => {
        cancelled = id;
      },
    };
    (globalThis as unknown as { document: unknown }).document = {
      createElement: () => {
        const element = {
          remove: () => {
            const index = head.indexOf(element);
            if (index >= 0) head.splice(index, 1);
          },
        };
        head.push(element);
        return element;
      },
      head: { appendChild: () => {} },
      getElementById: () => null,
      querySelectorAll: () => head,
    };

    try {
      const container = createContainer({
        classList: { remove: () => {}, add: () => {} },
      } as unknown as Partial<HTMLElement>);
      const manager = new LayoutManager(container, {
        horizontal: false,
        reverse: false,
      });

      manager.scrollIfNeeded("smooth", true);
      expect(frames).toHaveLength(1);
      expect(head).toHaveLength(1);

      manager.cleanup();

      // The stylesheet and the pending animation frame both belong to the
      // manager, so teardown must release both.
      expect(cancelled).toBe(42);
      expect(head).toHaveLength(0);
    } finally {
      if (previousWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        (globalThis as unknown as { window: unknown }).window = previousWindow;
      }
      if (previousDocument === undefined) {
        Reflect.deleteProperty(globalThis, "document");
      } else {
        (globalThis as unknown as { document: unknown }).document = previousDocument;
      }
    }
  });
});
