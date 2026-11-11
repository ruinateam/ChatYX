import { afterEach, describe, expect, test } from "bun:test";
import { KickSourceWorker, normalizeKickHistory, normalizeKickRealtimeEvent } from "./kick";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe("Kick source", () => {
  test("ignores malformed history entries without losing valid messages", () => {
    const history = normalizeKickHistory({ data: { messages: [
      null,
      { id: "message-1", content: "hello", sender: { username: "viewer" }, created_at: "2024-01-01T00:00:00Z" },
    ] } });
    expect(history.map((message) => message.id)).toEqual(["message-1"]);
  });

  test("ignores malformed realtime messages", () => {
    expect(normalizeKickRealtimeEvent({ push: { pub: { data: {
      event: "App\\Events\\ChatMessageEvent", data: null,
    } } } })).toBeNull();
  });

  test("does not fetch history after stopping during channel lookup", async () => {
    let resolveLookup!: (response: Response) => void;
    const requested: string[] = [];
    globalThis.fetch = ((url: string | URL | Request) => {
      requested.push(String(url));
      if (requested.length === 1) return new Promise<Response>((resolve) => { resolveLookup = resolve; });
      return Promise.resolve(Response.json({ data: { messages: [] } }));
    }) as typeof fetch;
    const worker = new KickSourceWorker("test-channel");
    const start = worker.start(() => {});
    worker.stop();
    resolveLookup(Response.json({ id: 1, chatroom: { id: 2 } }));
    await start;
    expect(requested).toEqual(["https://kick.com/api/v2/channels/test-channel"]);
  });

  test("does not publish history after stopping during the history request", async () => {
    let resolveHistory!: (response: Response) => void;
    let historyStarted!: () => void;
    const started = new Promise<void>((resolve) => { historyStarted = resolve; });
    globalThis.fetch = ((url: string | URL | Request) => {
      if (String(url).includes("/api/v2/channels/")) {
        return Promise.resolve(Response.json({ id: 1, chatroom: { id: 2 } }));
      }
      historyStarted();
      return new Promise<Response>((resolve) => { resolveHistory = resolve; });
    }) as typeof fetch;
    const events: unknown[] = [];
    const worker = new KickSourceWorker("test-channel");
    const start = worker.start((event) => events.push(event));
    await started;
    worker.stop();
    resolveHistory(Response.json({ data: { messages: [
      { id: "message-1", content: "hello", sender: { username: "viewer" }, created_at: "2024-01-01T00:00:00Z" },
    ] } }));
    await start;
    expect(events).toEqual([]);
  });
});
