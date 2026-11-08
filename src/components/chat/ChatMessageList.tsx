import { createEffect, createMemo, For, Show, onCleanup, onMount } from "solid-js";
import type { ChatConfig } from "~/config/chatUrlParams";
import type { TwitchMessage, ChatPresentationService } from "~/services/chat";
import { ChatMessage } from "~/components/chat/ChatMessage";
import {
  prepareFlowBatch,
  remainingOffsetsAfterRowResize,
} from "~/components/chat/flowBatch";
import { indexMessageRows, pruneMessageIds } from "~/components/chat/messageKeys";
import { installMessageImageFallback } from "~/utils/chat/messageImageFallback";
import { shouldHideLinkedReward } from "~/utils/chat/linkUtils";

type ChatMessageListProps = {
  messages: TwitchMessage[];
  config: ChatConfig | null;
  service: ChatPresentationService | null;
  animationDurationMs: number;
  onMessageExpired?: (messageId: string) => void;
};

function currentTransformY(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const parts = style.translate?.split(/\s+/) ?? [];
  const translateY = Number.parseFloat(parts[1] ?? "0") || 0;
  const transform = style.transform;
  if (!transform || transform === "none") return translateY;
  try {
    return (new DOMMatrixReadOnly(transform).m42 || 0) + translateY;
  } catch {
    const match = transform.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([^)]+)\)/);
    const parsed = match ? Number.parseFloat(match[1] ?? "") : Number.NaN;
    return (Number.isFinite(parsed) ? parsed : 0) + translateY;
  }
}

function useFlow(config: ChatConfig | null): boolean {
  return Boolean(
    config &&
      config.animation === "flow" &&
      !config.horizontal &&
      !config.reverseLineOrder,
  );
}

export const ChatMessageList = (props: ChatMessageListProps) => {
  let cleanupImageFallback: (() => void) | undefined;
  let flowObserver: MutationObserver | undefined;
  let flowPlayFrame: number | undefined;
  let flowCleanupTimer: number | undefined;
  let observeFlowRows: ((row: HTMLElement) => void) | undefined;
  const knownMessageIds = new Set<string>();
  // Badge/asset refreshes recreate a row with the same id; each id animates once.
  const animatedMessageIds = new Set<string>();
  const orderedMessages = createMemo(() => {
    const config = props.config;
    if (!config) return props.messages;

    const messages = props.messages.filter(
      (message) => !shouldHideLinkedReward(message, config),
    );
    const useFlowStack =
      config.animation === "flow" &&
      !config.horizontal &&
      !config.reverseLineOrder;
    return config.reverseLineOrder || useFlowStack ? messages.reverse() : messages;
  });
  const indexedMessages = createMemo(() => indexMessageRows(orderedMessages()));
  createEffect(() => {
    pruneMessageIds(knownMessageIds, props.messages);
    pruneMessageIds(animatedMessageIds, props.messages);
  });

  onMount(() => {
    const container = document.getElementById("chat_container");
    if (!container) return;

    cleanupImageFallback = installMessageImageFallback(container);

    let flowPending: HTMLElement[] = [];
    const heldRowHeights = new Map<HTMLElement, number>();

    const playFlow = () => {
      const shifted = flowPending;
      flowPending = [];
      if (shifted.length === 0) return;
      flowPlayFrame = window.requestAnimationFrame(() => {
        flowPlayFrame = undefined;
        for (const element of shifted) {
          if (!element.isConnected) continue;
          element.style.transition = `transform ${props.animationDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`;
          element.style.transform = "";
        }
        flowCleanupTimer = window.setTimeout(() => {
          for (const element of shifted) {
            if (element.isConnected) element.style.transition = "";
          }
          flowCleanupTimer = undefined;
        }, props.animationDurationMs + 50);
      });
    };

    // Runs synchronously inside the mutation callback (before paint), so no
    // uncorrected frame is ever rendered: old rows are already held at their
    // prior visual position when the browser paints the new row.
    const invertFlow = () => {
      const config = props.config;
      // Every row must carry a resize baseline: a missed one freezes nothing
      // on its first asset reflow, which is the exact frame-user defect.
      for (const row of container.querySelectorAll<HTMLElement>(".chat_line")) {
        if (!heldRowHeights.has(row)) observeFlowRows?.(row);
      }
      if (
        config?.animation !== "flow" ||
        config.horizontal ||
        config.reverseLineOrder ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const newMessages = orderedMessages()
        .filter((message) => message.restored !== true)
        .filter((message) => !knownMessageIds.has(message.id));
      // Asset/badge refreshes recreate a row with the same id: no new row,
      // no shift. A parked play keeps its scheduled start below.
      if (newMessages.length === 0) return;

      // Seed the initial bulk too: without this every later arrival looks
      // new next to unseeded history and the shift below never runs.
      for (const message of newMessages) knownMessageIds.add(message.id);

      const newIdSet = new Set(newMessages.map((message) => message.id));
      const rows = Array.from(container.querySelectorAll<HTMLElement>(".chat_line"));
      const existing = rows.filter((el) => el.isConnected && !newIdSet.has(el.dataset.id ?? ""));
      const remainingOffsets = existing.map(currentTransformY);
      const addedHeight = prepareFlowBatch(
        rows.filter((element) => newIdSet.has(element.dataset.id ?? "")),
        Math.max(0, ...remainingOffsets),
      );
      if (addedHeight < 0.5) return;

      if (existing.length === 0) return;

      // A new arrival during a running shift folds in: keep the remaining
      // offset so rows never jump backwards. Only now is it safe to drop
      // the previous cleanup timer.
      if (flowCleanupTimer !== undefined) {
        window.clearTimeout(flowCleanupTimer);
        flowCleanupTimer = undefined;
      }
      // A parked (not yet started) play is superseded by this larger shift.
      if (flowPlayFrame !== undefined) {
        window.cancelAnimationFrame(flowPlayFrame);
        flowPlayFrame = undefined;
      }
      for (const [index, element] of existing.entries()) {
        const remaining = remainingOffsets[index] ?? 0;
        // Fold a still-running entry into the shared shift before restarting it.
        element.classList.remove("message-enter");
        element.style.transition = "none";
        element.style.transform = `translate3d(0, ${remaining + addedHeight}px, 0)`;
      }
      flowPending = existing;
      playFlow();
    };

    flowObserver = new MutationObserver(invertFlow);
    flowObserver.observe(container, { childList: true });

    // Late badge/emote loads reflow rows at any time in flow layout: the
    // bottom-anchored stack shifts every visible row the moment layout is
    // recomputed. ResizeObserver callbacks run after layout but before paint,
    // so folding the height delta into the held offsets here keeps the
    // paint continuous, then the affected rows glide to their rest.
    const foldResize = (row: HTMLElement, delta: number) => {
      const config = props.config;
      if (!useFlow(config) || Math.abs(delta) < 0.01) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const rows = Array.from(
        container.querySelectorAll<HTMLElement>(".chat_line"),
      ).filter((element) => element.isConnected);
      const resizedIndex = rows.indexOf(row);
      if (resizedIndex < 0) return;
      const shifted = rows.filter((_, index) => index > resizedIndex);
      if (shifted.length === 0) return;
      const adjusted = remainingOffsetsAfterRowResize(
        rows.map(currentTransformY),
        resizedIndex,
        delta,
      );
      const shiftSet = new Set(shifted);

      if (flowCleanupTimer !== undefined) {
        window.clearTimeout(flowCleanupTimer);
        flowCleanupTimer = undefined;
      }
      if (flowPlayFrame !== undefined) {
        window.cancelAnimationFrame(flowPlayFrame);
        flowPlayFrame = undefined;
      }
      for (const [index, element] of rows.entries()) {
        if (!shiftSet.has(element)) continue;
        element.classList.remove("message-enter");
        element.style.transition = "none";
        element.style.transform = `translate3d(0, ${adjusted[index] ?? 0}px, 0)`;
      }
      flowPending = Array.from(new Set([...shifted, ...flowPending]));
      playFlow();
    };
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const row = entry.target as HTMLElement;
        if (!row.isConnected) {
          heldRowHeights.delete(row);
          continue;
        }
        const previous = heldRowHeights.get(row);
        // The live height is authoritative at callback time: a first-fire race
        // between the observe call and the row's content could otherwise seed
        // a stale baseline.
        const height = row.offsetHeight || entry.contentRect.height;
        heldRowHeights.set(row, height);
        if (previous !== undefined) foldResize(row, height - previous);
      }
    });
    observeFlowRows = (row) => {
      if (heldRowHeights.has(row)) return;
      // Seed synchronously from live layout so the first real change measures
      // the delta against the row's current height, not a first-fire race.
      heldRowHeights.set(row, row.offsetHeight);
      resizeObserver.observe(row);
    };
    container
      .querySelectorAll<HTMLElement>(".chat_line")
      .forEach((row) => observeFlowRows?.(row));
    onCleanup(() => resizeObserver.disconnect());
  });

  onCleanup(() => {
    cleanupImageFallback?.();
    flowObserver?.disconnect();
    if (flowPlayFrame !== undefined) {
      window.cancelAnimationFrame(flowPlayFrame);
    }
    if (flowCleanupTimer !== undefined) {
      window.clearTimeout(flowCleanupTimer);
    }
  });

  // Restored history and the initial preview batch arrive as one bulk flush.
  // They render without an entry animation; the flag flips in a microtask so
  // every item created in the same synchronous flush sees the same value.
  let firstBatchDone = false;
  let firstBatchScheduled = false;

  return (
    <Show when={props.config && props.service}>
      <For each={indexedMessages().keys}>
        {(key) => {
          const initialMessage = indexedMessages().messages.get(key)!;
          // Keep the last value until Solid disposes a removed row.
          const currentMessage = createMemo<TwitchMessage>((previous) =>
            indexedMessages().messages.get(key) ?? previous, initialMessage);
          const message = initialMessage;
          const animateEntry = firstBatchDone && !animatedMessageIds.has(message.id);
          animatedMessageIds.add(message.id);
          if (!firstBatchDone && !firstBatchScheduled) {
            firstBatchScheduled = true;
            queueMicrotask(() => {
              firstBatchScheduled = false;
              firstBatchDone = true;
            });
          }
          return (
            <ChatMessage
              message={currentMessage()}
              config={props.config!}
              service={props.service!}
              animationDurationMs={props.animationDurationMs}
              onExpired={props.onMessageExpired}
              animateEntry={animateEntry}
            />
          );
        }}
      </For>
    </Show>
  );
};
