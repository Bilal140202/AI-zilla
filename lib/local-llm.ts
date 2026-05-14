"use client";

export const DEFAULT_LOCAL_MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

type Engine = {
  chat: {
    completions: {
      create(args: {
        messages: Array<{ role: "system" | "user"; content: string }>;
        temperature: number;
        stream: true;
        stream_options?: { include_usage?: boolean };
      }): Promise<
        AsyncIterable<{
          choices?: Array<{
            delta?: { content?: string | null };
          }>;
        }>
      >;
    };
  };
};

let enginePromise: Promise<Engine> | null = null;
let loadedModel = "";

export type LocalLlmStatus = {
  text: string;
  progress?: number;
  ready: boolean;
};

function buildLocalSystemPrompt() {
  return `You are AI-zilla's free local browser model.

Transform the user's rough request into an extreme, production-grade build prompt that can be handed directly to a coding LLM.

Hard requirements:
- Do not output generic advice.
- Do not use placeholders like TODO, TBD, your app name, or insert API here.
- Infer a practical product scope from the user's request.
- Include concrete app architecture, screens, data flow, API routes, state, edge cases, and verification steps.
- Keep the result readable as Markdown.

Output format exactly:
# AI-zilla Build Command

## Project Intent
## Non-Negotiable Requirements
## Product Surface
## Technical Architecture
## Implementation Plan
## Verification Plan
## Copy-Paste Master Prompt
\`\`\`markdown
Write a complete prompt that tells an AI builder exactly what to create.
\`\`\``;
}

export function preloadLocalLlm(
  onStatus: (status: LocalLlmStatus) => void,
  model = DEFAULT_LOCAL_MODEL
) {
  if (typeof window === "undefined") {
    return null;
  }

  if (!("gpu" in navigator)) {
    onStatus({
      text: "WebGPU unavailable",
      ready: false
    });
    return null;
  }

  if (enginePromise && loadedModel === model) {
    return enginePromise;
  }

  loadedModel = model;
  enginePromise = import("@mlc-ai/web-llm").then((webllm) =>
    webllm.CreateMLCEngine(model, {
      initProgressCallback(progress) {
        onStatus({
          text: progress.text || "Downloading local model",
          progress: progress.progress,
          ready: false
        });
      }
    }) as Promise<Engine>
  );

  enginePromise
    .then(() => {
      onStatus({
        text: "Local AI ready",
        progress: 1,
        ready: true
      });
    })
    .catch((error) => {
      onStatus({
        text: error instanceof Error ? error.message : "Local AI failed to load",
        ready: false
      });
      enginePromise = null;
    });

  return enginePromise;
}

export async function streamLocalLlm(
  command: string,
  onChunk: (chunk: string) => void,
  onStatus: (status: LocalLlmStatus) => void,
  model = DEFAULT_LOCAL_MODEL
) {
  const engine = await (preloadLocalLlm(onStatus, model) || Promise.reject(new Error("Local AI is unavailable.")));

  const streamed = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: buildLocalSystemPrompt()
      },
      {
        role: "user",
        content: command
      }
    ],
    temperature: 0.25,
    stream: true,
    stream_options: { include_usage: true }
  });

  let output = "";
  for await (const chunk of streamed) {
    const text = chunk.choices?.[0]?.delta?.content || "";
    if (text) {
      output += text;
      onChunk(text);
    }
  }

  return output;
}
