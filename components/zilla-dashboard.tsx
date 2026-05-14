"use client";

import { DEFAULT_LOCAL_MODEL, preloadLocalLlm, streamLocalLlm, type LocalLlmStatus } from "@/lib/local-llm";
import { parseProviderTag } from "@/lib/zilla";
import { useZillaStore } from "@/store/zilla-store";
import {
  Bot,
  Braces,
  CheckCircle2,
  Copy,
  Image,
  KeyRound,
  Loader2,
  Play,
  Settings,
  Sparkles,
  Workflow
} from "lucide-react";
import type { ComponentType } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "agents" | "prompts" | "workflows" | "settings";

type ImageResponse = {
  type?: "image";
  prompt?: string;
  imageUrl?: string;
  error?: string;
};

const navItems: Array<{ id: View; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "agents", label: "Agents", icon: Bot },
  { id: "prompts", label: "Prompt Library", icon: Braces },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "settings", label: "Settings", icon: Settings }
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
  const [activeView, setActiveView] = useState<View>("agents");
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
