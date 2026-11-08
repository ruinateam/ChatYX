export function indexMessageRows<T extends { id: string; platform?: string }>(rows: T[]) {
  const counts = new Map<string, number>();
  const messages = new Map<string, T>();
  const keys = rows.map((message) => {
    const identity = JSON.stringify([message.platform || "twitch", message.id]);
    const occurrence = counts.get(identity) ?? 0;
    counts.set(identity, occurrence + 1);
    const key = `${identity}:${occurrence}`;
    messages.set(key, message);
    return key;
  });
  return { keys, messages };
}

export function pruneMessageIds(tracked: Set<string>, messages: readonly { id: string }[]) {
  const current = new Set(messages.map((message) => message.id));
  for (const id of tracked) {
    if (!current.has(id)) tracked.delete(id);
  }
}
