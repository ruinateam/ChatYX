export const VOICE_PROVIDERS = [
  "ChatIS / Streamlabs",
  "JustDavi / Azure",
] as const;

export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

export type Voice = {
  readonly provider: VoiceProvider;
  readonly voice: string;
  readonly locale: string;
  readonly gender: string;
  readonly features: string;
};

function isVoiceProvider(value: string): value is VoiceProvider {
  return VOICE_PROVIDERS.some((provider) => provider === value);
}

export function parseVoiceCatalog(source: string): Voice[] {
  const voices: Voice[] = [];
  let provider: VoiceProvider | undefined;

  for (const line of source.split(/\r?\n/)) {
    const section = /^\[(.+)]$/.exec(line.trim());
    if (section) {
      const candidate = section[1] ?? "";
      provider = isVoiceProvider(candidate) ? candidate : undefined;
      continue;
    }
    if (!provider || !line.startsWith("|")) continue;

    const [voice, locale, gender, features] = line
      .split("|")
      .slice(1, -1)
      .map((column) => column.trim());
    if (
      !voice ||
      voice === "Voice" ||
      voice.startsWith("---") ||
      !locale ||
      !gender ||
      features === undefined
    ) {
      continue;
    }

    voices.push({ provider, voice, locale, gender, features });
  }

  return voices.sort(
    (left, right) =>
      VOICE_PROVIDERS.indexOf(left.provider) -
        VOICE_PROVIDERS.indexOf(right.provider) ||
      left.voice.localeCompare(right.voice),
  );
}
