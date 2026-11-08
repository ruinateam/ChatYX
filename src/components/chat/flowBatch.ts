export function prepareFlowBatch(rows: HTMLElement[], remainingOffset = 0): number {
  const total = rows.reduce(
    (sum, row) => sum + (row.offsetHeight || row.getBoundingClientRect().height),
    0,
  );
  for (const row of rows) {
    if (row.classList.contains("message-enter")) {
      row.style.setProperty("--chat-flow-entry-shift", `${total + remainingOffset}px`);
    }
  }
  return total;
}

/**
 * A late badge/emote load reflows a row while the entrance shift is still
 * running. Rows positioned after the resized row moved by `delta` the instant
 * the layout was computed, so their held offsets must absorb the same delta:
 * folding it in before the paint keeps the frame continuous.
 */
export function remainingOffsetsAfterRowResize(
  remainingOffsets: number[],
  resizedIndex: number,
  delta: number,
): number[] {
  return remainingOffsets.map((offset, index) =>
    index > resizedIndex ? offset + delta : offset,
  );
}
