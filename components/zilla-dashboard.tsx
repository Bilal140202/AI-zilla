"use client";

import { DEFAULT_LOCAL_MODEL, preloadLocalLlm, streamLocalLlm, type LocalLlmStatus } from "@/lib/local-llm";
import { parseProviderTag } from "@/lib/zilla";
import { useZillaStore } from "@/store/zilla-store";
import {
  Activity,
  Bot,
  Braces,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  GitCompare,
  Home,
  Image,
  KeyRound,
  Loader2,
  Play,
  Quote,
  Rocket,
  Settings,
  Sparkles,
  Workflow
} from "lucide-react";
import type { ComponentType } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "home" | "agents" | "prompts" | "workflows" | "settings";

type ImageResponse = {
  type?: "image";
  prompt?: string;
  imageUrl?: string;
  error?: string;
};

const navItems: Array<{ id: View; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "prompts", label: "Prompt Library", icon: Braces },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "settings", label: "Settings", icon: Settings }
];

const reviewTrain = [
  "The prompt came out cleaner than our sprint brief.",
  "AI-zilla turned a rough idea into an executable spec.",
  "No more one-line prompts that waste model credits.",
  "The code block output dropped straight into our builder.",
  "Local mode is enough for first drafts when keys are not ready."
];

const commandLines = [
  "> boot ai-zilla --local",
  "local model: warming cache",
  "prompt kernel: extreme build mode",
  "output: markdown + copy-paste master prompt",
  "status: ready for builders"
];

async function readTextStream(response: Response, onChunk: (chunk: string) => void) {
  if (!response.ok) {
    const failureText = await response.text();
    try {
      const json = JSON.parse(failureText) as { error?: string };
      throw new Error(json.error || "Command failed.");
    } catch {
      throw new Error(failureText || "Command failed.");
    }
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<ImageResponse>;
  }

  if (!response.body) {
    throw new Error("Provider did not return a readable stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      output += chunk;
      onChunk(chunk);
    }
  }

  return { type: undefined, prompt: undefined, imageUrl: undefined, text: output };
}

export function ZillaDashboard() {
  const { agents, prompts, recent, remember } = useZillaStore();
  const [activeView, setActiveView] = useState<View>("home");
  const [command, setCommand] = useState(prompts[0]);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState("openai/gpt-4.1-mini");
  const [pollinationsKey, setPollinationsKey] = useState("");
  const [localModel, setLocalModel] = useState(DEFAULT_LOCAL_MODEL);
  const [localStatus, setLocalStatus] = useState<LocalLlmStatus>({
    text: "Preparing local AI",
    ready: false
  });
  const [output, setOutput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    preloadLocalLlm(setLocalStatus, localModel);
  }, [localModel]);

  const activeTag = useMemo(() => parseProviderTag(command), [command]);

  const runCommand = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setRunning(true);
    setError("");
    setOutput("");
    setImageUrl("");

    try {
      if (activeTag === "local") {
        await streamLocalLlm(
          command.replace(/@(local|webllm)\b/gi, "").trim(),
          (chunk) => setOutput((current) => current + chunk),
          setLocalStatus,
          localModel
        );
        remember(command);
        return;
      }

      const response = await fetch("/api/zilla-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command,
          openRouterKey: openRouterKey.trim(),
          openRouterModel: openRouterModel.trim(),
          pollinationsKey: pollinationsKey.trim()
        })
      });

      const result = await readTextStream(response, (chunk) => {
        setOutput((current) => current + chunk);
      });

      if ("imageUrl" in result && result.imageUrl) {
        setImageUrl(result.imageUrl);
        setOutput(`Prompt: ${result.prompt || command}`);
      }

      remember(command);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Command failed.");
    } finally {
      setRunning(false);
    }
  };

  const choosePrompt = (prompt: string) => {
    setCommand(prompt);
    setActiveView("agents");
  };

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-[var(--line)] bg-[#0d1012] p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded border border-[var(--acid)] bg-[rgba(57,255,20,0.12)]">
              <Sparkles className="h-5 w-5 text-[var(--acid)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">AI-zilla</h1>
              <p className="text-xs text-[var(--muted)]">Agent command deck</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  className={`flex items-center gap-3 rounded px-3 py-2 text-left ${
                    active
                      ? "border border-[var(--line)] bg-[var(--panel)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-white"
                  }`}
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  type="button"
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[var(--acid)]" : ""}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <section className="mt-8 rounded border border-[var(--line)] bg-black p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              {localStatus.ready ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--acid)]" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--amber)]" />
              )}
              <span>{localStatus.text}</span>
            </div>
            {typeof localStatus.progress === "number" ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#20262a]">
                <div
                  className="h-full bg-[var(--acid)] transition-all"
                  style={{ width: `${Math.max(4, Math.round(localStatus.progress * 100))}%` }}
                />
              </div>
            ) : null}
          </section>
        </aside>

        <section className="grid gap-5 p-5 lg:grid-rows-[auto_auto_1fr]">
          {activeView === "home" ? (
            <section className="grid gap-5">
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="relative overflow-hidden rounded border border-[var(--line)] bg-black p-5">
                  <div className="absolute inset-x-0 top-0 h-px bg-[var(--acid)] opacity-70" />
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--acid)]" />
                    <span className="ml-2">ai-zilla/home.cmd</span>
                  </div>
                  <h2 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                    Turn rough app ideas into build commands.
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
                    AI-zilla converts basic prompts into complete app-building instructions with architecture, screens,
                    API routes, edge cases, verification, and a copy-paste markdown master prompt.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded bg-[var(--acid)] px-4 py-3 text-sm font-semibold text-black"
                      onClick={() => setActiveView("agents")}
                      type="button"
                    >
                      <Rocket className="h-4 w-4" />
                      Open Command Deck
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-4 py-3 text-sm text-white hover:border-[var(--acid)]"
                      onClick={() => setCommand("@local build a launch-ready SaaS dashboard for customer support insights")}
                      type="button"
                    >
                      <Code2 className="h-4 w-4" />
                      Load Example
                    </button>
                  </div>
                </div>

                <div className="rounded border border-[var(--line)] bg-[#050606] p-5 font-mono text-sm">
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                    <span className="text-[var(--acid)]">LIVE BOOT</span>
                    <span className="text-[var(--muted)]">{localStatus.ready ? "LOCAL READY" : "LOADING"}</span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {commandLines.map((line, index) => (
                      <div className="flex gap-3" key={line}>
                        <span className="text-[var(--muted)]">0{index + 1}</span>
                        <span className={index === 0 ? "text-[var(--acid)]" : "text-[#d7f7d2]"}>{line}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded border border-[rgba(57,255,20,0.28)] bg-[rgba(57,255,20,0.06)] p-3">
                    <div className="flex items-center gap-2 text-[var(--acid)]">
                      <Cpu className="h-4 w-4" />
                      <span>{localStatus.text}</span>
                    </div>
                    {typeof localStatus.progress === "number" ? (
                      <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#20262a]">
                        <div
                          className="h-full bg-[var(--acid)] transition-all"
                          style={{ width: `${Math.max(4, Math.round(localStatus.progress * 100))}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded border border-[var(--line)] bg-[var(--panel)] p-4">
                  <Activity className="h-5 w-5 text-[var(--acid)]" />
                  <h3 className="mt-3 font-semibold">Why It Exists</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Basic prompts leave model builders guessing. AI-zilla adds the missing context a coding agent needs
                    to produce a real app instead of a vague prototype.
                  </p>
                </div>
                <div className="rounded border border-[var(--line)] bg-[var(--panel)] p-4">
                  <GitCompare className="h-5 w-5 text-[var(--amber)]" />
                  <h3 className="mt-3 font-semibold">Basic vs Complete</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    A basic prompt says what to build. A complete AI-zilla command specifies behavior, UX, architecture,
                    provider flow, state, failures, tests, and the final copy block.
                  </p>
                </div>
                <div className="rounded border border-[var(--line)] bg-[var(--panel)] p-4">
                  <Quote className="h-5 w-5 text-[#a3e635]" />
                  <h3 className="mt-3 font-semibold">Builder Ready</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Outputs are shaped for direct reuse in coding LLMs, with a dedicated markdown code block for the
                    final master prompt.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded border border-[var(--line)] bg-black py-3">
                <div className="review-track flex gap-8 whitespace-nowrap text-sm text-[#d7f7d2]">
                  {[...reviewTrain, ...reviewTrain].map((review, index) => (
                    <span className="inline-flex items-center gap-2" key={`${review}-${index}`}>
                      <span className="text-[var(--acid)]">review:</span>
                      {review}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {activeView === "agents" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {agents.map((agent) => (
                <button
                  className="panel rounded p-4 text-left transition hover:border-[var(--acid)]"
                  key={agent.id}
                  onClick={() => setCommand(`${agent.tag} ${command.replace(/@\S+\s*/g, "")}`.trim())}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{agent.label}</h2>
                      <p className="mt-1 text-xs text-[var(--muted)]">{agent.description}</p>
                    </div>
                    <span className="chip rounded px-2 py-1 text-xs">{agent.tag}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
                    {agent.status === "Image" ? <Image className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                    {agent.id === "local" ? (localStatus.ready ? "Ready" : "Loading") : agent.status}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {activeView === "prompts" ? (
            <section className="panel rounded p-4">
              <h2 className="font-semibold">Prompt Library</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {prompts.map((prompt) => (
                  <button
                    className="rounded border border-[var(--line)] bg-black p-3 text-left text-sm text-[#d7f7d2] hover:border-[var(--acid)]"
                    key={prompt}
                    onClick={() => choosePrompt(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === "workflows" ? (
            <section className="panel rounded p-4">
              <h2 className="font-semibold">Workflow Builder</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {["@local master prompt", "@openrouter refine", "@pollinations-img asset"].map((item, index) => (
                  <button
                    className="flex items-center gap-3 rounded border border-[var(--line)] bg-black p-3 text-sm hover:border-[var(--acid)]"
                    key={item}
                    onClick={() => setCommand(`${item} ${command.replace(/@\S+\s*/g, "")}`.trim())}
                    type="button"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded bg-[rgba(57,255,20,0.12)] text-xs text-[var(--acid)]">
                      {index + 1}
                    </span>
                    {item}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === "settings" ? (
            <section className="panel rounded p-4">
              <h2 className="font-semibold">Settings</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  Local WebLLM model
                  <input
                    className="rounded border border-[var(--line)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--acid)]"
                    onChange={(event) => setLocalModel(event.target.value)}
                    value={localModel}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  OpenRouter key
                  <input
                    className="rounded border border-[var(--line)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--acid)]"
                    onChange={(event) => setOpenRouterKey(event.target.value)}
                    placeholder="sk-or-v1-..."
                    type="password"
                    value={openRouterKey}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  OpenRouter model
                  <input
                    className="rounded border border-[var(--line)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--acid)]"
                    onChange={(event) => setOpenRouterModel(event.target.value)}
                    value={openRouterModel}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  Pollinations key
                  <input
                    className="rounded border border-[var(--line)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--acid)]"
                    onChange={(event) => setPollinationsKey(event.target.value)}
                    placeholder="optional image key"
                    type="password"
                    value={pollinationsKey}
                  />
                </label>
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <form className="panel rounded p-4" onSubmit={runCommand}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Zilla Arena</h2>
                  <p className="text-xs text-[var(--muted)]">
                    Active: {activeTag === "local" ? "free local WebLLM" : activeTag}
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded bg-[var(--acid)] px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  disabled={running || (activeTag === "local" && !localStatus.ready)}
                  type="submit"
                >
                  <Play className="h-4 w-4" />
                  {running ? "Running" : "Run"}
                </button>
              </div>
              <textarea
                className="min-h-40 w-full resize-y rounded border border-[var(--line)] bg-black p-3 text-sm text-white outline-none focus:border-[var(--acid)]"
                onChange={(event) => setCommand(event.target.value)}
                value={command}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {prompts.map((prompt) => (
                  <button
                    className="rounded border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] hover:border-[var(--acid)] hover:text-white"
                    key={prompt}
                    onClick={() => setCommand(prompt)}
                    type="button"
                  >
                    {prompt.split(" ").slice(0, 5).join(" ")}
                  </button>
                ))}
              </div>
            </form>

            <section className="panel rounded p-4">
              <h2 className="font-semibold">Recent Runs</h2>
              <div className="mt-4 grid gap-2">
                {recent.length ? (
                  recent.map((item) => (
                    <button
                      className="rounded border border-[var(--line)] p-3 text-left text-xs text-[var(--muted)] hover:border-[var(--acid)] hover:text-white"
                      key={item}
                      onClick={() => setCommand(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">No recent runs yet.</p>
                )}
              </div>
            </section>
          </div>

          <section className="panel terminal-scroll min-h-[420px] overflow-auto rounded p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Output</h2>
              <button
                className="rounded border border-[var(--line)] p-2 text-[var(--muted)] hover:text-white disabled:opacity-50"
                disabled={!output}
                onClick={() => navigator.clipboard.writeText(output)}
                type="button"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {error ? <pre className="whitespace-pre-wrap text-sm text-[var(--danger)]">{error}</pre> : null}
            {output ? <pre className="whitespace-pre-wrap text-sm leading-6 text-[#d7f7d2]">{output}</pre> : null}
            {!output && !error ? <p className="text-sm text-[var(--muted)]">Run a tagged command to stream results here.</p> : null}
            {imageUrl ? (
              <div className="mt-4 overflow-hidden rounded border border-[var(--line)]">
                <img alt="Generated Pollinations asset" className="w-full" src={imageUrl} />
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
