import { expect, test } from "bun:test";
import { prepareFlowBatch, remainingOffsetsAfterRowResize } from "../src/components/chat/flowBatch";

test("a batch of new rows enters together by its total height", () => {
  const shifts: string[] = [];
  const rows = [12, 30].map((height) => ({
    offsetHeight: height,
    getBoundingClientRect: () => ({ height }),
    classList: { contains: () => true },
    style: { setProperty: (_name: string, value: string) => shifts.push(value) },
  })) as unknown as HTMLElement[];

  expect(prepareFlowBatch(rows)).toBe(42);
  expect(shifts).toEqual(["42px", "42px"]);
});

test("new rows start behind the remaining motion of previous rows", () => {
  const shifts: string[] = [];
  const rows = [{
    offsetHeight: 20,
    getBoundingClientRect: () => ({ height: 20 }),
    classList: { contains: () => true },
    style: { setProperty: (_name: string, value: string) => shifts.push(value) },
  }] as unknown as HTMLElement[];

  expect(prepareFlowBatch(rows, 8)).toBe(20);
  expect(shifts).toEqual(["28px"]);
});

test("rows after a resized row keep their visual position during a shift", () => {
  // A late emote/badge grows a row mid-flight; later rows must be re-held by
  // the same delta so the frame never snaps.
  expect(remainingOffsetsAfterRowResize([0, 22, 22], 1, 18)).toEqual([0, 22, 40]);
  expect(remainingOffsetsAfterRowResize([0, 22, 22], 1, -18)).toEqual([0, 22, 4]);
  // The last row resizes: nothing sits after it, nobody moves.
  expect(remainingOffsetsAfterRowResize([0, 22, 22], 2, 18)).toEqual([0, 22, 22]);
});
