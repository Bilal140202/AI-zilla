export type ProviderTag = "openrouter" | "nyok" | "local" | "pollinations-img";

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

  if (normalized.includes("@local") || normalized.includes("@webllm")) {
    return "local";
  }

  if (normalized.includes("@nyok")) {
    return "nyok";
  }

  return "openrouter";
}

export function stripTags(command: string) {
  return command.replace(/@(openrouter|nyok|local|webllm|pollinations-img)\b/gi, "").trim();
}

export function buildSystemPrompt(tag: ProviderTag) {
  if (tag === "pollinations-img") {
    return "Generate a concise image prompt from the user's request. Return only the prompt text.";
  }

  const persona =
    tag === "nyok"
      ? "You are AI-zilla's strict reasoning and architecture agent."
      : tag === "local"
        ? "You are AI-zilla's local browser model. Be concise but complete."
        : "You are AI-zilla's command agent.";

  return `${persona}

Transform the user's rough request into an extreme, production-grade build prompt that can be handed directly to a coding LLM.

Hard requirements:
- Do not output generic advice.
- Do not use placeholders like TODO, TBD, your app name, or insert API here.
- Infer a practical product scope from the user's request.
- Include concrete app architecture, screens, data flow, API routes, state, edge cases, and verification steps.
- Optimize for an AI coding agent that will build the project end-to-end.
- Keep the result readable as Markdown.

Output format exactly:
# AI-zilla Build Command

## Project Intent
Explain the product to build in one tight paragraph.

## Non-Negotiable Requirements
List the essential behavior and quality bar.

## Product Surface
List screens, controls, and user workflows.

## Technical Architecture
Describe framework, components, API routes, data model, provider integrations, state, and persistence.

## Implementation Plan
Give ordered implementation steps.

## Verification Plan
List concrete tests and manual checks.

## Copy-Paste Master Prompt
\`\`\`markdown
Write a polished, complete prompt that includes all of the above and tells an AI builder exactly what to create.
\`\`\``;
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
