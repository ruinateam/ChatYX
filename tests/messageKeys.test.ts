import { expect, test } from "bun:test";
import { indexMessageRows, pruneMessageIds } from "../src/components/chat/messageKeys";

test("a refreshed message keeps its row key and exposes its updated value", () => {
  const original = { id: "1", platform: "twitch", text: "old" };
  const updated = { ...original, text: "new" };
  const before = indexMessageRows([original]);
  const after = indexMessageRows([updated]);

  expect(after.keys[0]).toBe(before.keys[0]);
  expect(after.messages.get(before.keys[0])).toBe(updated);
});

test("messages with matching ids retain distinct keys", () => {
  const one = { id: "same", platform: "twitch" };
  const two = { id: "same", platform: "youtube" };
  const duplicate = { ...one };
  const result = indexMessageRows([one, two, duplicate]);

  expect(new Set(result.keys).size).toBe(3);
  expect(result.keys.map((key) => result.messages.get(key))).toEqual([one, two, duplicate]);
});

test("message id tracking drops entries after their rows leave the list", () => {
  const tracked = new Set(["old", "current"]);
  pruneMessageIds(tracked, [{ id: "current" }]);
  expect([...tracked]).toEqual(["current"]);
});
