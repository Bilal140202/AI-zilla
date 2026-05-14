"use client";

export const DEFAULT_LOCAL_MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
export const DEFAULT_CPU_MODEL = "Xenova/LaMini-Flan-T5-77M";

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
let cpuPipelinePromise: Promise<{
  (input: string, options: { max_new_tokens: number; temperature: number }): Promise<Array<{ generated_text?: string }> | { generated_text?: string }>;
}> | null = null;

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

function buildCpuPrompt(command: string) {
  return `${buildLocalSystemPrompt()}

User request:
${command}

Write the final answer now.`;
}

export function preloadLocalLlm(
  onStatus: (status: LocalLlmStatus) => void,
  model = DEFAULT_LOCAL_MODEL
) {
  if (typeof window === "undefined") {
    return null;
  }

  const gpu = (navigator as Navigator & {
    gpu?: {
      requestAdapter?: () => Promise<unknown>;
    };
  }).gpu;

  if (!gpu) {
    preloadCpuLlm(onStatus);
    return null;
  }

  if (typeof gpu.requestAdapter !== "function") {
    preloadCpuLlm(onStatus);
    return null;
  }

  void gpu.requestAdapter().then((adapter) => {
    if (!adapter) {
      preloadCpuLlm(onStatus);
    }
  });

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
        text: error instanceof Error ? `${error.message}; loading CPU fallback` : "WebGPU failed; loading CPU fallback",
        ready: false
      });
      preloadCpuLlm(onStatus);
      enginePromise = null;
    });

  return enginePromise;
}

export function preloadCpuLlm(onStatus: (status: LocalLlmStatus) => void) {
  if (cpuPipelinePromise) {
    return cpuPipelinePromise;
  }

  onStatus({
    text: "Loading CPU/WASM local model",
    ready: false
  });

  cpuPipelinePromise = import("@huggingface/transformers")
    .then(async (transformers) => {
      const module = transformers as unknown as {
        env?: { allowLocalModels?: boolean };
        pipeline: (
          task: "text2text-generation",
          model: string,
          options?: { progress_callback?: (progress: { status?: string; progress?: number; file?: string }) => void }
        ) => Promise<{
          (input: string, options: {
            max_new_tokens: number;
            temperature: number;
          }): Promise<Array<{ generated_text?: string }> | { generated_text?: string }>;
        }>;
      };

      if (module.env) {
        module.env.allowLocalModels = false;
      }

      return module.pipeline("text2text-generation", DEFAULT_CPU_MODEL, {
        progress_callback(progress) {
          onStatus({
            text: progress.file ? `Downloading ${progress.file}` : progress.status || "Loading CPU model",
            progress: typeof progress.progress === "number" ? progress.progress / 100 : undefined,
            ready: false
          });
        }
      });
    })
    .then((pipeline) => {
      onStatus({
        text: "CPU local AI ready",
        progress: 1,
        ready: true
      });
      return pipeline;
    })
    .catch((error) => {
      onStatus({
        text: error instanceof Error ? error.message : "CPU local AI failed to load",
        ready: false
      });
      cpuPipelinePromise = null;
      throw error;
    });

  return cpuPipelinePromise;
}

export async function streamLocalLlm(
  command: string,
  onChunk: (chunk: string) => void,
  onStatus: (status: LocalLlmStatus) => void,
  model = DEFAULT_LOCAL_MODEL
) {
  const maybeEngine = preloadLocalLlm(onStatus, model);

  if (!maybeEngine) {
    const pipeline = await preloadCpuLlm(onStatus);
    onStatus({ text: "Running CPU local inference", ready: true, progress: 1 });
    const result = await pipeline(buildCpuPrompt(command), {
      max_new_tokens: 1024,
      temperature: 0.25
    });
    const first = Array.isArray(result) ? result[0] : result;
    const output = first.generated_text?.trim();
    if (!output) {
      throw new Error("CPU local model did not return text.");
    }
    onChunk(output);
    return output;
  }

  const engine = await maybeEngine.catch(async () => {
    const pipeline = await preloadCpuLlm(onStatus);
    onStatus({ text: "Running CPU local inference", ready: true, progress: 1 });
    const result = await pipeline(buildCpuPrompt(command), {
      max_new_tokens: 1024,
      temperature: 0.25
    });
    const first = Array.isArray(result) ? result[0] : result;
    const output = first.generated_text?.trim();
    if (!output) {
      throw new Error("CPU local model did not return text.");
    }
    onChunk(output);
    return null;
  });

  if (!engine) {
    return "";
  }

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
