export type ProviderTag = "openrouter" | "nyok" | "pollinations-img";

export type ZillaRequest = {
  command: string;
  openRouterKey?: string;
  openRouterModel?: string;
  pollinationsKey?: string;
};

export function parseProviderTag(command: string): ProviderTag {
  const normalized = command.toLowerCase();

  if (normalized.includes("@pollinations-img")) {
    return "pollinations-img";
  }

  if (normalized.includes("@nyok")) {
    return "nyok";
  }

  return "openrouter";
}

export function stripTags(command: string) {
  return command.replace(/@(openrouter|nyok|pollinations-img)\b/gi, "").trim();
}

export function buildSystemPrompt(tag: ProviderTag) {
  if (tag === "pollinations-img") {
    return "Generate a concise image prompt from the user's request. Return only the prompt text.";
  }

  if (tag === "nyok") {
    return "You are AI-zilla's reasoning agent. Give direct, structured, implementation-ready answers. Do not use placeholders.";
  }

  return "You are AI-zilla's command agent. Give direct, structured, implementation-ready answers. Do not use placeholders.";
}

export function buildPollinationsImageUrl(prompt: string, key?: string) {
  const params = new URLSearchParams({
    width: "1280",
    height: "720",
    model: "flux",
    seed: String(Math.abs(hashText(prompt)) % 100000)
  });

  if (key) {
    params.set("key", key);
  }

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
